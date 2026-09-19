import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleName } from "../../common/enums/role-name.enum";
import { AppException } from "../../common/exceptions/app.exception";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { CaseBillingMode, CaseStatus, CaseStepStatus, CaseStepType, Prisma } from "../../generated/prisma/client";
import { InvoiceItemSourceType, InvoiceSourceType, InvoiceStatus } from "../../generated/prisma/enums";
import { PrismaService } from "../../prisma/prisma.service";
import { IssueJournalInvoicesDto } from "../invoice/dto/issue-journal-invoices.dto";
import { InvoiceService } from "../invoice/invoice.service";
import { generateOperationContractDocx, OperationContractRow } from "../operations/generators/operation-contract-docx";
import { AddCaseStepDto, CreateCaseDto, UpdateCaseStepDto } from "./cases.dto";
import { CasesRepository, STEP_INCLUDE } from "./cases.repository";

@Injectable()
export class CasesService {
  constructor(
    private readonly repo: CasesRepository,
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
  ) {}

  findByPatientId(patientId: string, user: JwtPayload) {
    return this.repo.findByPatientId(patientId, user.userId, user.role === RoleName.DOCTOR);
  }

  /**
   * "To'lov jurnali" sahifasi uchun — klinika bo'yicha (bemordan qat'iy
   * nazar) filtrga mos case'lar ro'yxati, har biriga tegishli Master
   * Invoice (bo'lsa) bilan birga. Invoice PatientCase bilan haqiqiy FK
   * orqali bog'lanmagani uchun (faqat sourceType+sourceId) ikkinchi
   * so'rov bilan qo'lda birlashtiriladi.
   */
  async findAll(filters: { billingMode?: CaseBillingMode; status?: CaseStatus }) {
    const cases = await this.repo.findAll(filters);
    if (cases.length === 0) return [];

    const invoices = await this.invoiceService.getJournals(cases.map(c => c.id));
    const invoiceByCaseId = new Map(invoices.map((inv) => [inv.sourceId, inv]));

    return cases.map((c) => ({ ...c, invoice: invoiceByCaseId.get(c.id) ?? null }));
  }

  async findById(id: string, user: JwtPayload) {
    const c = await this.repo.findById(id, user.userId, user.role === RoleName.DOCTOR);
    if (!c) throw new NotFoundException("Case not found");
    return c;
  }

  async create(dto: CreateCaseDto, user: JwtPayload) {
    const created = await this.repo.create(dto.patientId, dto.chiefComplaint);
    if (dto.billingMode === "MASTER") {
      await this.convertToMaster(created!.id, user);
      return this.repo.findById(created!.id, user.userId, user.role === RoleName.DOCTOR);
    }
    return created;
  }

  async addStep(caseId: string, dto: AddCaseStepDto, user: JwtPayload) {
    const patientCase = await this.repo.findById(caseId, user.userId, user.role === RoleName.DOCTOR);

    if (!patientCase) throw new NotFoundException("Case not found");

    // Hamshira faqat ukol/protsedura ("ukol qildim") qo'sha oladi — boshqa
    // qadam turlari (konsultatsiya, lab, chiqish va h.k.) uchun ruxsati yo'q.
    if (user.role === RoleName.HAMSHIRA && dto.type !== CaseStepType.PROCEDURE) {
      throw new AppException("Hamshira faqat protsedura (ukol) qo'sha oladi", 403);
    }

    if (dto.type === CaseStepType.CONSULTATION) {
      if (!dto.assignmentId) throw new AppException("assignmentId required for CONSULTATION", 400);

      const assignment = await this.prisma.assignment.findUnique({
        where: { id: dto.assignmentId },
        include: { department: true },
      });

      if (!assignment) throw new AppException("Assignment not found", 404);

      const appointment = await this.prisma.appointment.create({
        data: {
          dateTime: dto.dateTime ? new Date(dto.dateTime) : new Date(),
          patient: { connect: { id: patientCase.patientId } },
          assignment: { connect: { id: dto.assignmentId! } },
        },
      });

      const price = new Prisma.Decimal(dto.amount ?? assignment.department.price ?? 0);

      const billedToMaster = await this.invoiceService.billCaseService(this.prisma, {
        caseId,
        patientId: patientCase.patientId,
        createdById: user.userId,
        items: [
          {
            description: `${assignment.department.name} konsultatsiya`,
            quantity: 1,
            unitPrice: price,
            sourceType: InvoiceItemSourceType.APPOINTMENT,
            sourceId: appointment.id,
          },
        ],
      });

      if (!billedToMaster) {
        await this.prisma.invoice.create({
          data: {
            patientId: patientCase.patientId,
            sourceType: InvoiceSourceType.APPOINTMENT,
            sourceId: appointment.id,
            totalAmount: price,
            status: InvoiceStatus.ISSUED,
            createdById: user.userId,
            items: {
              create: [
                {
                  description: `${assignment.department.name} konsultatsiya`,
                  quantity: 1,
                  unitPrice: price,
                  totalPrice: price,
                  sourceType: InvoiceItemSourceType.APPOINTMENT,
                  sourceId: appointment.id,
                },
              ],
            },
          },
        });
      }

      return this.repo.createStep(caseId, {
        type: CaseStepType.CONSULTATION,
        status: CaseStepStatus.IN_PROGRESS,
        assignmentId: dto.assignmentId,
        appointmentId: appointment.id,
        note: dto.note,
      });
    }

    if (dto.type === CaseStepType.LAB) {
      if (!dto.serviceIds?.length) throw new AppException("serviceIds required for LAB step", 400);

      // Load all services first and group them by their laboratoryId. This allows
      // creating one LabOrder per laboratory (instead of one per service).
      const services = await this.prisma.laboratoryService.findMany({ where: { id: { in: dto.serviceIds } } });
      if (services.length !== dto.serviceIds.length) {
        throw new AppException("One or more services not found", 404);
      }

      // If a single laboratoryId was explicitly provided, ensure all services
      // belong to it (backwards-compatible behaviour).
      if (dto.laboratoryId) {
        if (services.some((s) => s.laboratoryId !== dto.laboratoryId)) {
          throw new AppException("One or more services not belonging to the specified laboratory", 404);
        }
      }

      const groups = services.reduce((m, s) => {
        const key = s.laboratoryId;
        if (!m.has(key)) m.set(key, [] as typeof services);
        m.get(key)!.push(s);
        return m;
      }, new Map<string, typeof services>());

      // deferLabInvoice=true bo'lsa, invois hozircha yaratilmaydi — xizmatlar
      // "invoiced: false" deb belgilanadi va labarant keyinroq LabOrdersService
      // .createOrderInvoice orqali narxni belgilab, invoisni o'zi yaratadi.
      const deferInvoice = dto.deferLabInvoice === true;

      return this.prisma.$transaction(async (tx) => {
        const step = await tx.caseStep.create({
          data: {
            caseId,
            type: CaseStepType.LAB,
            status: CaseStepStatus.PENDING,
            ...(dto.note ? { note: dto.note } : {}),
          },
        });

        const allInvoiceItems: {
          description: string;
          quantity: number;
          unitPrice: Prisma.Decimal;
          totalPrice: Prisma.Decimal;
          sourceType: InvoiceItemSourceType;
          sourceId?: string;
        }[] = [];

        for (const [labId, svcs] of groups.entries()) {
          const labOrder = await tx.labOrder.create({
            data: {
              caseStep: { connect: { id: step.id } },
              patient: { connect: { id: patientCase.patientId } },
              laboratory: { connect: { id: labId } },
            },
          });

          for (const svc of svcs) {
            await tx.labOrderItem.create({
              data: {
                labOrder: { connect: { id: labOrder.id } },
                service: { connect: { id: svc.id } },
                invoiced: !deferInvoice,
              },
            });
          }

          for (const svc of svcs) {
            const unitPrice = new Prisma.Decimal(svc.price ?? 0);
            allInvoiceItems.push({
              description: svc.name,
              quantity: 1,
              unitPrice,
              totalPrice: unitPrice,
              sourceType: InvoiceItemSourceType.LAB_SERVICE,
              sourceId: svc.id,
            });
          }
        }

        if (!deferInvoice) {
          const nominalTotal = allInvoiceItems.reduce((sum, item) => sum.add(item.unitPrice), new Prisma.Decimal(0));
          const finalTotal = dto.labTotalPrice != null ? new Prisma.Decimal(dto.labTotalPrice) : nominalTotal;

          // Yuboruvchi umumiy summani o'zgartirgan bo'lsa (masalan chegirma
          // uchun), farq alohida qator sifatida qo'shiladi — shunda har bir
          // xizmat o'z nominal narxida ko'rinib turadi (qarang: lab-orders
          // moduli addItems'dagi bir xil naqsh).
          const diff = finalTotal.sub(nominalTotal);
          if (!diff.isZero()) {
            allInvoiceItems.push({
              description: diff.isNegative() ? "Chegirma" : "Qo'shimcha to'lov",
              quantity: 1,
              unitPrice: diff,
              totalPrice: diff,
              sourceType: InvoiceItemSourceType.MANUAL,
            });
          }

          const billedToMaster = await this.invoiceService.billCaseService(tx, {
            caseId,
            patientId: patientCase.patientId,
            createdById: user.userId,
            items: allInvoiceItems,
          });

          if (!billedToMaster) {
            await tx.invoice.create({
              data: {
                patientId: patientCase.patientId,
                sourceType: InvoiceSourceType.LAB_ORDER,
                sourceId: step.id,
                totalAmount: finalTotal,
                status: InvoiceStatus.ISSUED,
                createdById: user.userId,
                items: { create: allInvoiceItems },
              },
            });
          }
        }

        return tx.caseStep.findUnique({ where: { id: step.id }, include: STEP_INCLUDE });
      });
    }

    if (dto.type === CaseStepType.DIAGNOSTIC) {
      if (!dto.diagnosticsId) throw new AppException("diagnosticsId required for DIAGNOSTIC step", 400);
      if (!dto.diagnosticServiceIds?.length) throw new AppException("diagnosticServiceIds required for DIAGNOSTIC step", 400);

      const services = await this.prisma.diagnosticService.findMany({
        where: { id: { in: dto.diagnosticServiceIds }, diagnosticsId: dto.diagnosticsId },
      });
      if (services.length !== dto.diagnosticServiceIds.length) {
        throw new AppException("One or more services not found or not belonging to this diagnostics center", 404);
      }

      return this.prisma.$transaction(async (tx) => {
        const step = await tx.caseStep.create({
          data: {
            caseId,
            type: CaseStepType.DIAGNOSTIC,
            status: CaseStepStatus.PENDING,
            ...(dto.note ? { note: dto.note } : {}),
          },
        });

        const diagnosticOrder = await tx.diagnosticOrder.create({
          data: {
            caseStep: { connect: { id: step.id } },
            patient: { connect: { id: patientCase.patientId } },
            diagnostics: { connect: { id: dto.diagnosticsId! } },
          },
        });

        for (const svc of services) {
          await tx.diagnosticOrderItem.create({
            data: {
              diagnosticOrder: { connect: { id: diagnosticOrder.id } },
              service: { connect: { id: svc.id } },
            },
          });
        }

        const invoiceItems = services.map((svc) => {
          const unitPrice = new Prisma.Decimal(svc.price ?? 0);
          return {
            description: svc.name,
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
            sourceType: InvoiceItemSourceType.DIAGNOSTIC_SERVICE,
            sourceId: svc.id,
          };
        });
        const totalAmount = invoiceItems.reduce((sum, item) => sum.add(item.unitPrice), new Prisma.Decimal(0));

        const billedToMaster = await this.invoiceService.billCaseService(tx, {
          caseId,
          patientId: patientCase.patientId,
          createdById: user.userId,
          items: invoiceItems,
        });

        if (!billedToMaster) {
          await tx.invoice.create({
            data: {
              patientId: patientCase.patientId,
              sourceType: InvoiceSourceType.DIAGNOSTIC_ORDER,
              sourceId: diagnosticOrder.id,
              totalAmount,
              status: InvoiceStatus.ISSUED,
              createdById: user.userId,
              items: { create: invoiceItems },
            },
          });
        }

        return tx.caseStep.findUnique({ where: { id: step.id }, include: STEP_INCLUDE });
      });
    }

    if (dto.type === CaseStepType.PROCEDURE) {
      if (!dto.procedureId) throw new AppException("procedureId required for PROCEDURE step", 400);

      const procedure = await this.prisma.procedure.findUnique({
        where: { id: dto.procedureId },
      });
      if (!procedure) throw new AppException("Procedure not found", 404);

      return this.prisma.$transaction(async (tx) => {
        const step = await tx.caseStep.create({
          data: {
            caseId,
            type: CaseStepType.PROCEDURE,
            status: CaseStepStatus.PENDING,
            assignmentId: dto.assignmentId,
            ...(dto.note ? { note: dto.note } : {}),
          },
        });

        const priceNum = dto.amount !== undefined && dto.amount !== null ? dto.amount : Number(procedure.price || 0);
        const price = new Prisma.Decimal(priceNum);
        let doctorId = user.userId;
        if (dto.assignmentId) {
          const assignment = await tx.assignment.findUnique({ where: { id: dto.assignmentId } });
          if (assignment) doctorId = assignment.userId;
        }

        const procedureOrder = await tx.procedureOrder.create({
          data: {
            caseStep: { connect: { id: step.id } },
            patient: { connect: { id: patientCase.patientId } },
            procedure: { connect: { id: procedure.id } },
            doctor: { connect: { id: doctorId } },
            price: price,
          },
        });

        const billedToMaster = await this.invoiceService.billCaseService(tx, {
          caseId,
          patientId: patientCase.patientId,
          createdById: user.userId,
          items: [
            {
              description: procedure.name,
              quantity: 1,
              unitPrice: price,
              sourceType: InvoiceItemSourceType.PROCEDURE_SERVICE,
              sourceId: procedure.id,
            },
          ],
        });

        if (!billedToMaster) {
          await tx.invoice.create({
            data: {
              patientId: patientCase.patientId,
              sourceType: InvoiceSourceType.PROCEDURE_ORDER,
              sourceId: procedureOrder.id,
              totalAmount: price,
              status: InvoiceStatus.ISSUED,
              createdById: user.userId,
              items: {
                create: [
                  {
                    description: procedure.name,
                    quantity: 1,
                    unitPrice: price,
                    totalPrice: price,
                    sourceType: InvoiceItemSourceType.PROCEDURE_SERVICE,
                    sourceId: procedure.id,
                  },
                ],
              },
            },
          });
        }

        return tx.caseStep.findUnique({ where: { id: step.id }, include: STEP_INCLUDE });
      });
    }

    if (dto.type === CaseStepType.DISCHARGE) {
      await this.repo.closeCase(caseId, "COMPLETED");
      return this.repo.createStep(caseId, {
        type: CaseStepType.DISCHARGE,
        status: CaseStepStatus.DONE,
        completedAt: new Date(),
        note: dto.note,
      });
    }

    return this.repo.createStep(caseId, {
      type: dto.type,
      assignmentId: dto.assignmentId,
      note: dto.note,
    });
  }

  /**
   * Case'ni Master Invoice rejimiga o'tkazadi — bir yo'nalishli harakat
   * (orqaga qaytarish endpointi yo'q, ataylab). Bo'sh DRAFT Master Invoice
   * ochadi; keyingi barcha xizmatlar (billCaseService orqali) shunga
   * qo'shiladi. Moliyaviy oqibati katta harakat bo'lgani uchun audit log
   * majburiy.
   */
  async convertToMaster(caseId: string, user: JwtPayload) {
    const patientCase = await this.prisma.patientCase.findUnique({ where: { id: caseId } });
    if (!patientCase) throw new NotFoundException("Case not found");

    if (patientCase.billingMode === "MASTER") {
      throw new AppException("Bu case allaqachon Master hisob rejimida", 400);
    }
    if (patientCase.status !== "ACTIVE") {
      throw new AppException("Faqat faol (ACTIVE) case'ni Master rejimga o'tkazish mumkin", 400);
    }

    return this.prisma.$transaction(async (tx) => {
      const masterInvoice = await tx.invoice.create({
        data: {
          patientId: patientCase.patientId,
          sourceType: InvoiceSourceType.CASE,
          sourceId: caseId,
          isJournal: true,
          status: InvoiceStatus.DRAFT,
          totalAmount: new Prisma.Decimal(0),
          createdById: user.userId,
        },
      });

      const updatedCase = await tx.patientCase.update({
        where: { id: caseId },
        data: { billingMode: "MASTER" },
      });

      await tx.auditLog.create({
        data: {
          userId: user.userId,
          entity: "PatientCase",
          entityId: caseId,
          action: "CONVERT_TO_MASTER_INVOICE",
          oldValues: { billingMode: patientCase.billingMode },
          newValues: { billingMode: "MASTER", masterInvoiceId: masterInvoice.id },
        },
      });

      return { case: updatedCase, masterInvoice };
    });
  }

  async updateStep(caseId: string, stepId: string, dto: UpdateCaseStepDto, user: JwtPayload) {
    const patientCase = await this.repo.findById(caseId, user.userId, user.role === RoleName.DOCTOR);
    if (!patientCase) throw new NotFoundException("Case not found");

    const step = await this.repo.findStep(stepId);
    if (!step || step.caseId !== caseId) throw new NotFoundException("Step not found");

    const completedAt = dto.completedAt ? new Date(dto.completedAt) : dto.status === CaseStepStatus.DONE ? new Date() : undefined;

    return this.repo.updateStep(stepId, {
      status: dto.status,
      note: dto.note,
      completedAt,
    });
  }

  async closeCase(caseId: string, status: "COMPLETED" | "CANCELLED", user: JwtPayload) {
    const patientCase = await this.repo.findById(caseId, user.userId, user.role === RoleName.DOCTOR);
    if (!patientCase) throw new NotFoundException("Case not found");
    return this.repo.closeCase(caseId, status);
  }

  async getJournals(patientId: string, user: JwtPayload) {
    const cases = await this.findByPatientId(patientId, user);
    return this.invoiceService.getJournals(cases.map(c => c.id));
  }

  async issueJournalInvoices(caseId: string, dto: IssueJournalInvoicesDto, user: JwtPayload) {
    const patientCase = await this.findById(caseId, user);
    if (patientCase.status === CaseStatus.CANCELLED) throw new AppException('Bekor qilingan jurnaldan invois yaratib bo‘lmaydi', 400);
    return this.invoiceService.issueJournalInvoices(caseId, dto, user.userId);
  }

  async deleteStep(caseId: string, stepId: string, user: JwtPayload) {
    const patientCase = await this.repo.findById(caseId, user.userId, user.role === RoleName.DOCTOR);
    if (!patientCase) throw new NotFoundException("Case not found");

    const step = await this.repo.findStep(stepId);
    if (!step || step.caseId !== caseId) throw new NotFoundException("Step not found");

    if (step.type === "CHECKIN" || step.type === "DISCHARGE") {
      throw new AppException("Bu qadam o'chirib bo'lmaydi", 400);
    }

    return this.repo.deleteStep(stepId);
  }

  async deleteCase(caseId: string, user: JwtPayload) {
    const patientCase = await this.repo.findById(caseId, user.userId, user.role === RoleName.DOCTOR);
    if (!patientCase) throw new NotFoundException("Case not found");
    return this.repo.deleteCase(caseId);
  }

  /**
   * Case jurnalini (Master Invoice qatorlari) klinikaning mavjud "hisob
   * kitobi" shakliga solib, bosib chiqarish uchun DOCX hujjat yaratadi —
   * xuddi operatsiya shartnomasi generatoridan (generateOperationContractDocx)
   * foydalanadi, chunki ikkalasi ham bitta qog'oz shabloniga ("EUROMED
   * FAMILY" МЧЖ клиникаси hisob-kitobi) mos keladi. Case'ning o'ziga xos
   * shartnoma raqami yo'q — id'dan qisqa taqsimlangan havola sifatida
   * hosil qilinadi (operatsiyalardagi fallback bilan bir xil naqsh).
   */
  async generateJournalDocument(caseId: string) {
    const patientCase = await this.prisma.patientCase.findUnique({
      where: { id: caseId },
      include: { patient: true },
    });
    if (!patientCase) throw new NotFoundException("Case not found");

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        sourceType: InvoiceSourceType.CASE,
        sourceId: caseId,
        isJournal: true,
        status: { not: InvoiceStatus.CANCELLED },
      },
      include: { items: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    const rows: OperationContractRow[] = (invoice?.items ?? []).map((item) => ({
      name: item.description,
      unit: item.sourceType === InvoiceItemSourceType.WARD_DAILY ? "кун" : undefined,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    }));

    // Eng so'nggi yotoq yozuvidagi shifokorni "daволовчи shifokor" sifatida
    // ko'rsatishga urinamiz — topilmasa qog'ozda qo'lda to'ldirish uchun
    // bo'sh qoldiriladi.
    const ward = await this.prisma.wards.findFirst({
      where: { caseId },
      include: { doctor: true },
      orderBy: { checkIn: "desc" },
    });

    const now = new Date();
    const buffer = await generateOperationContractDocx({
      contractNumber: caseId.slice(0, 8).toUpperCase(),
      contractTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      startDate: patientCase.openedAt,
      endDate: patientCase.closedAt,
      patientFullName: `${patientCase.patient.first_name} ${patientCase.patient.last_name}`,
      patientBirthDate: patientCase.patient.birth_date,
      patientAddress: patientCase.patient.address,
      diagnosis: patientCase.chiefComplaint,
      doctorName: ward?.doctor ? `${ward.doctor.first_name} ${ward.doctor.last_name}` : undefined,
      rows,
      totalPrice: Number(invoice?.totalAmount ?? 0),
      minRowCount: Math.max(20, rows.length + 3),
    });

    return { buffer, patientCase };
  }
}
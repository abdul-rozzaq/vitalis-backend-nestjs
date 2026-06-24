import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleName } from "../../common/enums/role-name.enum";
import { AppException } from "../../common/exceptions/app.exception";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { CaseStepStatus, CaseStepType } from "../../generated/prisma/client";
import { InvoiceItemSourceType, InvoiceSourceType, InvoiceStatus } from "../../generated/prisma/enums";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AddCaseStepDto, CreateCaseDto, UpdateCaseStepDto } from "./cases.dto";
import { CasesRepository, STEP_INCLUDE } from "./cases.repository";

@Injectable()
export class CasesService {
  constructor(
    private readonly repo: CasesRepository,
    private readonly prisma: PrismaService,
  ) {}

  findByPatientId(patientId: string, user: JwtPayload) {
    return this.repo.findByPatientId(patientId, user.userId, user.role === RoleName.DOCTOR);
  }

  async findById(id: string, user: JwtPayload) {
    const c = await this.repo.findById(id, user.userId, user.role === RoleName.DOCTOR);
    if (!c) throw new NotFoundException("Case not found");
    return c;
  }

  async create(dto: CreateCaseDto) {
    return this.repo.create(dto.patientId, dto.chiefComplaint);
  }

  async addStep(caseId: string, dto: AddCaseStepDto, user: JwtPayload) {
    const patientCase = await this.repo.findById(caseId, user.userId, user.role === RoleName.DOCTOR);

    if (!patientCase) throw new NotFoundException("Case not found");

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

      return this.repo.createStep(caseId, {
        type: CaseStepType.CONSULTATION,
        status: CaseStepStatus.IN_PROGRESS,
        assignmentId: dto.assignmentId,
        appointmentId: appointment.id,
        note: dto.note,
      });
    }

    if (dto.type === CaseStepType.LAB) {
      if (!dto.laboratoryId) throw new AppException("laboratoryId required for LAB step", 400);
      if (!dto.serviceIds?.length) throw new AppException("serviceIds required for LAB step", 400);

      const services = await this.prisma.laboratoryService.findMany({
        where: { id: { in: dto.serviceIds }, laboratoryId: dto.laboratoryId },
      });
      if (services.length !== dto.serviceIds.length) {
        throw new AppException("One or more services not found or not belonging to this laboratory", 404);
      }

      return this.prisma.$transaction(async (tx) => {
        const step = await tx.caseStep.create({
          data: {
            caseId,
            type: CaseStepType.LAB,
            status: CaseStepStatus.PENDING,
            ...(dto.note ? { note: dto.note } : {}),
          },
        });

        const labOrder = await tx.labOrder.create({
          data: {
            caseStep: { connect: { id: step.id } },
            patient: { connect: { id: patientCase.patientId } },
            laboratory: { connect: { id: dto.laboratoryId! } },
          },
        });

        for (const svc of services) {
          await tx.labOrderItem.create({
            data: {
              labOrder: { connect: { id: labOrder.id } },
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
            sourceType: InvoiceItemSourceType.LAB_SERVICE,
            sourceId: svc.id,
          };
        });
        const totalAmount = invoiceItems.reduce((sum, item) => sum.add(item.unitPrice), new Prisma.Decimal(0));

        await tx.invoice.create({
          data: {
            patientId: patientCase.patientId,
            sourceType: InvoiceSourceType.LAB_ORDER,
            sourceId: labOrder.id,
            totalAmount,
            status: InvoiceStatus.ISSUED,
            createdById: user.userId,
            items: { create: invoiceItems },
          },
        });

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

        return tx.caseStep.findUnique({ where: { id: step.id }, include: STEP_INCLUDE });
      });
    }

    if (dto.type === CaseStepType.PROCEDURE) {
      const step = await this.repo.createStep(caseId, {
        type: CaseStepType.PROCEDURE,
        status: CaseStepStatus.PENDING,
        assignmentId: dto.assignmentId,
        note: dto.note,
      });

      let price = new Prisma.Decimal(0);
      let description = "Protsedura";
      
      if (dto.assignmentId) {
        const assignment = await this.prisma.assignment.findUnique({
          where: { id: dto.assignmentId },
          include: { department: true },
        });
        if (assignment) {
          price = new Prisma.Decimal(dto.amount ?? assignment.department.price ?? 0);
          description = `${assignment.department.name} protsedura`;
        }
      }
      // Agar doctor narxni o'zgartirib (dto.amount) yuborgan bo'lsa, o'sha narx ustun bo'ladi.
      if (dto.amount !== undefined && dto.amount !== null) {
        price = new Prisma.Decimal(dto.amount);
      }

      await this.prisma.invoice.create({
        data: {
          patientId: patientCase.patientId,
          sourceType: InvoiceSourceType.MANUAL,
          sourceId: step.id,
          totalAmount: price,
          status: InvoiceStatus.ISSUED,
          createdById: user.userId,
          items: {
            create: [
              {
                description,
                quantity: 1,
                unitPrice: price,
                totalPrice: price,
                sourceType: InvoiceItemSourceType.MANUAL,
                sourceId: step.id,
              },
            ],
          },
        },
      });

      return step;
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
}

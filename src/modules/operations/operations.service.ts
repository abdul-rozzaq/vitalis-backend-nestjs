import { Prisma } from '@/generated/prisma/client';
import {
  CaseStepStatus,
  InvoiceItemSourceType,
  InvoiceSourceType,
  InvoiceStatus,
  OperationStatus,
} from '@/generated/prisma/enums';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceService } from '../invoice/invoice.service';

import {
  generateOperationContractDocx,
  OperationContractRow,
} from './generators/operation-contract-docx';
import { CreateOperationDto, UpdateOperationDto } from './operation.dto';
import { OperationsRepository } from './operations.repository';

@Injectable()
export class OperationsService {
  constructor(
    private readonly repo: OperationsRepository,
    private readonly invoiceService: InvoiceService,
  ) {}

  findAll(patientId?: string) {
    return this.repo.findAll(patientId);
  }

  async findOne(id: string) {
    const op = await this.repo.findOne(id);
    if (!op) throw new NotFoundException(`Operation ${id} topilmadi`);
    return op;
  }

  async create(dto: CreateOperationDto) {
    const hasLead = dto.surgeons.some((s) => s.role === 'LEAD');
    if (!hasLead) {
      throw new BadRequestException("Kamida 1 ta LEAD jarroh bo'lishi kerak");
    }

    // Invois operatsiya yaratilishi bilan avtomatik yaratilmaydi — bu
    // operatsiya tafsilotlari sahifasida alohida amal sifatida ("Invois
    // yaratish" tugmasi) bajariladi, chunki har xil bemorlar operatsiyadan
    // oldin, keyin yoki qisman to'lashni xohlashi mumkin.
    return this.repo.create(dto);
  }

  private buildInvoiceItems(op: Awaited<ReturnType<OperationsRepository['findOne']>>) {
    if (!op) return [];

    const invoiceItems: {
      description: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      sourceType: InvoiceItemSourceType;
      sourceId: string;
    }[] = [];

    const basePrice = new Prisma.Decimal(op.basePrice?.toString() ?? '0');

    invoiceItems.push({
      description: op.operationType.name,
      quantity: 1,
      unitPrice: basePrice,
      sourceType: InvoiceItemSourceType.OPERATION,
      sourceId: op.id,
    });

    for (const item of op.items) {
      invoiceItems.push({
        description: item.name,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice.toString()),
        sourceType: InvoiceItemSourceType.OPERATION,
        sourceId: item.id,
      });
    }

    // Laboratoriya tahlillari narxi ham umumiy invois summasiga qo'shiladi.
    const labOrders = op.caseStep?.labOrders ?? [];
    for (const labOrder of labOrders) {
      for (const item of labOrder.items) {
        invoiceItems.push({
          description: item.service.name,
          quantity: 1,
          unitPrice: new Prisma.Decimal(item.service.price?.toString() ?? '0'),
          sourceType: InvoiceItemSourceType.LAB_SERVICE,
          sourceId: item.service.id,
        });
      }
    }

    return invoiceItems;
  }

  /**
   * Operatsiya tafsilotlari sahifasidan chaqiriladi — operatsiya (bazaviy
   * narx + xizmatlar) va unga bog'liq laboratoriya tahlillari narxi asosida
   * invois yaratadi. Bitta operatsiya uchun bir nechta invois yaratish
   * mumkin (masalan, bemor operatsiya narxini bir necha bo'lakka bo'lib
   * to'lamoqchi bo'lsa) — lekin barcha (bekor qilinmagan) invoislar
   * yig'indisi operatsiyaning umumiy narxidan oshib ketmaydi.
   *
   * `amount` — xodim hozir aynan qancha summaga invois yaratmoqchi ekanini
   * bildiradi. Agar berilmasa, hali invoislanmagan qolgan summaning
   * to'liq o'ziga invois yaratiladi. Operatsiya uchun yaratiladigan
   * BIRINCHI va operatsiyaning TO'LIQ narxini qamrab oladigan invois
   * avvalgidek to'liq tarkibiy qismlar (xizmatlar, lab tahlillari alohida
   * bandlar) bilan yaratiladi; qolgan barcha (qisman) invoislar yagona
   * umumlashtirilgan band sifatida saqlanadi.
   */
  async createInvoiceForOperation(id: string, staffId: string, amount?: number) {
    const op = await this.findOne(id);

    const invoices = await this.invoiceService.getInvoicesBySource(
      InvoiceSourceType.OPERATION,
      id,
    );
    const activeInvoices = invoices.filter(
      (inv) => inv.status !== InvoiceStatus.CANCELLED,
    );

    const fullInvoiceItems = this.buildInvoiceItems(op);
    const fullTotal = fullInvoiceItems.reduce(
      (sum, item) => sum.add(item.unitPrice.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    const alreadyInvoiced = activeInvoices.reduce(
      (sum, inv) => sum.add(inv.totalAmount),
      new Prisma.Decimal(0),
    );
    const remainingToInvoice = fullTotal.sub(alreadyInvoiced);

    if (remainingToInvoice.lessThanOrEqualTo(0.01)) {
      throw new BadRequestException(
        "Bu operatsiyaning umumiy narxiga allaqachon to'liq invois(lar) yaratilgan",
      );
    }

    let targetAmount = remainingToInvoice;
    if (amount !== undefined) {
      if (amount <= 0) {
        throw new BadRequestException(
          "Invois summasi 0 dan katta bo'lishi kerak",
        );
      }
      targetAmount = new Prisma.Decimal(amount);
      if (targetAmount.greaterThan(remainingToInvoice.add(0.01))) {
        throw new BadRequestException(
          `Kiritilgan summa hali invoislanmagan qoldiqdan (${remainingToInvoice.toFixed(2)}) katta bo'lishi mumkin emas`,
        );
      }
    }

    const isFirstFullInvoice =
      activeInvoices.length === 0 && targetAmount.equals(fullTotal);

    const invoiceItems = isFirstFullInvoice
      ? fullInvoiceItems
      : [
          {
            description: `${op.operationType.name} — invois #${activeInvoices.length + 1}`,
            quantity: 1,
            unitPrice: targetAmount,
            sourceType: InvoiceItemSourceType.OPERATION,
            sourceId: op.id,
          },
        ];

    return this.invoiceService.createInvoice({
      patientId: op.patientId,
      sourceType: InvoiceSourceType.OPERATION,
      sourceId: op.id,
      staffId,
      items: invoiceItems,
      // Qo'lda kiritilgan (qisman) invoislar operatsiya keyinchalik
      // tahrirlanganda avtomatik tarkibiy qismlar bilan qayta
      // sinxronlanmasligi kerak — shu sababli belgilanadi.
      note: isFirstFullInvoice ? undefined : 'MANUAL_INVOICE',
    });
  }

  async update(id: string, dto: UpdateOperationDto) {
    const op = await this.findOne(id);

    if (op.status === OperationStatus.COMPLETED) {
      throw new BadRequestException(
        "Tugallangan operatsiyani o'zgartirib bo'lmaydi",
      );
    }
    if (op.status === OperationStatus.CANCELLED) {
      throw new BadRequestException(
        "Bekor qilingan operatsiyani o'zgartirib bo'lmaydi",
      );
    }

    if (dto.surgeons) {
      const hasLead = dto.surgeons.some((s) => s.role === 'LEAD');
      if (!hasLead) {
        throw new BadRequestException(
          "Kamida 1 ta LEAD jarroh bo'lishi kerak",
        );
      }
    }

    const updated = await this.repo.update(id, dto);

    // basePrice yoki xizmatlar (items) o'zgargan bo'lishi mumkin — masalan,
    // operatsiya IN_PROGRESS holatda bo'lganda ham yangi xizmat qo'shilgan
    // bo'lishi mumkin. Shu sababli tegishli invoice har doim operatsiyaning
    // joriy holatiga moslab qayta sinxronlanadi (avval to'langan summa
    // saqlanadi, faqat jami summa va status yangilanadi).
    if (updated) {
      const invoiceItems: {
        description: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        sourceId: string;
      }[] = [];

      const basePrice = new Prisma.Decimal(
        updated.basePrice?.toString() ?? '0',
      );
      invoiceItems.push({
        description: updated.operationType.name,
        quantity: 1,
        unitPrice: basePrice,
        sourceId: updated.id,
      });

      for (const item of updated.items) {
        invoiceItems.push({
          description: item.name,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice.toString()),
          sourceId: item.id,
        });
      }

      const activeInvoices = (
        await this.invoiceService.getInvoicesBySource(
          InvoiceSourceType.OPERATION,
          id,
        )
      ).filter((inv) => inv.status !== InvoiceStatus.CANCELLED);

      const canAutoSync =
        activeInvoices.length === 1 &&
        activeInvoices[0].note !== 'MANUAL_INVOICE';

      if (canAutoSync) {
        await this.invoiceService.syncOperationInvoice(id, invoiceItems);
      }
    }

    return updated;
  }

  async getInvoices(id: string) {
    await this.findOne(id);
    return this.invoiceService.getInvoicesBySource(
      InvoiceSourceType.OPERATION,
      id,
    );
  }

  async start(id: string) {
    const op = await this.findOne(id);
    if (op.status !== OperationStatus.SCHEDULED) {
      throw new BadRequestException(
        'Faqat SCHEDULED operatsiyani boshlash mumkin',
      );
    }

    return this.repo.updateStatus(id, OperationStatus.IN_PROGRESS, {
      startedAt: new Date(),
    });
  }

  async complete(id: string) {
    const op = await this.findOne(id);
    if (op.status !== OperationStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Faqat IN_PROGRESS operatsiyani yakunlash mumkin',
      );
    }

    const updated = await this.repo.updateStatus(
      id,
      OperationStatus.COMPLETED,
      { completedAt: new Date() },
    );

    if (op.caseStepId) {
      await this.repo.updateCaseStep(op.caseStepId, {
        status: CaseStepStatus.DONE,
        completedAt: new Date(),
      });
    }

    return updated;
  }

  async cancel(id: string) {
    const op = await this.findOne(id);
    if (op.status === OperationStatus.COMPLETED) {
      throw new BadRequestException(
        "Tugallangan operatsiyani bekor qilib bo'lmaydi",
      );
    }

    const updated = await this.repo.updateStatus(
      id,
      OperationStatus.CANCELLED,
    );

    if (op.caseStepId) {
      await this.repo.updateCaseStep(op.caseStepId, {
        status: CaseStepStatus.CANCELLED,
      });
    }

    await this.cancelOperationInvoice(id);

    return updated;
  }

  async remove(id: string) {
    const op = await this.findOne(id);
    if (op.status !== OperationStatus.SCHEDULED) {
      throw new BadRequestException(
        "Faqat SCHEDULED operatsiyani o'chirish mumkin",
      );
    }

    await this.cancelOperationInvoice(id);

    return this.repo.delete(id);
  }

  /**
   * Operatsiya bekor qilinganda yoki o'chirilganda unga bog'liq barcha
   * (bekor qilinmagan) invoislar ham bekor qilinadi — aks holda invoislar
   * "Invoislar" bo'limida ochiq/to'lanishi kerak bo'lgan holatda osilib
   * qolib, kassirni chalg'itadi. To'liq to'langan invois (pul allaqachon
   * qabul qilingan) avtomatik bekor qilinmaydi — bunday holatda qaytarish
   * (refund) alohida amal orqali amalga oshiriladi.
   */
  private async cancelOperationInvoice(operationId: string) {
    const invoices = await this.invoiceService.getInvoicesBySource(
      InvoiceSourceType.OPERATION,
      operationId,
    );

    for (const invoice of invoices) {
      if (
        invoice.status === InvoiceStatus.CANCELLED ||
        invoice.status === InvoiceStatus.PAID
      ) {
        continue;
      }
      await this.invoiceService.cancelInvoice(invoice.id);
    }
  }

  async generateContract(id: string) {
    const op = await this.findOne(id);

    const leadSurgeon =
      op.surgeons.find((s) => s.role === 'LEAD') ?? op.surgeons[0];

    const rows: OperationContractRow[] = [];

    if (Number(op.basePrice) > 0) {
      rows.push({
        name: op.operationType.name,
        quantity: 1,
        unitPrice: Number(op.basePrice),
        totalPrice: Number(op.basePrice),
      });
    }

    for (const item of op.items) {
      rows.push({
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      });
    }

    const labOrders = op.caseStep?.labOrders ?? [];
    for (const labOrder of labOrders) {
      for (const item of labOrder.items) {
        const price = Number(item.service.price ?? 0);
        rows.push({
          name: item.service.name,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        });
      }
    }

    const now = new Date();

    const buffer = await generateOperationContractDocx({
      contractNumber: op.contractNumber ?? op.id.slice(0, 8).toUpperCase(),
      contractTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      startDate: op.scheduledAt,
      endDate: op.completedAt,
      patientFullName: `${op.patient.first_name} ${op.patient.last_name}`,
      patientBirthDate: op.patient.birth_date,
      patientAddress: op.patient.address,
      departmentName: op.department?.name,
      diagnosis: op.caseStep?.case?.chiefComplaint,
      doctorName: leadSurgeon
        ? `${leadSurgeon.surgeon.first_name} ${leadSurgeon.surgeon.last_name}`
        : undefined,
      rows,
      totalPrice: Number(op.totalPrice),
    });

    return { buffer, operation: op };
  }
}
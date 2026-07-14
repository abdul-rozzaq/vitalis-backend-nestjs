import { Prisma } from '@/generated/prisma/client';
import {
  CaseStepStatus,
  InvoiceItemSourceType,
  InvoiceSourceType,
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

    const op = await this.repo.create(dto);

    const leadSurgeon = op.surgeons.find((s) => s.role === 'LEAD');
    const staffId = leadSurgeon?.surgeonId ?? op.surgeons[0]?.surgeonId;

    if (!staffId) {
      console.warn(`Operation ${op.id}: staffId topilmadi, invoice yaratilmadi`);
      return { ...op, invoice: null };
    }

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

    const invoice = await this.invoiceService.createInvoice({
      patientId: op.patientId,
      sourceType: InvoiceSourceType.OPERATION,
      sourceId: op.id,
      staffId,
      items: invoiceItems,
    });

    return { ...op, invoice };
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

    return this.repo.update(id, dto);
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

    return updated;
  }

  async remove(id: string) {
    const op = await this.findOne(id);
    if (op.status !== OperationStatus.SCHEDULED) {
      throw new BadRequestException(
        "Faqat SCHEDULED operatsiyani o'chirish mumkin",
      );
    }
    return this.repo.delete(id);
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
import {
  CaseStepStatus,
  CaseStepType,
  OperationStatus,
} from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateOperationDto, UpdateOperationDto } from './operation.dto';

@Injectable()
export class OperationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private includeAll = {
    patient: { select: { id: true, first_name: true, last_name: true } },
    operationType: { select: { id: true, name: true, basePrice: true } },
    room: { select: { id: true, name: true } },
    department: { select: { id: true, name: true } },
    caseStep: { select: { id: true, caseId: true, status: true } },
    surgeons: {
      include: {
        surgeon: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
      },
    },
    items: {
      include: {
        operationTypeItem: { select: { id: true, name: true } },
      },
    },
  };

  findAll(patientId?: string) {
    return this.prisma.operation.findMany({
      where: patientId ? { patientId } : undefined,
      include: this.includeAll,
      orderBy: { scheduledAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.operation.findUnique({
      where: { id },
      include: this.includeAll,
    });
  }

  // Shartnoma (contract) hujjatini generatsiya qilish uchun bemorning to'liq
  // ma'lumotlari (tug'ilgan sana, manzil) va bo'lim nomi kerak bo'ladi.
  findForContract(id: string) {
    return this.prisma.operation.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            birth_date: true,
            address: true,
          },
        },
        operationType: { select: { id: true, name: true, basePrice: true } },
        department: { select: { id: true, name: true } },
        surgeons: {
          include: {
            surgeon: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
        items: true,
      },
    });
  }

async create(dto: CreateOperationDto) {
  return this.prisma.$transaction(async (tx) => {
    const operationType = await tx.operationType.findUniqueOrThrow({
      where: { id: dto.operationTypeId },
      select: { basePrice: true },
    });

    const basePrice = dto.basePrice ?? Number(operationType.basePrice);

    const itemsTotal = (dto.items ?? []).reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0,
    );
    const totalPrice = basePrice + itemsTotal;

    const caseStep = await tx.caseStep.create({
      data: {
        caseId: dto.caseId,
        type: CaseStepType.OPERATION,
        status: CaseStepStatus.PENDING,
        note: dto.note,
      },
    });

    const operation = await tx.operation.create({
      data: {
        patientId: dto.patientId,
        operationTypeId: dto.operationTypeId,
        roomId: dto.roomId,
        departmentId: dto.departmentId,
        contractNumber: dto.contractNumber,
        caseStepId: caseStep.id,
        scheduledAt: new Date(dto.scheduledAt),
        note: dto.note,
        basePrice,
        totalPrice,
        surgeons: {
          create: dto.surgeons.map((s) => ({
            surgeonId: s.surgeonId,
            role: s.role,
          })),
        },
        items: dto.items?.length
          ? {
              create: dto.items.map((item) => ({
                operationTypeItemId: item.operationTypeItemId,
                name: item.name,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                totalPrice: item.unitPrice * item.quantity,
              })),
            }
          : undefined,
      },
      include: this.includeAll,
    });

    return operation;
  });
}
async update(id: string, dto: UpdateOperationDto) {
  const { surgeons, items, ...rest } = dto;

  return this.prisma.$transaction(async (tx) => {
    await tx.operation.update({
      where: { id },
      data: {
        ...rest, // basePrice shu yerda ham qo'llanadi, chunki UpdateOperationDto'da bor
        scheduledAt: rest.scheduledAt
          ? new Date(rest.scheduledAt)
          : undefined,
      },
    });

    if (surgeons !== undefined) {
      await tx.operationSurgeon.deleteMany({ where: { operationId: id } });
      await tx.operationSurgeon.createMany({
        data: surgeons.map((s) => ({
          operationId: id,
          surgeonId: s.surgeonId,
          role: s.role,
        })),
      });
    }

    if (items !== undefined) {
      const incomingIds = items.filter((i) => i.id).map((i) => i.id!);

      await tx.operationItem.deleteMany({
        where: { operationId: id, id: { notIn: incomingIds } },
      });

      for (const item of items) {
        if (item.id) {
          await tx.operationItem.update({
            where: { id: item.id },
            data: {
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: item.unitPrice * item.quantity,
            },
          });
        } else {
          await tx.operationItem.create({
            data: {
              operationId: id,
              operationTypeItemId: item.operationTypeItemId,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: item.unitPrice * item.quantity,
            },
          });
        }
      }
    }

    // basePrice yoki items o'zgargan bo'lishi mumkin — totalPrice HAR DOIM qayta hisoblanadi
    const [allItems, operation] = await Promise.all([
      tx.operationItem.findMany({ where: { operationId: id } }),
      tx.operation.findUniqueOrThrow({ where: { id } }),
    ]);

    const itemsTotal = allItems.reduce(
      (sum, i) => sum + Number(i.totalPrice),
      0,
    );
    const newTotal = Number(operation.basePrice) + itemsTotal;

    await tx.operation.update({
      where: { id },
      data: { totalPrice: newTotal },
    });

    return tx.operation.findUnique({
      where: { id },
      include: this.includeAll,
    });
  });
}

  updateStatus(
    id: string,
    status: OperationStatus,
    extra?: { startedAt?: Date; completedAt?: Date },
  ) {
    return this.prisma.operation.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  updateCaseStep(
    caseStepId: string,
    data: { status: CaseStepStatus; completedAt?: Date },
  ) {
    return this.prisma.caseStep.update({
      where: { id: caseStepId },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.operation.delete({ where: { id } });
  }
}
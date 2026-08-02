import {
  CaseStepStatus,
  CaseStepType,
  OperationStatus,
} from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOperationDto, UpdateOperationDto } from './operation.dto';

@Injectable()
export class OperationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private includeAll = {
    patient: { select: { id: true, first_name: true, last_name: true, birth_date: true, address: true } },
    operationType: { select: { id: true, name: true, basePrice: true } },
    room: { select: { id: true, name: true } },
    department: { select: { id: true, name: true } },
    caseStep: {
      select: {
        id: true,
        caseId: true,
        status: true,
        case: { select: { id: true, chiefComplaint: true } },
        labOrders: {
          include: {
            laboratory: { select: { id: true, name: true } },
            items: {
              include: {
                service: { select: { id: true, name: true, price: true } },
                performedBy: {
                  select: { id: true, first_name: true, last_name: true },
                },
                resultTable: {
                  include: { rows: { orderBy: { sortOrder: 'asc' as const } } },
                },
                files: true,
              },
            },
          },
        },
      },
    },
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

    const caseStep = await tx.caseStep.create({
      data: {
        caseId: dto.caseId,
        type: CaseStepType.OPERATION,
        status: CaseStepStatus.PENDING,
        note: dto.note,
      },
    });

    // Bemorni operatsiya bilan bir vaqtda laboratoriya tahlillariga ham
    // yuborish (masalan, operatsiya oldi tahlillari). Xizmatlar o'z
    // laboratoriyasiga qarab guruhlanadi va har bir laboratoriya uchun
    // alohida LabOrder yaratiladi, hammasi shu operatsiyaning caseStep'iga
    // bog'lanadi — shu orqali operatsiya tafsilotlarida natijalar ko'rinadi.
    // Bu tahlillar narxi operatsiyaning umumiy summasiga ham qo'shiladi.
    let labTotal = 0;

    if (dto.labServiceIds?.length) {
      const services = await tx.laboratoryService.findMany({
        where: { id: { in: dto.labServiceIds } },
      });
      if (services.length !== dto.labServiceIds.length) {
        throw new BadRequestException(
          'Bir yoki bir nechta laboratoriya xizmati topilmadi',
        );
      }

      labTotal = services.reduce((sum, s) => sum + (s.price ?? 0), 0);

      const groups = services.reduce((m, s) => {
        if (!m.has(s.laboratoryId)) m.set(s.laboratoryId, [] as typeof services);
        m.get(s.laboratoryId)!.push(s);
        return m;
      }, new Map<string, typeof services>());

      for (const [laboratoryId, svcs] of groups.entries()) {
        const labOrder = await tx.labOrder.create({
          data: {
            caseStep: { connect: { id: caseStep.id } },
            patient: { connect: { id: dto.patientId } },
            laboratory: { connect: { id: laboratoryId } },
          },
        });

        for (const svc of svcs) {
          await tx.labOrderItem.create({
            data: {
              labOrder: { connect: { id: labOrder.id } },
              service: { connect: { id: svc.id } },
            },
          });
        }
      }
    }

    const totalPrice = basePrice + itemsTotal + labTotal;

    const operation = await tx.operation.create({
      data: {
        patientId: dto.patientId,
        operationTypeId: dto.operationTypeId,
        roomId: dto.roomId,
        departmentId: dto.departmentId,
        caseStepId: caseStep.id,
        scheduledAt: new Date(dto.scheduledAt),
        note: dto.note,
        contractNumber: dto.contractNumber,
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

    // basePrice yoki items o'zgargan bo'lishi mumkin — totalPrice HAR DOIM qayta hisoblanadi.
    // Bog'liq caseStep ostidagi laboratoriya tahlillari narxi ham hisobga olinadi.
    const operation = await tx.operation.findUniqueOrThrow({ where: { id } });

    const [allItems, labOrders] = await Promise.all([
      tx.operationItem.findMany({ where: { operationId: id } }),
      operation.caseStepId
        ? tx.labOrder.findMany({
            where: { caseStepId: operation.caseStepId },
            include: { items: { include: { service: true } } },
          })
        : Promise.resolve([]),
    ]);

    const itemsTotal = allItems.reduce(
      (sum, i) => sum + Number(i.totalPrice),
      0,
    );
    const labTotal = labOrders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce((s, item) => s + (item.service.price ?? 0), 0),
      0,
    );
    const newTotal = Number(operation.basePrice) + itemsTotal + labTotal;

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
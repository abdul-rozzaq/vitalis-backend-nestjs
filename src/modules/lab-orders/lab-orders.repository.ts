import { Injectable } from "@nestjs/common";
import { LabItemStatus, LabOrderStatus } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const LAB_ORDER_INCLUDE = {
  patient: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone_number: true,
      birth_date: true, // "Туғилган йили" uchun
    },
  },
  laboratory: {
    select: { id: true, name: true }, // logotip endi backend'dagi statik fayldan olinadi, DB'da saqlash shart emas
  },
  caseStep: { select: { id: true, caseId: true, status: true } },
  items: {
    include: {
      service: { select: { id: true, name: true, price: true, defaultRows: true } },
      files: { orderBy: { createdAt: "asc" as const } },
      resultTable: {
        include: { rows: { orderBy: { sortOrder: "asc" as const } } },
      },
      performedBy: {
        // Natijani kiritgan/tasdiqlagan laborant — mavjud bo'lmasa null qaytaradi,
        // servis darajasida joriy foydalanuvchi bilan fallback qilinadi
        select: { id: true, first_name: true, last_name: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

@Injectable()
export class LabOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.labOrder.findMany({
      include: LAB_ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  findByLaboratoryIds(laboratoryIds: string[]) {
    return this.prisma.labOrder.findMany({
      where: { laboratoryId: { in: laboratoryIds } },
      include: LAB_ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.labOrder.findUnique({
      where: { id },
      include: LAB_ORDER_INCLUDE,
    });
  }

  updateItem(itemId: string, data: { status?: LabItemStatus; note?: string; performedById?: string }) {
    const now = new Date();

    const timeData = {
      ...(data.status === LabItemStatus.IN_PROGRESS && { startedAt: now }),
      ...(data.status === LabItemStatus.READY && { readyAt: now, completedAt: now }),
      ...(data.status === LabItemStatus.DELIVERED && { deliveredAt: now }),
      ...(data.status === LabItemStatus.CANCELLED && { cancelledAt: now }),
    };

    return this.prisma.labOrderItem.update({
      where: { id: itemId },
      data: { ...data, ...timeData },
      include: {
        service: { select: { id: true, name: true, price: true } },
        files: { orderBy: { createdAt: "asc" as const } },
        labOrder: { select: { id: true, status: true } },
      },
    });
  }

  addFile(itemId: string, url: string, name: string) {
    return this.prisma.labOrderItemFile.create({
      data: { url, name, labOrderItem: { connect: { id: itemId } } },
    });
  }

  removeFile(fileId: string) {
    return this.prisma.labOrderItemFile.delete({ where: { id: fileId } });
  }

  findFile(fileId: string) {
    return this.prisma.labOrderItemFile.findUnique({ where: { id: fileId } });
  }

  upsertResultTable(
    itemId: string,
    rows: { code?: string; indicator: string; result?: string; norm?: string; unit?: string; sortOrder?: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const table = await tx.labResultTable.upsert({
        where: { labOrderItemId: itemId },
        create: { labOrderItemId: itemId },
        update: {},
      });

      await tx.labResultRow.deleteMany({ where: { tableId: table.id } });

      await tx.labResultRow.createMany({
        data: rows.map((r, index) => ({
          tableId: table.id,
          code: r.code,
          indicator: r.indicator,
          // Natija hali tayyor bo'lmagan ko'rsatkichlar uchun (masalan tahlil hali
          // qilinmagan) bo'sh qoldirilsa, "-" bilan avtomatik to'ldiramiz — shu orqali
          // laborant to'liq bo'lmagan jadvalni ham saqlashi mumkin.
          result: r.result?.trim() ? r.result : "-",
          norm: r.norm,
          unit: r.unit,
          sortOrder: r.sortOrder ?? index,
        })),
      });

      return tx.labResultTable.findUniqueOrThrow({
        where: { id: table.id },
        include: { rows: { orderBy: { sortOrder: "asc" } } },
      });
    });
  }

  deleteResultTable(itemId: string) {
    return this.prisma.labResultTable.deleteMany({ where: { labOrderItemId: itemId } });
  }

  async recalcOrderStatus(labOrderId: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { items: { select: { status: true } } },
    });
    if (!order) return;

    const statuses = order.items.map((i) => i.status);
    let newStatus: LabOrderStatus = LabOrderStatus.PENDING;

    if (statuses.every((s) => s === LabItemStatus.DELIVERED || s === LabItemStatus.CANCELLED)) {
      newStatus = LabOrderStatus.COMPLETED;
    } else if (statuses.some((s) => s === LabItemStatus.READY || s === LabItemStatus.DELIVERED)) {
      newStatus = LabOrderStatus.IN_PROGRESS;
    } else if (statuses.some((s) => s === LabItemStatus.IN_PROGRESS)) {
      newStatus = LabOrderStatus.IN_PROGRESS;
    }

    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: { status: newStatus },
    });
  }
}
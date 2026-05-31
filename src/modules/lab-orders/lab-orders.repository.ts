import { Injectable } from "@nestjs/common";
import { LabItemStatus, LabOrderStatus } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const LAB_ORDER_INCLUDE = {
  patient: {
    select: { id: true, first_name: true, last_name: true, phone_number: true },
  },
  laboratory: { select: { id: true, name: true } },
  caseStep: { select: { id: true, caseId: true, status: true } },
  items: {
    include: {
      service: { select: { id: true, name: true, price: true } },
      payment: { select: { id: true, amount: true, status: true, method: true } },
      files: { orderBy: { createdAt: "asc" as const } },
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

  updateItem(itemId: string, data: { status?: LabItemStatus; note?: string }) {
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
        payment: { select: { id: true, amount: true, status: true, method: true } },
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

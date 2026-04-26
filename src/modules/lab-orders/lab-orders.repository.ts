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

  updateItem(
    itemId: string,
    data: {
      status?: LabItemStatus;
      fileUrl?: string;
      fileName?: string;
      note?: string;
      completedAt?: Date;
    },
  ) {
    return this.prisma.labOrderItem.update({
      where: { id: itemId },
      data,
      include: {
        service: { select: { id: true, name: true, price: true } },
        payment: { select: { id: true, amount: true, status: true, method: true } },
        labOrder: { select: { id: true, status: true } },
      },
    });
  }

  async recalcOrderStatus(labOrderId: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { items: { select: { status: true } } },
    });
    if (!order) return;

    const statuses = order.items.map((i) => i.status);
    let newStatus: LabOrderStatus = LabOrderStatus.PENDING;

    if (statuses.length > 0 && statuses.every((s) => s === LabItemStatus.DONE || s === LabItemStatus.CANCELLED)) {
      newStatus = LabOrderStatus.COMPLETED;
    } else if (statuses.some((s) => s === LabItemStatus.IN_PROGRESS || s === LabItemStatus.DONE)) {
      newStatus = LabOrderStatus.IN_PROGRESS;
    }

    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: { status: newStatus },
    });
  }
}

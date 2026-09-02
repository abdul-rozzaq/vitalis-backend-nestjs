import { Injectable } from "@nestjs/common";
import { DiagnosticItemStatus, DiagnosticOrderStatus } from "../../generated/prisma/client";
import { InvoiceSourceType } from "../../generated/prisma/enums";
import { PrismaService } from "../../prisma/prisma.service";

const DIAGNOSTIC_ORDER_INCLUDE = {
  patient: {
    select: { id: true, first_name: true, last_name: true, phone_number: true },
  },
  diagnostics: { select: { id: true, name: true } },
  caseStep: { select: { id: true, caseId: true, status: true } },
  items: {
    include: {
      service: { select: { id: true, name: true, price: true } },
      files: { orderBy: { createdAt: "asc" as const } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

@Injectable()
export class DiagnosticOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.diagnosticOrder.findMany({
      include: DIAGNOSTIC_ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  findByDiagnosticsIds(diagnosticsIds: string[]) {
    return this.prisma.diagnosticOrder.findMany({
      where: { diagnosticsId: { in: diagnosticsIds } },
      include: DIAGNOSTIC_ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.diagnosticOrder.findUnique({
      where: { id },
      include: DIAGNOSTIC_ORDER_INCLUDE,
    });
  }

  updateItem(itemId: string, data: { status?: DiagnosticItemStatus; note?: string }) {
    const now = new Date();

    const timeData = {
      ...(data.status === DiagnosticItemStatus.IN_PROGRESS && { startedAt: now }),
      ...(data.status === DiagnosticItemStatus.READY && { readyAt: now, completedAt: now }),
      ...(data.status === DiagnosticItemStatus.DELIVERED && { deliveredAt: now }),
      ...(data.status === DiagnosticItemStatus.CANCELLED && { cancelledAt: now }),
    };

    return this.prisma.diagnosticOrderItem.update({
      where: { id: itemId },
      data: { ...data, ...timeData },
      include: {
        service: { select: { id: true, name: true, price: true } },
        files: { orderBy: { createdAt: "asc" as const } },
        diagnosticOrder: { select: { id: true, status: true } },
      },
    });
  }

  addFile(itemId: string, url: string, name: string) {
    return this.prisma.diagnosticOrderItemFile.create({
      data: { url, name, diagnosticOrderItem: { connect: { id: itemId } } },
    });
  }

  removeFile(fileId: string) {
    return this.prisma.diagnosticOrderItemFile.delete({ where: { id: fileId } });
  }

  findFile(fileId: string) {
    return this.prisma.diagnosticOrderItemFile.findUnique({ where: { id: fileId } });
  }

  async recalcOrderStatus(diagnosticOrderId: string) {
    const order = await this.prisma.diagnosticOrder.findUnique({
      where: { id: diagnosticOrderId },
      include: { items: { select: { status: true } } },
    });
    if (!order) return;

    const statuses = order.items.map((i) => i.status);
    let newStatus: DiagnosticOrderStatus = DiagnosticOrderStatus.PENDING;

    if (statuses.every((s) => s === DiagnosticItemStatus.DELIVERED || s === DiagnosticItemStatus.CANCELLED)) {
      newStatus = DiagnosticOrderStatus.COMPLETED;
    } else if (
      statuses.some((s) => s === DiagnosticItemStatus.READY || s === DiagnosticItemStatus.DELIVERED)
    ) {
      newStatus = DiagnosticOrderStatus.IN_PROGRESS;
    } else if (statuses.some((s) => s === DiagnosticItemStatus.IN_PROGRESS)) {
      newStatus = DiagnosticOrderStatus.IN_PROGRESS;
    }

    return this.prisma.diagnosticOrder.update({
      where: { id: diagnosticOrderId },
      data: { status: newStatus },
    });
  }

  async deleteOrder(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.diagnosticOrder.findUnique({
        where: { id },
        include: { caseStep: true },
      });
      if (!order) return null;

      await tx.invoice.deleteMany({
        where: {
          sourceType: InvoiceSourceType.DIAGNOSTIC_ORDER,
          sourceId: { in: [order.id, order.caseStepId] },
          paidCash: 0,
          paidBonus: 0,
        },
      });

      if (order.caseStepId) {
        return tx.caseStep.delete({ where: { id: order.caseStepId } });
      }

      return tx.diagnosticOrder.delete({ where: { id } });
    });
  }

  async deleteItem(orderId: string, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.diagnosticOrder.findUnique({
        where: { id: orderId },
        include: {
          items: { select: { id: true } },
          caseStep: true,
        },
      });
      if (!order) return null;

      const item = order.items.find((i) => i.id === itemId);
      if (!item) return null;

      if (order.items.length <= 1) {
        await tx.invoice.deleteMany({
          where: {
            sourceType: InvoiceSourceType.DIAGNOSTIC_ORDER,
            sourceId: { in: [order.id, order.caseStepId] },
            paidCash: 0,
            paidBonus: 0,
          },
        });
        if (order.caseStepId) {
          return tx.caseStep.delete({ where: { id: order.caseStepId } });
        }
        return tx.diagnosticOrder.delete({ where: { id: orderId } });
      }

      await tx.diagnosticOrderItem.delete({ where: { id: itemId } });

      const remainingItems = await tx.diagnosticOrderItem.findMany({
        where: { diagnosticOrderId: orderId },
        select: { status: true },
      });
      const statuses = remainingItems.map((i) => i.status);
      let newStatus: DiagnosticOrderStatus = DiagnosticOrderStatus.PENDING;
      if (statuses.every((s) => s === DiagnosticItemStatus.DELIVERED || s === DiagnosticItemStatus.CANCELLED)) {
        newStatus = DiagnosticOrderStatus.COMPLETED;
      } else if (
        statuses.some((s) => s === DiagnosticItemStatus.READY || s === DiagnosticItemStatus.DELIVERED)
      ) {
        newStatus = DiagnosticOrderStatus.IN_PROGRESS;
      } else if (statuses.some((s) => s === DiagnosticItemStatus.IN_PROGRESS)) {
        newStatus = DiagnosticOrderStatus.IN_PROGRESS;
      }

      await tx.diagnosticOrder.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      return { success: true };
    });
  }
}

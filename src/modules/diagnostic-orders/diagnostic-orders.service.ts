import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AddDiagnosticOrderItemFileDto,
  UpdateDiagnosticOrderItemDto,
} from "./diagnostic-orders.dto";
import { DiagnosticOrdersRepository } from "./diagnostic-orders.repository";

@Injectable()
export class DiagnosticOrdersService {
  constructor(
    private readonly repo: DiagnosticOrdersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findMyOrders(user: JwtPayload) {
    if (user.role === RoleName.ADMIN) {
      return this.repo.findAll();
    }
    const assignments = await this.prisma.diagnosticAssignment.findMany({
      where: { userId: user.userId, isActive: true },
      select: { diagnosticsId: true },
    });
    const diagnosticsIds = assignments.map((a) => a.diagnosticsId);
    if (diagnosticsIds.length === 0) return [];
    return this.repo.findByDiagnosticsIds(diagnosticsIds);
  }

  async findById(id: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException("Diagnostic order not found");
    return order;
  }

  async updateItem(orderId: string, itemId: string, dto: UpdateDiagnosticOrderItemDto) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Diagnostic order not found");

    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Diagnostic order item not found");

    const updated = await this.repo.updateItem(itemId, {
      status: dto.status,
      note: dto.note,
    });

    await this.repo.recalcOrderStatus(orderId);
    return updated;
  }

  async addFile(orderId: string, itemId: string, dto: AddDiagnosticOrderItemFileDto) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Diagnostic order not found");

    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Diagnostic order item not found");

    const file = await this.repo.addFile(itemId, dto.url, dto.name);

    if (item.status === "PENDING" || item.status === "IN_PROGRESS") {
      await this.repo.updateItem(itemId, { status: "READY" });
      await this.repo.recalcOrderStatus(orderId);
    }

    return file;
  }

  async removeFile(orderId: string, itemId: string, fileId: string) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Diagnostic order not found");
    if (!order.items.find((i) => i.id === itemId)) {
      throw new NotFoundException("Diagnostic order item not found");
    }
    const file = await this.repo.findFile(fileId);
    if (!file || file.diagnosticOrderItemId !== itemId) {
      throw new NotFoundException("File not found");
    }
    return this.repo.removeFile(fileId);
  }

  async deleteOrder(id: string, user: JwtPayload) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException("Diagnostic order not found");

    if (user.role === RoleName.DIAGNOST) {
      const assignments = await this.prisma.diagnosticAssignment.findMany({
        where: { userId: user.userId, isActive: true },
        select: { diagnosticsId: true },
      });
      const ids = assignments.map((a) => a.diagnosticsId);
      if (!ids.includes(order.diagnosticsId)) {
        throw new ForbiddenException("Bu buyurtmani o'chirish uchun ruxsat yo'q");
      }
    }

    await this.repo.deleteOrder(id);
    return { success: true };
  }

  async deleteItem(orderId: string, itemId: string, user: JwtPayload) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Diagnostic order not found");
    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Diagnostic order item not found");

    if (user.role === RoleName.DIAGNOST) {
      const assignments = await this.prisma.diagnosticAssignment.findMany({
        where: { userId: user.userId, isActive: true },
        select: { diagnosticsId: true },
      });
      const ids = assignments.map((a) => a.diagnosticsId);
      if (!ids.includes(order.diagnosticsId)) {
        throw new ForbiddenException("Bu xizmatni o'chirish uchun ruxsat yo'q");
      }
    }

    await this.repo.deleteItem(orderId, itemId);
    return { success: true };
  }
}

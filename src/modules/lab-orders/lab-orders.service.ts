import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { PrismaService } from "../../prisma/prisma.service";
import { AddLabOrderItemFileDto, UpdateLabOrderItemDto } from "./lab-orders.dto";
import { LabOrdersRepository } from "./lab-orders.repository";

@Injectable()
export class LabOrdersService {
  constructor(
    private readonly repo: LabOrdersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findMyOrders(user: JwtPayload) {
    if (user.role === RoleName.ADMIN) {
      return this.repo.findAll();
    }
    const labAssignments = await this.prisma.laboratoryAssignment.findMany({
      where: { userId: user.userId, isActive: true },
      select: { laboratoryId: true },
    });
    const laboratoryIds = labAssignments.map((a) => a.laboratoryId);
    if (laboratoryIds.length === 0) return [];
    return this.repo.findByLaboratoryIds(laboratoryIds);
  }

  async findById(id: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException("Lab order not found");
    return order;
  }

  async updateItem(orderId: string, itemId: string, dto: UpdateLabOrderItemDto) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");

    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Lab order item not found");

    const updated = await this.repo.updateItem(itemId, {
      status: dto.status,
      note: dto.note,
    });

    await this.repo.recalcOrderStatus(orderId);
    return updated;
  }

  async addFile(orderId: string, itemId: string, dto: AddLabOrderItemFileDto) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");
    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Lab order item not found");

    const file = await this.repo.addFile(itemId, dto.url, dto.name);
    if (item.status === "PENDING" || item.status === "IN_PROGRESS") {
      await this.repo.updateItem(itemId, { status: "READY" });
      await this.repo.recalcOrderStatus(orderId);
    }

    return file;
  }

  async removeFile(orderId: string, itemId: string, fileId: string) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");
    if (!order.items.find((i) => i.id === itemId)) throw new NotFoundException("Lab order item not found");
    const file = await this.repo.findFile(fileId);
    if (!file || file.labOrderItemId !== itemId) throw new NotFoundException("File not found");
    return this.repo.removeFile(fileId);
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { LabItemStatus } from "../../generated/prisma/client";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { RoleName } from "../../common/enums/role-name.enum";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateLabOrderItemDto } from "./lab-orders.dto";
import { LabOrdersRepository } from "./lab-orders.repository";

@Injectable()
export class LabOrdersService {
  constructor(
    private readonly repo: LabOrdersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findMyOrders(user: JwtPayload) {
    if (user.isSuperUser || user.roleName === RoleName.ADMIN) {
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

    const completedAt = dto.status === LabItemStatus.DONE ? new Date() : undefined;

    const updated = await this.repo.updateItem(itemId, {
      status: dto.status,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      note: dto.note,
      completedAt,
    });

    await this.repo.recalcOrderStatus(orderId);
    return updated;
  }
}

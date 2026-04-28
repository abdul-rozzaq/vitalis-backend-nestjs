import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const LAB_INCLUDE = {
  services: { orderBy: { name: "asc" as const } },
  _count: { select: { assignments: true } },
} as const;

@Injectable()
export class LaboratoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.laboratory.findMany({ include: LAB_INCLUDE, orderBy: { name: "asc" } });
  }

  findById(id: string) {
    return this.prisma.laboratory.findUnique({ where: { id }, include: LAB_INCLUDE });
  }

  create(data: { name: string; description?: string }) {
    return this.prisma.laboratory.create({ data, include: LAB_INCLUDE });
  }

  update(id: string, data: { name?: string; description?: string | null }) {
    return this.prisma.laboratory.update({ where: { id }, data, include: LAB_INCLUDE });
  }

  delete(id: string) {
    return this.prisma.laboratory.delete({ where: { id } });
  }

  countLabOrders(laboratoryId: string) {
    return this.prisma.labOrder.count({ where: { laboratoryId } });
  }

  createService(laboratoryId: string, data: { name: string; price?: number | null }) {
    return this.prisma.laboratoryService.create({ data: { ...data, laboratoryId } });
  }

  updateService(serviceId: string, data: { name?: string; price?: number | null }) {
    return this.prisma.laboratoryService.update({ where: { id: serviceId }, data });
  }

  deleteService(serviceId: string) {
    return this.prisma.laboratoryService.delete({ where: { id: serviceId } });
  }
}

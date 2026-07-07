import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type DefaultRow = { code?: string; indicator: string; norm?: string; unit?: string; sortOrder?: number };

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

  createService(laboratoryId: string, data: { name: string; price?: number | null; defaultRows?: DefaultRow[] }) {
    const { defaultRows, ...rest } = data;
    return this.prisma.laboratoryService.create({
      data: {
        ...rest,
        laboratoryId,
        defaultRows: defaultRows as unknown as Prisma.InputJsonValue,
      },
    });
  }

  updateService(serviceId: string, data: { name?: string; price?: number | null; defaultRows?: DefaultRow[] | null }) {
    const { defaultRows, ...rest } = data;
    return this.prisma.laboratoryService.update({
      where: { id: serviceId },
      data: {
        ...rest,
        ...(defaultRows !== undefined && {
          defaultRows: defaultRows === null ? Prisma.JsonNull : (defaultRows as unknown as Prisma.InputJsonValue),
        }),
      },
    });
  }

  deleteService(serviceId: string) {
    return this.prisma.laboratoryService.delete({ where: { id: serviceId } });
  }
}

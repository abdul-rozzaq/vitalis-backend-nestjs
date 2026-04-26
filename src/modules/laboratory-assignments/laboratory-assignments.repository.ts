import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const INCLUDE = {
  user: { select: { id: true, first_name: true, last_name: true, role: { select: { name: true } } } },
  laboratory: { select: { id: true, name: true } },
} as const;

@Injectable()
export class LaboratoryAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { laboratoryId?: string; userId?: string; isActive?: boolean }) {
    return this.prisma.laboratoryAssignment.findMany({
      where: {
        ...(filters.laboratoryId && { laboratoryId: filters.laboratoryId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.laboratoryAssignment.findUnique({ where: { id }, include: INCLUDE });
  }

  create(data: { userId: string; laboratoryId: string; isActive?: boolean }) {
    return this.prisma.laboratoryAssignment.create({ data, include: INCLUDE });
  }

  update(id: string, data: { isActive?: boolean }) {
    return this.prisma.laboratoryAssignment.update({ where: { id }, data, include: INCLUDE });
  }

  delete(id: string) {
    return this.prisma.laboratoryAssignment.delete({ where: { id } });
  }
}

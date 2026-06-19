import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const INCLUDE = {
  user: { select: { id: true, first_name: true, last_name: true, role: true } },
  diagnostics: { select: { id: true, name: true } },
} as const;

@Injectable()
export class DiagnosticAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { diagnosticsId?: string; userId?: string; isActive?: boolean }) {
    return this.prisma.diagnosticAssignment.findMany({
      where: {
        ...(filters.diagnosticsId && { diagnosticsId: filters.diagnosticsId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.diagnosticAssignment.findUnique({ where: { id }, include: INCLUDE });
  }

  create(data: { userId: string; diagnosticsId: string; isActive?: boolean }) {
    return this.prisma.diagnosticAssignment.create({ data, include: INCLUDE });
  }

  update(id: string, data: { userId?: string; diagnosticsId?: string; isActive?: boolean }) {
    return this.prisma.diagnosticAssignment.update({ where: { id }, data, include: INCLUDE });
  }

  delete(id: string) {
    return this.prisma.diagnosticAssignment.delete({ where: { id } });
  }
}
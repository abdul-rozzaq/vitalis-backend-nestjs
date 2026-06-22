import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const DIAGNOSTICS_INCLUDE = {
  services: { orderBy: { name: "asc" as const } },
  _count: { select: { assignments: true } },
} as const;

@Injectable()
export class DiagnosticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.diagnostics.findMany({
      include: DIAGNOSTICS_INCLUDE,
      orderBy: { name: "asc" },
    });
  }

  findById(id: string) {
    return this.prisma.diagnostics.findUnique({ where: { id }, include: DIAGNOSTICS_INCLUDE });
  }

  create(data: { name: string; description?: string }) {
    return this.prisma.diagnostics.create({ data, include: DIAGNOSTICS_INCLUDE });
  }

  update(id: string, data: { name?: string; description?: string | null }) {
    return this.prisma.diagnostics.update({ where: { id }, data, include: DIAGNOSTICS_INCLUDE });
  }

  delete(id: string) {
    return this.prisma.diagnostics.delete({ where: { id } });
  }

  countDiagnosticOrders(diagnosticsId: string) {
    return this.prisma.diagnosticOrder.count({ where: { diagnosticsId } });
  }

  createService(diagnosticsId: string, data: { name: string; price?: number | null }) {
    return this.prisma.diagnosticService.create({ data: { ...data, diagnosticsId } });
  }

  updateService(serviceId: string, data: { name?: string; price?: number | null }) {
    return this.prisma.diagnosticService.update({ where: { id: serviceId }, data });
  }

  deleteService(serviceId: string) {
    return this.prisma.diagnosticService.delete({ where: { id: serviceId } });
  }
}

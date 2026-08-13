import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PatientSourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.patientSource.findMany({
      where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
    });
  }

  async upsert(name: string) {
    const trimmed = name.trim();
    const existing = await this.prisma.patientSource.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) return existing;
    return this.prisma.patientSource.create({ data: { name: trimmed } });
  }
}

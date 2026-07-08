import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type TemplateRow = { code?: string; indicator: string; norm?: string; unit?: string };

@Injectable()
export class LabResultTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllSummary() {
    return this.prisma.labResultTemplate.findMany({
      select: { id: true, name: true, createdAt: true },
      orderBy: { name: "asc" },
    });
  }

  findAll() {
    return this.prisma.labResultTemplate.findMany({ orderBy: { name: "asc" } });
  }

  findById(id: string) {
    return this.prisma.labResultTemplate.findUnique({ where: { id } });
  }

  create(data: { name: string; rows: TemplateRow[] }) {
    return this.prisma.labResultTemplate.create({
      data: { name: data.name, rows: data.rows as unknown as Prisma.InputJsonValue },
    });
  }

  update(id: string, data: { name?: string; rows?: TemplateRow[] }) {
    const { rows, ...rest } = data;
    return this.prisma.labResultTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...(rows !== undefined && { rows: rows as unknown as Prisma.InputJsonValue }),
      },
    });
  }

  delete(id: string) {
    return this.prisma.labResultTemplate.delete({ where: { id } });
  }
}

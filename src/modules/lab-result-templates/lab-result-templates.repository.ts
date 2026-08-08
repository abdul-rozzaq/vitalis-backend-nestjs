import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { normalizeResultLayout, packRowsPayload, unpackRowsPayload } from "../lab-common/result-layout";

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

  async findAll() {
    const templates = await this.prisma.labResultTemplate.findMany({ orderBy: { name: "asc" } });
    return templates.map((template) => {
      const payload = unpackRowsPayload(template.rows, template.name);
      return { ...template, rows: payload.rows, layout: payload.layout };
    });
  }

  async findById(id: string) {
    const template = await this.prisma.labResultTemplate.findUnique({ where: { id } });
    if (!template) return null;
    const payload = unpackRowsPayload(template.rows, template.name);
    return { ...template, rows: payload.rows, layout: payload.layout };
  }

  create(data: { name: string; rows: TemplateRow[]; layout?: unknown }) {
    return this.prisma.labResultTemplate.create({
      data: {
        name: data.name,
        rows: packRowsPayload(data.rows, data.layout, data.name) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, data: { name?: string; rows?: TemplateRow[]; layout?: unknown }) {
    const current = await this.prisma.labResultTemplate.findUnique({ where: { id } });
    const name = data.name ?? current?.name ?? "";
    const currentPayload = unpackRowsPayload(current?.rows, name);
    const rows = data.rows ?? currentPayload.rows;
    const layout = data.layout ?? currentPayload.layout;

    const template = await this.prisma.labResultTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        rows: packRowsPayload(rows, layout, name) as unknown as Prisma.InputJsonValue,
      },
    });

    return { ...template, rows, layout: normalizeResultLayout(layout, name) };
  }

  delete(id: string) {
    return this.prisma.labResultTemplate.delete({ where: { id } });
  }
}

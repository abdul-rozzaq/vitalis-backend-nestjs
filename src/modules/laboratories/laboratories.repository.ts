import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { LabResultLayoutDto } from "./laboratories.dto";
import { normalizeResultLayout, packRowsPayload, unpackRowsPayload } from "../lab-common/result-layout";

type DefaultRow = { code?: string; indicator: string; norm?: string; unit?: string; sortOrder?: number };

const LAB_INCLUDE = {
  services: { orderBy: { name: "asc" as const } },
  _count: { select: { assignments: true } },
} as const;


function normalizeService<T extends { name: string; defaultRows?: unknown }>(service: T) {
  const payload = unpackRowsPayload(service.defaultRows, service.name);
  return {
    ...service,
    defaultRows: payload.rows,
    resultLayout: payload.layout,
  };
}

function normalizeLab<T extends { services: Array<{ name: string; defaultRows?: unknown }> }>(lab: T) {
  return {
    ...lab,
    services: lab.services.map(normalizeService),
  };
}

@Injectable()
export class LaboratoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const labs = await this.prisma.laboratory.findMany({ include: LAB_INCLUDE, orderBy: { name: "asc" } });
    return labs.map(normalizeLab);
  }

  async findById(id: string) {
    const lab = await this.prisma.laboratory.findUnique({ where: { id }, include: LAB_INCLUDE });
    return lab ? normalizeLab(lab) : null;
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

  createService(
    laboratoryId: string,
    data: { name: string; price?: number | null; defaultRows?: DefaultRow[]; resultLayout?: LabResultLayoutDto },
  ) {
    const { defaultRows, resultLayout, ...rest } = data;
    return this.prisma.laboratoryService.create({
      data: {
        ...rest,
        laboratoryId,
        defaultRows:
          defaultRows?.length
            ? (packRowsPayload(defaultRows, resultLayout, data.name) as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    }).then(normalizeService);
  }

  async updateService(
    serviceId: string,
    data: { name?: string; price?: number | null; defaultRows?: DefaultRow[] | null; resultLayout?: LabResultLayoutDto },
  ) {
    const { defaultRows, resultLayout, ...rest } = data;
    const existing = await this.prisma.laboratoryService.findUnique({ where: { id: serviceId }, select: { name: true, defaultRows: true } });
    const name = data.name ?? existing?.name ?? "";

    const updated = await this.prisma.laboratoryService.update({
      where: { id: serviceId },
      data: {
        ...rest,
        ...(defaultRows !== undefined && {
          defaultRows:
            defaultRows === null
              ? Prisma.JsonNull
              : (packRowsPayload(defaultRows, resultLayout, name) as unknown as Prisma.InputJsonValue),
        }),
        ...(defaultRows === undefined && resultLayout !== undefined && existing?.defaultRows
          ? {
              defaultRows: (() => {
                const old = unpackRowsPayload(existing.defaultRows, name);
                return packRowsPayload(old.rows, resultLayout, name) as unknown as Prisma.InputJsonValue;
              })(),
            }
          : {}),
      },
    });

    return normalizeService(updated);
  }

  deleteService(serviceId: string) {
    return this.prisma.laboratoryService.delete({ where: { id: serviceId } });
  }
}

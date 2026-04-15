import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class DistrictsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(regionId?: string) {
    return this.prisma.district.findMany({
      where: regionId ? { regionId } : undefined,
      orderBy: { name: "asc" },
    });
  }

  retrieve(id: string) {
    return this.prisma.district.findUnique({ where: { id } });
  }

  create(data: Prisma.DistrictCreateInput) {
    return this.prisma.district.create({ data });
  }

  update(id: string, data: Prisma.DistrictUpdateInput) {
    return this.prisma.district.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.district.delete({ where: { id } });
  }
}

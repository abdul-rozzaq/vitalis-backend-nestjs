import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class RegionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.region.findMany({ orderBy: { name: "asc" } });
  }

  retrieve(id: string) {
    return this.prisma.region.findUnique({ where: { id } });
  }

  create(data: Prisma.RegionCreateInput) {
    return this.prisma.region.create({ data });
  }

  update(id: string, data: Prisma.RegionUpdateInput) {
    return this.prisma.region.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.region.delete({ where: { id } });
  }
}

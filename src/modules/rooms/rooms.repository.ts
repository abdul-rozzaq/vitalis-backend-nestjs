import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.room.findMany({ orderBy: { name: "asc" } });
  }

  async retrieve(id: string) {
    return this.prisma.room.findUnique({ where: { id } });
  }

  async create(data: Prisma.RoomCreateInput) {
    return this.prisma.room.create({ data });
  }

  async update(id: string, data: Prisma.RoomUpdateInput) {
    return this.prisma.room.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.room.delete({ where: { id } });
  }
}

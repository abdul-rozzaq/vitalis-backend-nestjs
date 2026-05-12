import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Barcha xonalar — har birida band o'rinlar soni
  async list() {
    const rooms = await this.prisma.room.findMany({
      orderBy: { name: "asc" },
      include: {
        department: { select: { id: true, name: true } },
        _count: {
          select: {
            wards: { where: { status: "OCCUPIED" } },
          },
        },
      },
    });

    return rooms.map((r) => ({
      ...r,
      occupiedCount: r._count.wards,
      freeCount: (r.capacity ?? 0) - r._count.wards,
      isFull: r._count.wards >= (r.capacity ?? 0),
    }));
  }

  // Faqat WARD tipli xonalar (palatalar)
  async listWards() {
    const rooms = await this.prisma.room.findMany({
      where: { roomType: "WARD" },
      orderBy: { name: "asc" },
      include: {
        department: { select: { id: true, name: true } },
        _count: {
          select: {
            wards: { where: { status: "OCCUPIED" } },
          },
        },
      },
    });

    return rooms.map((r) => ({
      ...r,
      occupiedCount: r._count.wards,
      freeCount: (r.capacity ?? 0) - r._count.wards,
      isFull: r._count.wards >= (r.capacity ?? 0),
    }));
  }

  async retrieve(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        _count: {
          select: {
            wards: { where: { status: "OCCUPIED" } },
          },
        },
      },
    });
    if (!room) return null;
    return {
      ...room,
      occupiedCount: room._count.wards,
      freeCount: (room.capacity ?? 0) - room._count.wards,
      isFull: room._count.wards >= (room.capacity ?? 0),
    };
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

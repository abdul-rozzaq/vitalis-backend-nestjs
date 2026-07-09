import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Xonadagi haqiqiy band o'rinlar soni:
  // har bir bemor = 1 o'rin + uning companionsCount o'rinlari
  private async calcOccupied(roomId: string): Promise<number> {
    const wards = await this.prisma.wards.findMany({
      where: { roomId, status: "OCCUPIED" },
      select: { companionsCount: true },
    });
    // 1 bemor + N qarovchi = 1 + companionsCount o'rin
    return wards.reduce((sum, w) => sum + 1 + w.companionsCount, 0);
  }

  // Barcha xonalar — har birida band o'rinlar soni
  async list() {
    const rooms = await this.prisma.room.findMany({
      orderBy: { name: "asc" },
      include: {
        department: { select: { id: true, name: true, patientDailyPrice: true, companionDailyPrice: true } },
        wards: {
          where: { status: "OCCUPIED" },
          select: { companionsCount: true },
        },
      },
    });

    return rooms.map((r) => {
      // Haqiqiy band o'rinlar = bemorlar + ularning qarovchilari
      const totalOccupied = r.wards.reduce(
        (sum, w) => sum + 1 + w.companionsCount,
        0
      );
      const capacity = r.capacity ?? 0;
      const freeSlots = Math.max(0, capacity - totalOccupied);
      return {
        ...r,
        wards: undefined, // frontga yubormaymiz
        occupiedCount: totalOccupied,
        freeSlots,
        freeCount: freeSlots,
        isFull: freeSlots <= 0,
      };
    });
  }

  // Faqat WARD tipli xonalar (palatalar)
  async listWards() {
    const rooms = await this.prisma.room.findMany({
      where: { roomType: "WARD" },
      orderBy: { name: "asc" },
      include: {
        department: { select: { id: true, name: true, patientDailyPrice: true, companionDailyPrice: true } },
        wards: {
          where: { status: "OCCUPIED" },
          select: { companionsCount: true },
        },
      },
    });

    return rooms.map((r) => {
      const totalOccupied = r.wards.reduce(
        (sum, w) => sum + 1 + w.companionsCount,
        0
      );
      const capacity = r.capacity ?? 0;
      const freeSlots = Math.max(0, capacity - totalOccupied);
      return {
        ...r,
        wards: undefined,
        occupiedCount: totalOccupied,
        freeSlots,
        freeCount: freeSlots,
        isFull: freeSlots <= 0,
      };
    });
  }

  async retrieve(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, patientDailyPrice: true, companionDailyPrice: true } },
        wards: {
          where: { status: "OCCUPIED" },
          select: { companionsCount: true },
        },
      },
    });
    if (!room) return null;

    const totalOccupied = room.wards.reduce(
      (sum, w) => sum + 1 + w.companionsCount,
      0
    );
    const capacity = room.capacity ?? 0;
    const freeSlots = Math.max(0, capacity - totalOccupied);
    return {
      ...room,
      wards: undefined,
      occupiedCount: totalOccupied,
      freeSlots,
      freeCount: freeSlots,
      isFull: freeSlots <= 0,
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
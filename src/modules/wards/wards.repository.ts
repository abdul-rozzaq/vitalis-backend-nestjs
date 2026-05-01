import { Injectable } from "@nestjs/common";
import { WardStatus } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWardDto, UpdateWardDto } from "./wards.dto";

const WARD_INCLUDE = {
  patient: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone_number: true,
      birth_date: true,
      blood_type: true,
    },
  },
  room: {
    select: {
      id: true,
      name: true,
      roomType: true,
      capacity: true,
      description: true,
    },
  },
} as const;

@Injectable()
export class WardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Bemor hozir OCCUPIED holatda yotibdimi?
  async findActiveByPatient(patientId: string) {
    return this.prisma.wards.findFirst({
      where: { patientId, status: WardStatus.OCCUPIED },
      include: WARD_INCLUDE,
    });
  }

  // Yangi yotqizish yaratish
  async create(data: CreateWardDto) {
    return this.prisma.wards.create({
      data: {
        patientId: data.patientId,
        roomId: data.roomId,
<<<<<<< muslimbek
=======
        wardNumber: data.wardNumber,
>>>>>>> main
        expectedOut: data.expectedOut ? new Date(data.expectedOut) : undefined,
        note: data.note,
        status: WardStatus.OCCUPIED,
      },
      include: WARD_INCLUDE,
    });
  }

  // Faqat hozir yotayotganlar (OCCUPIED)
  async findAllOccupied() {
    return this.prisma.wards.findMany({
      where: { status: WardStatus.OCCUPIED },
      include: WARD_INCLUDE,
      orderBy: { checkIn: "desc" },
    });
  }

  // Barcha yozuvlar — filter + pagination
  async findAll(filters: { patientId?: string; roomId?: string; status?: string; dateFrom?: string; dateTo?: string; page: number; limit: number }) {
    const skip = (filters.page - 1) * filters.limit;

    const where: any = {};

    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.status) where.status = filters.status;

    // Sana filtri — checkIn oralig'i
    if (filters.dateFrom || filters.dateTo) {
      where.checkIn = {};
      if (filters.dateFrom) where.checkIn.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        where.checkIn.lte = to;
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.wards.findMany({
        where,
        include: WARD_INCLUDE,
        orderBy: { checkIn: "desc" },
        skip,
        take: filters.limit,
      }),
      this.prisma.wards.count({ where }),
    ]);

    // Hozir yotayotganlar uchun kunlar real-time hisoblash
    const enriched = data.map((w) => ({
      ...w,
      daysStayed: w.status === WardStatus.OCCUPIED ? Math.ceil((Date.now() - new Date(w.checkIn).getTime()) / (1000 * 60 * 60 * 24)) || 1 : w.daysStayed,
    }));

    return {
      data: enriched,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  // ID bo'yicha bitta yozuv
  async findById(id: string) {
    const ward = await this.prisma.wards.findUnique({
      where: { id },
      include: WARD_INCLUDE,
    });
    if (!ward) return null;

    // Real-time kunlar
    return {
      ...ward,
      daysStayed: ward.status === WardStatus.OCCUPIED ? Math.ceil((Date.now() - new Date(ward.checkIn).getTime()) / (1000 * 60 * 60 * 24)) || 1 : ward.daysStayed,
    };
  }

  // Xonadagi hozirgi bemorlar
  async findByRoom(roomId: string) {
    return this.prisma.wards.findMany({
      where: { roomId, status: WardStatus.OCCUPIED },
      include: WARD_INCLUDE,
      orderBy: { checkIn: "asc" },
    });
  }

  // Bemorni chiqarish
  async discharge(id: string, actualOut: Date, daysStayed: number, note?: string) {
    return this.prisma.wards.update({
      where: { id },
      data: {
        actualOut,
        daysStayed,
        status: WardStatus.VACATED,
        ...(note !== undefined ? { note } : {}),
      },
      include: WARD_INCLUDE,
    });
  }

  // Yozuvni tahrirlash
  async update(id: string, data: UpdateWardDto) {
    return this.prisma.wards.update({
      where: { id },
      data: {
<<<<<<< muslimbek
=======
        ...(data.wardNumber !== undefined ? { wardNumber: data.wardNumber } : {}),
>>>>>>> main
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.expectedOut !== undefined ? { expectedOut: data.expectedOut ? new Date(data.expectedOut) : null } : {}),
      },
      include: WARD_INCLUDE,
    });
  }

  // O'chirish
  async delete(id: string) {
    return this.prisma.wards.delete({ where: { id } });
  }

  // Statistika: xona sig'imi vs band o'rinlar
  async roomOccupancy(roomId: string) {
    const [room, occupied] = await Promise.all([this.prisma.room.findUnique({ where: { id: roomId } }), this.prisma.wards.count({ where: { roomId, status: WardStatus.OCCUPIED } })]);
    return {
      room,
      occupied,
      free: (room?.capacity ?? 0) - occupied,
      capacity: room?.capacity ?? 0,
    };
  }

  // Umumiy statistika (dashboard uchun)
  async getStats() {
    const [totalOccupied, totalVacated, avgStay] = await Promise.all([
      this.prisma.wards.count({ where: { status: WardStatus.OCCUPIED } }),
      this.prisma.wards.count({ where: { status: WardStatus.VACATED } }),
      this.prisma.wards.aggregate({
        where: { status: WardStatus.VACATED, daysStayed: { gt: 0 } },
        _avg: { daysStayed: true },
      }),
    ]);
    return {
      totalOccupied,
      totalVacated,
      avgDaysStayed: Math.round(avgStay._avg.daysStayed ?? 0),
    };
  }
}

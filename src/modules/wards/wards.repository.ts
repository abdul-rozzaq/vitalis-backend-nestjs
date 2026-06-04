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
      department: { select: { id: true, name: true } },
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
        checkIn: data.checkIn ? new Date(data.checkIn) : new Date(),
        expectedOut: data.expectedOut ? new Date(data.expectedOut) : undefined,
        note: data.note,
        companionsCount: data.companionsCount ?? 0,
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
  async update(id: string, data: UpdateWardDto) {
    return this.prisma.wards.update({
      where: { id },
      data: {
        ...(data.patientId !== undefined ? { patientId: data.patientId } : {}),
        ...(data.roomId !== undefined ? { roomId: data.roomId } : {}),
        ...(data.checkIn !== undefined ? { checkIn: new Date(data.checkIn) } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.companionsCount !== undefined ? { companionsCount: data.companionsCount } : {}),
        ...(data.expectedOut !== undefined ? { expectedOut: data.expectedOut ? new Date(data.expectedOut) : null } : {}),
      },
      include: WARD_INCLUDE,
    });
  }

  // O'chirish
  async delete(id: string) {
    return this.prisma.wards.delete({ where: { id } });
  }

  // TV ekran uchun: faqat xona nomi + bemor ismi (hech qanday PII yo'q)
  async findBoard() {
    const records = await this.prisma.wards.findMany({
      where: { status: WardStatus.OCCUPIED },
      select: {
        checkIn: true, // ← shu qatorni qo'shing
        patient: { select: { first_name: true, last_name: true } },
        room: { select: { name: true, capacity: true } },
      },
      orderBy: { room: { name: "asc" } },
    });
    return records.map((r) => ({
      roomName: r.room.name,
      capacity: r.room.capacity,
      firstName: r.patient.first_name,
      lastName: r.patient.last_name,
      admittedAt: r.checkIn, // ← shu qatorni qo'shing
    }));
  }

  // Statistika: xona sig'imi vs band o'rinlar
  // wards.repository.ts ichidagi roomOccupancy metodini
  // quyidagi to'g'rilangan versiyaga almashtiring:

  async roomOccupancy(roomId: string) {
    const [room, occupiedWards] = await Promise.all([
      this.prisma.room.findUnique({ where: { id: roomId } }),
      this.prisma.wards.findMany({
        where: { roomId, status: WardStatus.OCCUPIED },
        select: {
          companionsCount: true,
          patient: {
            select: { id: true, first_name: true, last_name: true, gender: true },
          },
        },
      }),
    ]);

    // Haqiqiy band o'rinlar: har bir bemor (1) + uning qarovchilari
    const totalOccupied = occupiedWards.reduce((sum, w) => sum + 1 + w.companionsCount, 0);
    const capacity = room?.capacity ?? 0;
    const free = Math.max(0, capacity - totalOccupied);

    return {
      room,
      occupied: occupiedWards.length, // faqat bemorlar soni
      totalOccupied, // bemorlar + qarovchilar (o'rinlar)
      free, // bo'sh o'rinlar
      capacity,
      currentPatients: occupiedWards.map((w) => ({
        ...w.patient,
        companionsCount: w.companionsCount,
      })),
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

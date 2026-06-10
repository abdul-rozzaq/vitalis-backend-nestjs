import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { clinicDayUTC } from "../../common/clinic-time";
import { CreateRoomShiftDto, UpdateRoomShiftDto } from "./room-shifts.dto";

const STAFF_SELECT = { id: true, first_name: true, last_name: true };

const SHIFT_INCLUDE = {
  rooms: { include: { room: { select: { id: true, name: true } } } },
  doctor: { select: STAFF_SELECT },
  defaultNurses: { include: { nurse: { select: STAFF_SELECT } } },
} as const;

@Injectable()
export class RoomShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomShiftDto) {
    const roomIds = dto.roomIds ?? [];
    const nurseIds = dto.nurseIds ?? [];

    if (roomIds.length) {
      const rooms = await this.prisma.room.findMany({ where: { id: { in: roomIds } } });
      if (rooms.length !== roomIds.length) throw new NotFoundException("Ba'zi xonalar topilmadi");
    }

    const startDate = dto.startDate ? clinicDayUTC(dto.startDate) : undefined;
    const endDate = dto.endDate ? clinicDayUTC(dto.endDate) : undefined;
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException("Boshlash sanasi tugash sanasidan keyin bo'lishi mumkin emas");
    }

    return this.prisma.roomShift.create({
      data: {
        name: dto.name,
        startHour: dto.startHour,
        endHour: dto.endHour,
        startDate,
        endDate,
        color: dto.color,
        roundHour: dto.roundHour,
        doctorId: dto.doctorId ?? null,
        rooms: roomIds.length ? { create: roomIds.map((roomId) => ({ roomId })) } : undefined,
        defaultNurses: nurseIds.length
          ? { create: nurseIds.map((nurseId) => ({ nurseId })) }
          : undefined,
      },
      include: SHIFT_INCLUDE,
    });
  }

  async findAll(roomId?: string) {
    return this.prisma.roomShift.findMany({
      where: roomId ? { rooms: { some: { roomId } } } : undefined,
      include: SHIFT_INCLUDE,
      orderBy: { startHour: "asc" },
    });
  }

  async update(id: string, dto: UpdateRoomShiftDto) {
    const shift = await this.prisma.roomShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException("Smena topilmadi");

    const { roomIds, nurseIds, startDate, endDate, ...rest } = dto;
    const nextStartDate = startDate !== undefined ? (startDate ? clinicDayUTC(startDate) : null) : undefined;
    const nextEndDate = endDate !== undefined ? (endDate ? clinicDayUTC(endDate) : null) : undefined;

    // Yangilangan qiymatlar (yoki o'zgarmagan eski) bo'yicha startDate <= endDate tekshiruvi
    const effStart = nextStartDate !== undefined ? nextStartDate : shift.startDate;
    const effEnd = nextEndDate !== undefined ? nextEndDate : shift.endDate;
    if (effStart && effEnd && effStart > effEnd) {
      throw new BadRequestException("Boshlash sanasi tugash sanasidan keyin bo'lishi mumkin emas");
    }

    // Xona/hamshira almashtirish + asosiy update bitta tranzaksiyada (atomik)
    return this.prisma.$transaction(async (tx) => {
      if (roomIds !== undefined) {
        await tx.shiftRoom.deleteMany({ where: { roomShiftId: id } });
        if (roomIds.length) {
          await tx.shiftRoom.createMany({
            data: roomIds.map((roomId) => ({ roomShiftId: id, roomId })),
            skipDuplicates: true,
          });
        }
      }

      if (nurseIds !== undefined) {
        await tx.shiftDefaultNurse.deleteMany({ where: { roomShiftId: id } });
        if (nurseIds.length) {
          await tx.shiftDefaultNurse.createMany({
            data: nurseIds.map((nurseId) => ({ roomShiftId: id, nurseId })),
            skipDuplicates: true,
          });
        }
      }

      return tx.roomShift.update({
        where: { id },
        data: { ...rest, startDate: nextStartDate, endDate: nextEndDate },
        include: SHIFT_INCLUDE,
      });
    });
  }

  async addRoom(id: string, roomId: string) {
    const shift = await this.prisma.roomShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException("Xona topilmadi");
    return this.prisma.shiftRoom.upsert({
      where: { roomShiftId_roomId: { roomShiftId: id, roomId } },
      create: { roomShiftId: id, roomId },
      update: {},
    });
  }

  async removeRoom(id: string, roomId: string) {
    return this.prisma.shiftRoom.delete({
      where: { roomShiftId_roomId: { roomShiftId: id, roomId } },
    });
  }

  async delete(id: string) {
    const shift = await this.prisma.roomShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    return this.prisma.roomShift.delete({ where: { id } });
  }
}

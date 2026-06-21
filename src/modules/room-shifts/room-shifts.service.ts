import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRoomShiftDto, UpdateRoomShiftDto } from "./room-shifts.dto";

const STAFF_SELECT = { id: true, first_name: true, last_name: true };

const SHIFT_INCLUDE = {
  rooms: { include: { room: { select: { id: true, name: true } } } },
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

    return this.prisma.roomShift.create({
      data: {
        name: dto.name,
        startHour: dto.startHour,
        endHour: dto.endHour,
        startMinute: dto.startMinute ?? 0,
        endMinute: dto.endMinute ?? 0,
        color: dto.color,
        roundHour: dto.roundHour,
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

    const { roomIds, nurseIds, ...rest } = dto;

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
        data: { ...rest },
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

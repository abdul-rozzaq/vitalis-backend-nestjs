import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { clinicDayUTC, clinicHour, isActiveShiftMinute } from "../../common/clinic-time";
import { ShiftOverrideType } from "../../generated/prisma/enums";
import {
  BulkAssignDto,
  CreateShiftOverrideDto,
  CreateSwapDto,
  OvertimeDto,
  PartialTransferDto,
  ShiftAssignmentsQueryDto,
} from "./shift-assignments.dto";

export interface ResolvedAssignment {
  roomShiftId: string;
  roomShift: { id: string; name: string; startHour: number; endHour: number };
  roomId: string;
  room: { id: string; name: string };
  doctorId: string;
  doctor: { id: string; first_name: string; last_name: string };
  nurses: { nurseId: string; nurse: { id: string; first_name: string; last_name: string } }[];
  date: Date | null;
  isOverride: boolean;
  assignmentId: string | null;
}

function isActiveShift(startHour: number, endHour: number, now: Date, startMinute = 0, endMinute = 0): boolean {
  if (startMinute === 0 && endMinute === 0) {
    const h = clinicHour(now);
    if (startHour < endHour) return h >= startHour && h < endHour;
    return h >= startHour || h < endHour;
  }
  return isActiveShiftMinute(startHour, startMinute, endHour, endMinute, now);
}

const STAFF_SELECT = { id: true, first_name: true, last_name: true };

const SHIFT_WITH_STAFF = {
  rooms: { include: { room: { select: { id: true, name: true } } } },
  defaultNurses: { include: { nurse: { select: STAFF_SELECT } } },
} as const;

@Injectable()
export class ShiftAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Override (konkret kun + xona uchun) ───────────────────────────────────

  async createOverride(dto: CreateShiftOverrideDto) {
    const shift = await this.prisma.roomShift.findUnique({
      where: { id: dto.roomShiftId },
      include: { rooms: { where: { roomId: dto.roomId } } },
    });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    if (!shift.rooms.length) throw new BadRequestException("Bu xona bu smenaga biriktirilmagan");

    const date = clinicDayUTC(dto.date);
    const nurses = dto.nurseIds?.length
      ? { create: dto.nurseIds.map((nurseId) => ({ nurseId })) }
      : undefined;
    const include = {
      roomShift: true,
      room: { select: { id: true, name: true } },
      doctor: { select: STAFF_SELECT },
      nurses: { include: { nurse: { select: STAFF_SELECT } } },
    };

    // Bitta tranzaksiyada: eski hamshiralarni tozalab, atomik upsert.
    // Unique (roomShiftId, roomId, date) tufayli parallel so'rovlarda duplicate bo'lmaydi.
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.shiftAssignment.findUnique({
        where: { roomShiftId_roomId_date: { roomShiftId: dto.roomShiftId, roomId: dto.roomId, date } },
        select: { id: true },
      });
      if (existing) {
        await tx.shiftNurse.deleteMany({ where: { shiftAssignmentId: existing.id } });
      }
      return tx.shiftAssignment.upsert({
        where: { roomShiftId_roomId_date: { roomShiftId: dto.roomShiftId, roomId: dto.roomId, date } },
        create: { roomShiftId: dto.roomShiftId, roomId: dto.roomId, date, doctorId: dto.doctorId, isOverride: true, nurses },
        update: { doctorId: dto.doctorId, isOverride: true, nurses },
        include,
      });
    });
  }

  async deleteOverride(id: string) {
    const a = await this.prisma.shiftAssignment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Tayinlov topilmadi");
    if (!a.isOverride) throw new BadRequestException("Bu override emas");
    return this.prisma.shiftAssignment.delete({ where: { id } });
  }

  // ── Resolved assignments for range ─────────────────────────────────────────

  async getResolvedForRange(query: ShiftAssignmentsQueryDto) {
    const fromDate = clinicDayUTC(query.from);
    let toDate = query.to ? clinicDayUTC(query.to) : new Date(fromDate.getTime() + 7 * 86400000);
    if (toDate < fromDate) toDate = fromDate;
    // Pathologik diapazondan himoya: on-read expansion uchun maksimal 31 kun
    const MAX_RANGE_MS = 31 * 86400000;
    if (toDate.getTime() - fromDate.getTime() > MAX_RANGE_MS) {
      toDate = new Date(fromDate.getTime() + MAX_RANGE_MS);
    }

    const shifts = await this.prisma.roomShift.findMany({
      where: query.roomId ? { rooms: { some: { roomId: query.roomId } } } : undefined,
      include: {
        ...SHIFT_WITH_STAFF,
        assignments: {
          where: { date: { gte: fromDate, lte: toDate } },
          include: {
            room: { select: { id: true, name: true } },
            doctor: { select: STAFF_SELECT },
            nurses: { include: { nurse: { select: STAFF_SELECT } } },
          },
        },
      },
    });

    const result: any[] = [];
    const dayMs = 86400000;
    for (let d = new Date(fromDate); d <= toDate; d = new Date(d.getTime() + dayMs)) {
      const day = new Date(d); // UTC yarim tun (clinicDayUTC + butun kunlik qadam)

      for (const shift of shifts) {
        for (const sr of shift.rooms) {
          if (query.roomId && sr.roomId !== query.roomId) continue;
          const assignment = shift.assignments.find(
            (a) => a.roomId === sr.roomId && a.date.getTime() === day.getTime(),
          );
          result.push({
            date: day,
            shift: { id: shift.id, name: shift.name, startHour: shift.startHour, endHour: shift.endHour },
            room: sr.room,
            assignment: assignment ?? null,
            doctor: assignment?.doctor ?? null,
            nurses: assignment?.nurses ?? shift.defaultNurses.map((n) => ({ nurseId: n.nurseId, nurse: n.nurse })),
            source: assignment ? "assigned" : "none",
          });
        }
      }
    }
    return result;
  }

  // ── Active shift for room (duty guard'da ishlatiladi) ─────────────────────

  async resolveActiveForRoom(roomId: string): Promise<ResolvedAssignment | null> {
    const now = new Date();
    const today = clinicDayUTC(now);

    const shiftRooms = await this.prisma.shiftRoom.findMany({
      where: { roomId },
      include: {
        roomShift: {
          include: {
            defaultNurses: { include: { nurse: { select: STAFF_SELECT } } },
            assignments: {
              where: { roomId, date: today },
              include: { doctor: { select: STAFF_SELECT }, nurses: { include: { nurse: { select: STAFF_SELECT } } } },
            },
          },
        },
      },
    });

    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { id: true, name: true } });
    if (!room) return null;

    for (const sr of shiftRooms) {
      const shift = sr.roomShift;
      if (!isActiveShift(shift.startHour, shift.endHour, now, shift.startMinute, shift.endMinute)) continue;

      const assignment = shift.assignments[0];
      if (assignment) {
        return {
          roomShiftId: shift.id,
          roomShift: shift,
          roomId,
          room,
          doctorId: assignment.doctorId,
          doctor: assignment.doctor,
          nurses: assignment.nurses,
          date: assignment.date,
          isOverride: true,
          assignmentId: assignment.id,
        };
      }
    }
    return null;
  }

  // ── Active shifts for a user ───────────────────────────────────────────────

  async getActiveForUser(userId: string): Promise<ResolvedAssignment[]> {
    const now = new Date();
    const today = clinicDayUTC(now);

    const shifts = await this.prisma.roomShift.findMany({
      include: {
        ...SHIFT_WITH_STAFF,
        assignments: {
          where: { date: today },
          include: {
            room: { select: { id: true, name: true } },
            doctor: { select: STAFF_SELECT },
            nurses: { include: { nurse: { select: STAFF_SELECT } } },
          },
        },
      },
    });

    const active: ResolvedAssignment[] = [];

    for (const shift of shifts) {
      if (!isActiveShift(shift.startHour, shift.endHour, now, shift.startMinute, shift.endMinute)) continue;

      for (const sr of shift.rooms) {
        const override = shift.assignments.find((a) => a.roomId === sr.roomId);
        if (override) {
          const isMe = override.doctorId === userId || override.nurses.some((n) => n.nurseId === userId);
          if (isMe) {
            active.push({
              roomShiftId: shift.id,
              roomShift: shift,
              roomId: sr.roomId,
              room: sr.room,
              doctorId: override.doctorId,
              doctor: override.doctor,
              nurses: override.nurses,
              date: override.date,
              isOverride: true,
              assignmentId: override.id,
            });
          }
          continue;
        }
      }
    }
    return active;
  }

  // ── My upcoming shifts ─────────────────────────────────────────────────────

  async getMyShifts(userId: string) {
    const today = clinicDayUTC();
    const weekLater = new Date(today.getTime() + 7 * 86400000);

    const overrides = await this.prisma.shiftAssignment.findMany({
      where: {
        date: { gte: today, lte: weekLater },
        OR: [{ doctorId: userId }, { nurses: { some: { nurseId: userId } } }],
      },
      include: {
        roomShift: true,
        room: { select: { id: true, name: true } },
        doctor: { select: STAFF_SELECT },
        nurses: { include: { nurse: { select: STAFF_SELECT } } },
      },
    });

    return { overrides };
  }

  // ── Get or create concrete assignment ─────────────────────────────────────

  async getOrCreateAssignmentForShift(roomShiftId: string, roomId: string, userId: string): Promise<{ id: string }> {
    const now = new Date();
    const today = clinicDayUTC(now);

    const existing = await this.prisma.shiftAssignment.findUnique({
      where: { roomShiftId_roomId_date: { roomShiftId, roomId, date: today } },
      select: { id: true },
    });
    if (existing) return { id: existing.id };

    const shift = await this.prisma.roomShift.findUnique({
      where: { id: roomShiftId },
      include: { defaultNurses: true },
    });

    if (!shift) throw new BadRequestException("Smena topilmadi");
    throw new BadRequestException("Bu sana uchun shifokor tayinlanmagan. /shift-assignments/bulk orqali tayinlang");
  }

  // ── Bulk assign: shifokorni bir nechta kunga tayinlash ────────────────────

  async bulkAssign(dto: BulkAssignDto) {
    const shift = await this.prisma.roomShift.findUnique({
      where: { id: dto.roomShiftId },
      include: { rooms: { where: { roomId: dto.roomId } }, defaultNurses: true },
    });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    if (!shift.rooms.length) throw new BadRequestException("Bu xona bu smenaga biriktirilmagan");

    const include = {
      roomShift: true,
      room: { select: { id: true, name: true } },
      doctor: { select: STAFF_SELECT },
      nurses: { include: { nurse: { select: STAFF_SELECT } } },
    };

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const dateStr of dto.dates) {
        const date = clinicDayUTC(dateStr);
        const existing = await tx.shiftAssignment.findUnique({
          where: { roomShiftId_roomId_date: { roomShiftId: dto.roomShiftId, roomId: dto.roomId, date } },
          select: { id: true },
        });
        if (existing) {
          await tx.shiftNurse.deleteMany({ where: { shiftAssignmentId: existing.id } });
        }
        const a = await tx.shiftAssignment.upsert({
          where: { roomShiftId_roomId_date: { roomShiftId: dto.roomShiftId, roomId: dto.roomId, date } },
          create: {
            roomShiftId: dto.roomShiftId,
            roomId: dto.roomId,
            date,
            doctorId: dto.doctorId,
            isOverride: false,
            nurses: shift.defaultNurses.length
              ? { create: shift.defaultNurses.map((n) => ({ nurseId: n.nurseId })) }
              : undefined,
          },
          update: { doctorId: dto.doctorId },
          include,
        });
        results.push(a);
      }
      return results;
    });
  }

  // ── Swap: ikki shifokor smenalarini almashtirish ───────────────────────────

  async createSwap(dto: CreateSwapDto, requestedById: string) {
    const [a, b] = await Promise.all([
      this.prisma.shiftAssignment.findUnique({
        where: { id: dto.fromAssignmentId },
        include: { roomShift: true, doctor: { select: STAFF_SELECT } },
      }),
      this.prisma.shiftAssignment.findUnique({
        where: { id: dto.toAssignmentId },
        include: { roomShift: true, doctor: { select: STAFF_SELECT } },
      }),
    ]);

    if (!a) throw new NotFoundException(`Assignment topilmadi: ${dto.fromAssignmentId}`);
    if (!b) throw new NotFoundException(`Assignment topilmadi: ${dto.toAssignmentId}`);

    return this.prisma.$transaction(async (tx) => {
      // Doktorlarni almashtiramiz
      await tx.shiftAssignment.update({
        where: { id: a.id },
        data: {
          doctorId: b.doctorId,
          overrideType: ShiftOverrideType.SWAP,
          swappedWithId: b.id,
          isOverride: true,
          requestedById,
          reason: dto.reason,
        },
      });
      await tx.shiftAssignment.update({
        where: { id: b.id },
        data: {
          doctorId: a.doctorId,
          overrideType: ShiftOverrideType.SWAP,
          swappedWithId: a.id,
          isOverride: true,
          requestedById,
          reason: dto.reason,
        },
      });

      // Audit log
      await tx.shiftChangeEvent.createMany({
        data: [
          {
            eventType: "FULL_TRANSFER",
            shiftAssignmentId: a.id,
            roomShiftId: a.roomShiftId,
            fromDoctorId: a.doctorId,
            toDoctorId: b.doctorId,
            requestedById,
            date: a.date,
            reason: dto.reason,
          },
          {
            eventType: "FULL_TRANSFER",
            shiftAssignmentId: b.id,
            roomShiftId: b.roomShiftId,
            fromDoctorId: b.doctorId,
            toDoctorId: a.doctorId,
            requestedById,
            date: b.date,
            reason: dto.reason,
          },
        ],
      });

      // Bildirishnomalar
      await tx.shiftNotification.createMany({
        data: [
          {
            userId: b.doctorId,
            type: "SHIFT_CHANGED",
            payload: {
              message: "Sizning smenangiz almashtirildi",
              shiftName: a.roomShift.name,
              date: a.date,
              withDoctorId: a.doctorId,
            },
          },
          {
            userId: a.doctorId,
            type: "SHIFT_CHANGED",
            payload: {
              message: "Sizning smenangiz almashtirildi",
              shiftName: b.roomShift.name,
              date: b.date,
              withDoctorId: b.doctorId,
            },
          },
        ],
      });

      return { success: true, swapped: [a.id, b.id] };
    });
  }

  // ── Partial transfer: smena vaqtining bir qismini boshqa shifokorga o'tkazish

  async createPartialTransfer(dto: PartialTransferDto, requestedById: string) {
    if (dto.windowStart >= dto.windowEnd) {
      throw new BadRequestException("windowStart < windowEnd bo'lishi kerak");
    }

    const parent = await this.prisma.shiftAssignment.findUnique({
      where: { id: dto.assignmentId },
      include: { roomShift: true },
    });
    if (!parent) throw new NotFoundException("Assignment topilmadi");

    const toDoctor = await this.prisma.user.findUnique({
      where: { id: dto.toDoctorId },
      select: STAFF_SELECT,
    });
    if (!toDoctor) throw new NotFoundException("Shifokor topilmadi");

    return this.prisma.$transaction(async (tx) => {
      const child = await tx.shiftAssignment.create({
        data: {
          roomShiftId: parent.roomShiftId,
          roomId: parent.roomId,
          date: parent.date,
          doctorId: dto.toDoctorId,
          isOverride: true,
          overrideType: ShiftOverrideType.PARTIAL_TRANSFER,
          overrideStart: dto.windowStart,
          overrideEnd: dto.windowEnd,
          parentAssignmentId: parent.id,
          requestedById,
          reason: dto.reason,
        },
      });

      await tx.shiftChangeEvent.create({
        data: {
          eventType: "PARTIAL_TRANSFER",
          shiftAssignmentId: parent.id,
          roomShiftId: parent.roomShiftId,
          fromDoctorId: parent.doctorId,
          toDoctorId: dto.toDoctorId,
          requestedById,
          date: parent.date,
          windowStart: dto.windowStart,
          windowEnd: dto.windowEnd,
          reason: dto.reason,
        },
      });

      await tx.shiftNotification.create({
        data: {
          userId: dto.toDoctorId,
          type: "SHIFT_CHANGED",
          payload: {
            message: `Sizga ${dto.windowStart}:00–${dto.windowEnd}:00 smena qismi o'tkazildi`,
            shiftName: parent.roomShift.name,
            date: parent.date,
            windowStart: dto.windowStart,
            windowEnd: dto.windowEnd,
          },
        },
      });

      return child;
    });
  }

  // ── Overtime: smena tugash vaqtini uzaytirish ─────────────────────────────

  async createOvertime(dto: OvertimeDto, requestedById: string) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: dto.assignmentId },
      include: { roomShift: true },
    });
    if (!assignment) throw new NotFoundException("Assignment topilmadi");

    if (dto.newEndHour <= assignment.roomShift.endHour) {
      throw new BadRequestException("Yangi tugash vaqti mavjud vaqtdan kech bo'lishi kerak");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shiftAssignment.update({
        where: { id: dto.assignmentId },
        data: {
          overrideType: ShiftOverrideType.OVERTIME,
          overrideEnd: dto.newEndHour,
          isOverride: true,
          requestedById,
          reason: dto.reason,
        },
        include: { roomShift: true, doctor: { select: STAFF_SELECT } },
      });

      await tx.shiftChangeEvent.create({
        data: {
          eventType: "OVERTIME_ADDED",
          shiftAssignmentId: assignment.id,
          roomShiftId: assignment.roomShiftId,
          fromDoctorId: assignment.doctorId,
          requestedById,
          date: assignment.date,
          windowStart: assignment.roomShift.endHour,
          windowEnd: dto.newEndHour,
          reason: dto.reason,
        },
      });

      await tx.shiftNotification.create({
        data: {
          userId: assignment.doctorId,
          type: "SHIFT_CHANGED",
          payload: {
            message: `Sizning smenangiz ${dto.newEndHour}:00 gacha uzaytirildi`,
            shiftName: assignment.roomShift.name,
            date: assignment.date,
            newEndHour: dto.newEndHour,
          },
        },
      });

      return updated;
    });
  }

  // ── Assignment history (ShiftChangeEvent log) ─────────────────────────────

  async getAssignmentHistory(assignmentId: string) {
    return this.prisma.shiftChangeEvent.findMany({
      where: { shiftAssignmentId: assignmentId },
      include: {
        fromDoctor: { select: STAFF_SELECT },
        toDoctor: { select: STAFF_SELECT },
        requestedBy: { select: STAFF_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

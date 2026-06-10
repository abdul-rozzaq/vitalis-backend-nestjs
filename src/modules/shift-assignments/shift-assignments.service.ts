import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { clinicDayUTC, clinicHour } from "../../common/clinic-time";
import { CreateShiftOverrideDto, ShiftAssignmentsQueryDto } from "./shift-assignments.dto";

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

function isActiveShift(startHour: number, endHour: number, now: Date): boolean {
  const h = clinicHour(now);
  if (startHour < endHour) return h >= startHour && h < endHour;
  return h >= startHour || h < endHour;
}

const STAFF_SELECT = { id: true, first_name: true, last_name: true };

const SHIFT_WITH_STAFF = {
  rooms: { include: { room: { select: { id: true, name: true } } } },
  doctor: { select: STAFF_SELECT },
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
        // Smenaning amal qilish oynasidan tashqari kunlarni o'tkazib yuboramiz
        if (shift.startDate && day < shift.startDate) continue;
        if (shift.endDate && day > shift.endDate) continue;

        for (const sr of shift.rooms) {
          if (query.roomId && sr.roomId !== query.roomId) continue;
          const override = shift.assignments.find(
            (a) => a.roomId === sr.roomId && a.date.getTime() === day.getTime(),
          );
          result.push({
            date: day,
            shift: { id: shift.id, name: shift.name, startHour: shift.startHour, endHour: shift.endHour },
            room: sr.room,
            assignment: override ?? null,
            doctor: override ? override.doctor : shift.doctor,
            nurses: override ? override.nurses : shift.defaultNurses.map((n) => ({ nurseId: n.nurseId, nurse: n.nurse })),
            source: override ? "override" : shift.doctorId ? "default" : "none",
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
            doctor: { select: STAFF_SELECT },
            defaultNurses: { include: { nurse: { select: STAFF_SELECT } } },
            assignments: {
              where: { roomId, date: today },
              include: { doctor: { select: STAFF_SELECT }, nurses: { include: { nurse: { select: STAFF_SELECT } } } },
            },
          },
        },
        room: { select: { id: true, name: true } },
      },
    });

    for (const sr of shiftRooms) {
      const shift = sr.roomShift;
      if (!isActiveShift(shift.startHour, shift.endHour, now)) continue;

      const override = shift.assignments[0];
      if (override) {
        return {
          roomShiftId: shift.id,
          roomShift: shift,
          roomId,
          room: sr.room,
          doctorId: override.doctorId,
          doctor: override.doctor,
          nurses: override.nurses,
          date: override.date,
          isOverride: true,
          assignmentId: override.id,
        };
      }

      if (shift.doctorId && shift.doctor) {
        return {
          roomShiftId: shift.id,
          roomShift: shift,
          roomId,
          room: sr.room,
          doctorId: shift.doctorId,
          doctor: shift.doctor,
          nurses: shift.defaultNurses.map((n) => ({ nurseId: n.nurseId, nurse: n.nurse })),
          date: null,
          isOverride: false,
          assignmentId: null,
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
      if (!isActiveShift(shift.startHour, shift.endHour, now)) continue;

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

        if (shift.doctorId && shift.doctor) {
          const isMe = shift.doctorId === userId || shift.defaultNurses.some((n) => n.nurseId === userId);
          if (isMe) {
            active.push({
              roomShiftId: shift.id,
              roomShift: shift,
              roomId: sr.roomId,
              room: sr.room,
              doctorId: shift.doctorId,
              doctor: shift.doctor,
              nurses: shift.defaultNurses.map((n) => ({ nurseId: n.nurseId, nurse: n.nurse })),
              date: null,
              isOverride: false,
              assignmentId: null,
            });
          }
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

    const defaultShifts = await this.prisma.roomShift.findMany({
      where: {
        OR: [{ doctorId: userId }, { defaultNurses: { some: { nurseId: userId } } }],
      },
      include: SHIFT_WITH_STAFF,
    });

    return { overrides, defaultShifts };
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

    if (!shift || !shift.doctorId) throw new BadRequestException("Smena uchun shifokor biriktirilmagan");

    // upsert — parallel so'rovlarda ikkinchisi mavjud qatorni qaytaradi (update no-op),
    // unique (roomShiftId, roomId, date) buzilmaydi.
    const assignment = await this.prisma.shiftAssignment.upsert({
      where: { roomShiftId_roomId_date: { roomShiftId, roomId, date: today } },
      create: {
        roomShiftId,
        roomId,
        date: today,
        doctorId: shift.doctorId,
        isOverride: false,
        nurses: shift.defaultNurses.length
          ? { create: shift.defaultNurses.map((n) => ({ nurseId: n.nurseId })) }
          : undefined,
      },
      update: {},
      select: { id: true },
    });
    return { id: assignment.id };
  }
}

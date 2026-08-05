import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { clinicDayUTC } from "../../common/clinic-time";
import { RoleName } from "../../common/enums/role-name.enum";
import { ShiftStaffRole, WardStatus } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { planShifts, PlannedShift } from "./shift-generator";
import {
  AssignStaffDto,
  BulkAssignDto,
  CreateShiftDto,
  GenerateShiftsDto,
  MAX_GENERATE_DAYS,
  ShiftsQueryDto,
  ShiftStaffInputDto,
  UpdateShiftDto,
} from "./shifts.dto";

const STAFF_SELECT = { id: true, first_name: true, last_name: true, role: true } as const;

const SHIFT_INCLUDE = {
  department: { select: { id: true, name: true } },
  staff: { include: { user: { select: STAFF_SELECT } } },
  /*
    Davomat — reja bilan bir so'rovda keladi, aks holda board "kim
    biriktirilgan" ni ko'rsatib, "kim haqiqatda keldi" ni ko'rsatmasdi.

    `events` ATAYLAB `take: 1` bilan cheklangan: bizga faqat kirish skanidagi
    yuz rasmi kerak. Cheklovsiz 60 kunlik board javobiga minglab qator qo'shilardi.
  */
  attendanceRecords: {
    select: {
      userId: true,
      checkInAt: true,
      checkOutAt: true,
      lateMinutes: true,
      earlyLeaveMinutes: true,
      workedMinutes: true,
      absentMinutes: true,
      status: true,
      events: {
        where: { rawStatus: "checkIn" },
        select: { picturePath: true },
        orderBy: { eventAt: "asc" },
        take: 1,
      },
    },
  },
} as const;

const DEFAULT_PAGE_SIZE = 200;

type ShiftWithStaff = {
  startAt: Date;
  endAt: Date;
  requiredDoctors: number;
  requiredNurses: number;
  staff: { role: ShiftStaffRole }[];
  attendanceRecords: {
    userId: string;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    workedMinutes: number;
    absentMinutes: number;
    status: string;
    events: { picturePath: string | null }[];
  }[];
};

/**
 * Har bir smenaga reja (`staffing`) va haqiqat (`attendance`) hisobini qo'shadi.
 *
 * `attendance.expected` biriktirilgan xodimlar soni, `arrived` esa kirish skani
 * bo'lganlar. `insideNow` faqat smena davom etayotganda ma'noga ega.
 */
function withStaffing<T extends ShiftWithStaff>(shift: T, now: Date = new Date()) {
  const assignedDoctors = shift.staff.filter((s) => s.role === ShiftStaffRole.DOCTOR).length;
  const assignedNurses = shift.staff.filter((s) => s.role === ShiftStaffRole.NURSE).length;

  const records = shift.attendanceRecords;
  const isRunning = now >= shift.startAt && now < shift.endAt;

  const attendance = {
    expected: shift.staff.length,
    arrived: records.filter((r) => r.checkInAt !== null).length,
    late: records.filter((r) => r.lateMinutes > 0).length,
    absent: records.filter((r) => r.status === "ABSENT").length,
    /** To'liqsiz yozuvlar — operator aralashuvini talab qiladi. */
    incomplete: records.filter(
      (r) => r.status === "MISSING_CHECKIN" || r.status === "MISSING_CHECKOUT",
    ).length,
    insideNow: isRunning
      ? records.filter((r) => r.checkInAt !== null && r.checkOutAt === null).length
      : 0,
    totalLateMinutes: records.reduce((sum, r) => sum + r.lateMinutes, 0),
    totalWorkedMinutes: records.reduce((sum, r) => sum + r.workedMinutes, 0),
    isRunning,
  };

  return {
    ...shift,
    // Ichma-ich `events` massivi o'rniga bitta skalyar — frontend uni join qilmaydi.
    attendanceRecords: records.map(({ events, ...rest }) => ({
      ...rest,
      checkInPicture: events[0]?.picturePath ?? null,
    })),
    staffing: {
      requiredDoctors: shift.requiredDoctors,
      assignedDoctors,
      requiredNurses: shift.requiredNurses,
      assignedNurses,
    },
    attendance,
  };
}

/**
 * Filtr chegarasini klinika mintaqasi bo'yicha talqin qiladi.
 *
 * "2026-09-30" kabi sana-only qiymat `new Date()` da UTC yarim tuni bo'lib qoladi
 * (= Toshkentda 05:00), natijada oxirgi kunning smenalari filtrdan tushib qolardi.
 * Sana-only bo'lsa klinika kunining boshi/oxiri olinadi; to'liq ISO timestamp
 * berilgan bo'lsa o'sha moment aynan ishlatiladi.
 */
function clinicBoundary(value: string, edge: "start" | "end"): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!dateOnly) return new Date(value);
  const day = clinicDayUTC(value);
  // Klinika kunining boshi = UTC 19:00 (oldingi kun), oxiri = +24 soat
  const startOfClinicDay = new Date(day.getTime() - 5 * 3_600_000);
  return edge === "start" ? startOfClinicDay : new Date(startOfClinicDay.getTime() + 86_400_000);
}

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Ro'yxat / kalendar ─────────────────────────────────────────────────────

  async list(query: ShiftsQueryDto) {
    const where: any = {};
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.AND = [];
      if (query.from) where.AND.push({ endAt: { gte: clinicBoundary(query.from, "start") } });
      if (query.to) where.AND.push({ startAt: { lte: clinicBoundary(query.to, "end") } });
    }

    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const page = query.page ?? 1;

    const [shifts, total] = await this.prisma.$transaction([
      this.prisma.shift.findMany({
        where,
        include: SHIFT_INCLUDE,
        orderBy: { startAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shift.count({ where }),
    ]);

    return { data: shifts.map((s) => withStaffing(s)), total, page, limit };
  }

  async retrieve(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id }, include: SHIFT_INCLUDE });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    return withStaffing(shift);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(dto: CreateShiftDto) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (start >= end) throw new BadRequestException("Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak");

    const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId }, select: { id: true } });
    if (!dept) throw new NotFoundException("Bo'lim topilmadi");

    const staff = dto.staff ?? [];
    await this.validateStaff(staff);

    const shift = await this.prisma.shift.create({
      data: {
        departmentId: dto.departmentId,
        startAt: start,
        endAt: end,
        requiredDoctors: dto.requiredDoctors ?? 1,
        requiredNurses: dto.requiredNurses ?? 1,
        note: dto.note,
        staff: staff.length ? { create: staff.map((s) => ({ userId: s.userId, role: s.role })) } : undefined,
      },
      include: SHIFT_INCLUDE,
    });

    return withStaffing(shift);
  }

  async update(id: string, dto: UpdateShiftDto) {
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Smena topilmadi");

    const start = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const end = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    if (start >= end) throw new BadRequestException("Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak");

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId }, select: { id: true } });
      if (!dept) throw new NotFoundException("Bo'lim topilmadi");
    }

    const shift = await this.prisma.shift.update({
      where: { id },
      data: {
        departmentId: dto.departmentId,
        startAt: dto.startAt ? start : undefined,
        endAt: dto.endAt ? end : undefined,
        requiredDoctors: dto.requiredDoctors,
        requiredNurses: dto.requiredNurses,
        note: dto.note,
        status: dto.status,
      },
      include: SHIFT_INCLUDE,
    });

    return withStaffing(shift);
  }

  async delete(id: string) {
    const existing = await this.prisma.shift.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Smena topilmadi");
    await this.prisma.shift.delete({ where: { id } });
    return { message: "Smena o'chirildi" };
  }

  // ── Generatsiya ────────────────────────────────────────────────────────────

  /**
   * Shablonlar asosida davr uchun smenalarni yaratadi.
   * `dryRun` bo'lsa hech narsa yozilmaydi — faqat nima bo'lishi qaytariladi.
   */
  async generate(dto: GenerateShiftsDto) {
    const dept = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
      select: { id: true },
    });
    if (!dept) throw new NotFoundException("Bo'lim topilmadi");

    const fromDay = clinicDayUTC(dto.from);
    const toDay = clinicDayUTC(dto.to);
    if (fromDay > toDay) throw new BadRequestException("Boshlanish sanasi tugash sanasidan keyin bo'lmasligi kerak");

    const dayCount = Math.round((toDay.getTime() - fromDay.getTime()) / 86_400_000) + 1;
    if (dayCount > MAX_GENERATE_DAYS) {
      throw new BadRequestException(`Davr juda uzun: maksimal ${MAX_GENERATE_DAYS} kun`);
    }

    const templates = await this.prisma.shiftTemplate.findMany({
      where: { id: { in: dto.templateIds }, departmentId: dto.departmentId, isActive: true },
    });
    if (templates.length !== dto.templateIds.length) {
      throw new BadRequestException("Ba'zi shablonlar topilmadi yoki boshqa bo'limga tegishli");
    }

    const planned = planShifts(templates, dto.from, dto.to, dto.daysOfWeek);
    if (!planned.length) {
      return { created: 0, skipped: 0, toCreate: [], skippedShifts: [], dryRun: !!dto.dryRun };
    }

    // Mavjud smenalarni BITTA so'rovda olamiz — takrorlanishni aniqlash uchun
    const windowStart = planned[0].startAt;
    const windowEnd = planned.reduce((max, p) => (p.endAt > max ? p.endAt : max), planned[0].endAt);
    const existing = await this.prisma.shift.findMany({
      where: { departmentId: dto.departmentId, startAt: { gte: windowStart }, endAt: { lte: windowEnd } },
      select: { startAt: true, endAt: true },
    });
    const existingKeys = new Set(existing.map((s) => `${s.startAt.getTime()}|${s.endAt.getTime()}`));

    const toCreate: PlannedShift[] = [];
    const skippedShifts: PlannedShift[] = [];
    for (const p of planned) {
      const key = `${p.startAt.getTime()}|${p.endAt.getTime()}`;
      if (existingKeys.has(key)) {
        skippedShifts.push(p);
      } else {
        existingKeys.add(key); // shablonlar orasidagi takrorlanishdan ham himoya
        toCreate.push(p);
      }
    }

    if (dto.dryRun) {
      return {
        created: 0,
        skipped: skippedShifts.length,
        toCreate,
        skippedShifts,
        dryRun: true,
      };
    }

    // `skipDuplicates` + unique constraint = ikki marta bosishdan himoya
    const result = await this.prisma.shift.createMany({
      data: toCreate.map((p) => ({
        departmentId: dto.departmentId,
        startAt: p.startAt,
        endAt: p.endAt,
        requiredDoctors: p.requiredDoctors,
        requiredNurses: p.requiredNurses,
        // Shablon nomi saqlanadi — board kartasi va ommaviy biriktirish
        // matritsasi smenani shu nom bilan ko'rsatadi. `VarChar(500)`,
        // shablon nomi esa `VarChar(64)` — sig'maslik xavfi yo'q.
        note: p.templateName,
      })),
      skipDuplicates: true,
    });

    return {
      created: result.count,
      skipped: planned.length - result.count,
      toCreate,
      skippedShifts,
      dryRun: false,
    };
  }

  // ── Xodim biriktirish ──────────────────────────────────────────────────────

  async assignStaff(id: string, dto: AssignStaffDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      select: { id: true, startAt: true, endAt: true },
    });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    await this.validateStaffRole(dto.userId, dto.role);

    const overlapping = await this.prisma.shiftStaff.findFirst({
      where: {
        userId: dto.userId,
        shift: { id: { not: id }, startAt: { lt: shift.endAt }, endAt: { gt: shift.startAt } },
      },
    });
    if (overlapping) throw new BadRequestException("Xodim bu vaqtda boshqa smenaga biriktirilgan (Overlap)");

    await this.prisma.shiftStaff.upsert({
      where: { shiftId_userId: { shiftId: id, userId: dto.userId } },
      create: { shiftId: id, userId: dto.userId, role: dto.role },
      update: { role: dto.role },
    });

    return this.retrieve(id);
  }

  async unassignStaff(id: string, userId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id }, select: { id: true } });
    if (!shift) throw new NotFoundException("Smena topilmadi");
    await this.prisma.shiftStaff.deleteMany({ where: { shiftId: id, userId } });
    return this.retrieve(id);
  }

  /**
   * Bir nechta smenaga bir nechta xodimni bittada biriktiradi.
   *
   * To'qnashuvlar butun amalni bekor qilmaydi — ular `skipped` ro'yxatida
   * sabab bilan qaytariladi, qolganlari yoziladi.
   */
  async bulkAssign(dto: BulkAssignDto) {
    // 1. Rollarni bir marta tekshiramiz (har biriktirishda emas)
    const uniqueUsers = new Map<string, ShiftStaffRole>();
    for (const s of dto.staff) {
      const prev = uniqueUsers.get(s.userId);
      if (prev && prev !== s.role) {
        throw new BadRequestException("Bir xodim ikki xil rol bilan berilgan");
      }
      uniqueUsers.set(s.userId, s.role);
    }
    await this.validateStaffRoles([...uniqueUsers].map(([userId, role]) => ({ userId, role })));

    // 2. Smenalar
    const shifts = await this.prisma.shift.findMany({
      where: { id: { in: dto.shiftIds } },
      select: { id: true, startAt: true, endAt: true },
    });
    if (shifts.length !== dto.shiftIds.length) {
      throw new BadRequestException("Ba'zi smenalar topilmadi");
    }

    // 3. Xodimlarning shu oynadagi MAVJUD biriktirishlari — bitta so'rovda
    const windowStart = shifts.reduce((min, s) => (s.startAt < min ? s.startAt : min), shifts[0].startAt);
    const windowEnd = shifts.reduce((max, s) => (s.endAt > max ? s.endAt : max), shifts[0].endAt);
    const existing = await this.prisma.shiftStaff.findMany({
      where: {
        userId: { in: [...uniqueUsers.keys()] },
        shift: { startAt: { lt: windowEnd }, endAt: { gt: windowStart } },
      },
      select: { userId: true, shiftId: true, shift: { select: { startAt: true, endAt: true } } },
    });

    // userId -> band intervallar
    const busy = new Map<string, { shiftId: string; startAt: Date; endAt: Date }[]>();
    for (const e of existing) {
      const list = busy.get(e.userId) ?? [];
      list.push({ shiftId: e.shiftId, startAt: e.shift.startAt, endAt: e.shift.endAt });
      busy.set(e.userId, list);
    }

    // 4. To'qnashuvlarni xotirada hisoblaymiz
    const toCreate: { shiftId: string; userId: string; role: ShiftStaffRole }[] = [];
    const skipped: { shiftId: string; userId: string; reason: string }[] = [];

    for (const shift of shifts) {
      for (const [userId, role] of uniqueUsers) {
        const intervals = busy.get(userId) ?? [];
        const alreadyHere = intervals.some((i) => i.shiftId === shift.id);
        if (alreadyHere) {
          skipped.push({ shiftId: shift.id, userId, reason: "Allaqachon biriktirilgan" });
          continue;
        }
        const conflict = intervals.some((i) => i.startAt < shift.endAt && i.endAt > shift.startAt);
        if (conflict) {
          skipped.push({ shiftId: shift.id, userId, reason: "Boshqa smena bilan to'qnashadi" });
          continue;
        }
        toCreate.push({ shiftId: shift.id, userId, role });
        // Shu partiya ichidagi keyingi smenalar bilan to'qnashuvni ham hisobga olamiz
        intervals.push({ shiftId: shift.id, startAt: shift.startAt, endAt: shift.endAt });
        busy.set(userId, intervals);
      }
    }

    if (dto.dryRun) {
      return { assigned: 0, skipped, toCreate, dryRun: true };
    }

    const result = await this.prisma.shiftStaff.createMany({ data: toCreate, skipDuplicates: true });
    return { assigned: result.count, skipped, toCreate, dryRun: false };
  }

  // ── Xodim uchun (duty ekrani) ──────────────────────────────────────────────

  async getMyActive(userId: string) {
    const now = new Date();
    const shifts = await this.prisma.shift.findMany({
      where: { startAt: { lte: now }, endAt: { gte: now }, staff: { some: { userId } } },
      include: SHIFT_INCLUDE,
      orderBy: { startAt: "asc" },
    });
    return shifts.map((s) => withStaffing(s));
  }

  async getMyUpcoming(userId: string) {
    const now = new Date();
    const shifts = await this.prisma.shift.findMany({
      where: { endAt: { gte: now }, staff: { some: { userId } } },
      include: SHIFT_INCLUDE,
      orderBy: { startAt: "asc" },
      take: 50,
    });
    return shifts.map((s) => withStaffing(s));
  }

  // ── Smena bo'limi bo'yicha xonalar + bemorlar (board) ──────────────────────

  async getBoard(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id }, select: { departmentId: true } });
    if (!shift) throw new NotFoundException("Smena topilmadi");

    const rooms = await this.prisma.room.findMany({
      where: { departmentId: shift.departmentId },
      select: { id: true, name: true, floor: true, capacity: true },
      orderBy: { name: "asc" },
    });
    const roomIds = rooms.map((r) => r.id);

    const wards = roomIds.length
      ? await this.prisma.wards.findMany({
          where: { roomId: { in: roomIds }, status: WardStatus.OCCUPIED },
          include: { patient: { select: { id: true, first_name: true, last_name: true } } },
          orderBy: { checkIn: "asc" },
        })
      : [];

    const byRoom = new Map<string, typeof wards>();
    for (const w of wards) {
      const list = byRoom.get(w.roomId) ?? [];
      list.push(w);
      byRoom.set(w.roomId, list);
    }

    return rooms.map((room) => ({
      ...room,
      patients: (byRoom.get(room.id) ?? []).map((w) => ({
        wardId: w.id,
        checkIn: w.checkIn,
        daysStayed: w.daysStayed,
        status: w.status,
        patient: w.patient,
      })),
    }));
  }

  // ── Navbat tekshiruvi (wards check-in/out gate) ────────────────────────────

  async assertUserOnDutyForRoom(userId: string, roomId: string): Promise<void> {
    const now = new Date();
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { departmentId: true } });
    if (!room?.departmentId) throw new ForbiddenException("Bu xona bo'limga biriktirilmagan");

    const activeShifts = await this.prisma.shift.findMany({
      where: { departmentId: room.departmentId, startAt: { lte: now }, endAt: { gte: now } },
      select: { staff: { select: { userId: true } } },
    });
    if (!activeShifts.length) throw new ForbiddenException("Hozir bu bo'limda faol smena yo'q");

    const onDuty = activeShifts.some((s) => s.staff.some((st) => st.userId === userId));
    if (!onDuty) throw new ForbiddenException("Siz hozir bu bo'limda navbatda emassiz");
  }

  // ── Yordamchilar ───────────────────────────────────────────────────────────

  private async validateStaff(staff: ShiftStaffInputDto[]) {
    const seen = new Set<string>();
    for (const s of staff) {
      if (seen.has(s.userId)) throw new BadRequestException("Bir xodim ikki marta biriktirilgan");
      seen.add(s.userId);
    }
    await this.validateStaffRoles(staff);
  }

  private async validateStaffRole(userId: string, role: ShiftStaffRole) {
    await this.validateStaffRoles([{ userId, role }]);
  }

  /** Bir so'rovda barcha xodimlarni tekshiradi (N+1 emas). */
  private async validateStaffRoles(staff: { userId: string; role: ShiftStaffRole }[]) {
    if (!staff.length) return;
    const users = await this.prisma.user.findMany({
      where: { id: { in: staff.map((s) => s.userId) } },
      select: { id: true, role: true },
    });
    const byId = new Map(users.map((u) => [u.id, u.role]));

    for (const s of staff) {
      const userRole = byId.get(s.userId);
      if (!userRole) throw new NotFoundException("Xodim topilmadi");
      if (s.role === ShiftStaffRole.DOCTOR && userRole !== RoleName.DOCTOR) {
        throw new BadRequestException("Tanlangan xodim shifokor emas");
      }
      if (s.role === ShiftStaffRole.NURSE && userRole !== RoleName.HAMSHIRA) {
        throw new BadRequestException("Tanlangan xodim hamshira emas");
      }
    }
  }
}

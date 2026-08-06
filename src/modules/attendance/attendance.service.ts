import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CLINIC_TZ } from '../../common/clinic-time';
import { ShiftStaffRole } from '../../generated/prisma/client';
import {
  AttendanceEventStatus,
  AttendanceRecordStatus,
} from '../../generated/prisma/enums';
import {
  AdjustAttendanceRecordDto,
  AttendanceEventsQueryDto,
  AttendanceRecordsQueryDto,
  HikvisionEventDto,
  PatchAttendanceRecordDto,
} from './attendance.dto';
import {
  addMinutes,
  computeAttendance,
  FINALIZE_BUFFER_MIN,
  MATCH_WINDOW_MIN,
  pickShiftForEvent,
  subMinutes,
} from './attendance-calc';

/** Shift tugagandan keyingi buffer (ABSENT belgilash uchun) */
const ABSENT_BUFFER_MIN = FINALIZE_BUFFER_MIN;

/**
 * Cron qancha orqaga qaraydi (2 kun). Cron har kecha ishlagani uchun 1 kun
 * yetarli, 2 kun esa bir marta o'tkazib yuborilgan ishga zaxira beradi.
 */
const ABSENT_LOOKBACK_MIN = 2 * 24 * 60;

/**
 * `NO_SHIFT` skani uchun smena taklif qilishda qaraladigan oyna.
 * `MATCH_WINDOW_MIN` dan kengroq — operator ko'rib qaror qiladi, avtomatik
 * biriktirish bo'lmaydi.
 */
const SUGGEST_WINDOW_MIN = 6 * 60;

/** `$transaction` callback'i beradigan Prisma klienti. */
type PrismaTx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/** Guruhlashdan oldin olinadigan xom skanlar chegarasi. */
const UNRESOLVED_SCAN_LIMIT = 500;

/** Navbatdagi bitta guruh ichida ko'rsatiladigan maksimal skan vaqti. */
const SCAN_SAMPLE_LIMIT = 10;

interface ScanRow {
  id: string;
  eventAt: Date;
  rawStatus: string;
  picturePath: string | null;
}

/**
 * Bir xil muammoli skanlarni bitta yozuvga yig'adi.
 *
 * `latestEventId` — amal shu event ustidan bajariladi; qolganlari yechim
 * qo'llanganda birga qayta ishlanadi.
 */
function groupScans<T extends ScanRow, E>(
  rows: T[],
  keyOf: (row: T) => string,
  extra: (key: string, group: T[]) => E,
) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()].map(([key, group]) => {
    // `orderBy: eventAt desc` saqlanadi — [0] eng oxirgi skan.
    const sorted = [...group].sort((a, b) => b.eventAt.getTime() - a.eventAt.getTime());
    return {
      ...extra(key, sorted),
      count: sorted.length,
      latestEventId: sorted[0].id,
      lastAt: sorted[0].eventAt,
      firstAt: sorted[sorted.length - 1].eventAt,
      // Rasmi bor birinchi skan — hamma skan rasm bilan kelavermaydi.
      picturePath: sorted.find((r) => r.picturePath)?.picturePath ?? null,
      scans: sorted.slice(0, SCAN_SAMPLE_LIMIT).map((r) => ({
        id: r.id,
        eventAt: r.eventAt,
        rawStatus: r.rawStatus,
      })),
    };
  });
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Webhook processor ───────────────────────────────────────────────────────

  async processEvent(
    dto: HikvisionEventDto,
    picturePath: string | null,
  ): Promise<void> {
    const { deviceIp, employeeNoStr, eventAt, rawStatus } = dto;

    // 1. Idempotency check — service darajasida (DB darajasida ham @@unique bor)
    const duplicate = await this.prisma.attendanceEvent.findFirst({
      where: { deviceIp, employeeNoStr, eventAt },
    });
    if (duplicate) {
      this.logger.warn(
        `Duplicate event ignored: employee=${employeeNoStr} at=${eventAt.toISOString()}`,
      );
      return;
    }

    // 2. Xom event yoz (audit log)
    const event = await this.prisma.attendanceEvent.create({
      data: {
        deviceIp,
        employeeNoStr,
        eventAt,
        rawStatus,
        picturePath,
        status: AttendanceEventStatus.PENDING,
      },
    });

    // 3. Xodim topish
    const user = await this.prisma.user.findFirst({
      where: { employeeNo: employeeNoStr },
    });
    if (!user) {
      this.logger.warn(`Unknown employee: employeeNo=${employeeNoStr}`);
      await this.prisma.attendanceEvent.update({
        where: { id: event.id },
        data: { status: AttendanceEventStatus.UNKNOWN_EMPLOYEE },
      });
      return;
    }

    // 4. Mos shift topish.
    //    Oyna `MATCH_WINDOW_MIN` (default 90 daq) — grace period EMAS. Aks
    //    holda smenadan oldin kelgan yoki keyin chiqqan xodimning skani
    //    hech qaysi smenaga tushmasdi.
    const candidates = await this.prisma.shiftStaff.findMany({
      where: {
        userId: user.id,
        shift: {
          startAt: { lte: addMinutes(eventAt, MATCH_WINDOW_MIN) },
          endAt: { gte: subMinutes(eventAt, MATCH_WINDOW_MIN) },
        },
      },
      include: { shift: true },
    });

    // Ketma-ket smenalarda bitta skan ikkalasiga ham mos keladi — eng yaqinini
    // tanlaymiz, `checkIn` uchun boshlanishiga, `checkOut` uchun tugashiga qarab.
    const bestShift = pickShiftForEvent(
      candidates.map((c) => c.shift),
      eventAt,
      rawStatus,
    );

    if (!bestShift) {
      this.logger.warn(
        `No matching shift for userId=${user.id} at=${eventAt.toISOString()}`,
      );
      await this.prisma.attendanceEvent.update({
        where: { id: event.id },
        data: { userId: user.id, status: AttendanceEventStatus.NO_SHIFT },
      });
      return;
    }

    const shift = bestShift;

    // 5. AttendanceRecord upsert + qayta hisoblash ($transaction ichida)
    await this.prisma.$transaction(async (tx) => {
      const record = await tx.attendanceRecord.upsert({
        where: { userId_shiftId: { userId: user.id, shiftId: shift.id } },
        create: { userId: user.id, shiftId: shift.id },
        update: {},
      });

      // Event avval record'ga bog'lanadi, keyin xulosa BARCHA eventlardan
      // qayta hisoblanadi. Ilgari faqat oxirgi skan ko'rib chiqilardi va
      // takroriy `checkIn` da funksiya erta chiqib ketardi — natijada smena
      // o'rtasida chiqib qaytish umuman qayd etilmasdi.
      await tx.attendanceEvent.update({
        where: { id: event.id },
        data: {
          userId: user.id,
          recordId: record.id,
          status: AttendanceEventStatus.MATCHED,
        },
      });

      const events = await tx.attendanceEvent.findMany({
        where: { recordId: record.id },
        select: { eventAt: true, rawStatus: true },
      });

      const computed = computeAttendance(shift.startAt, shift.endAt, events);

      await tx.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkInAt: computed.checkInAt,
          checkOutAt: computed.checkOutAt,
          lateMinutes: computed.lateMinutes,
          earlyLeaveMinutes: computed.earlyLeaveMinutes,
          workedMinutes: computed.workedMinutes,
          absentMinutes: computed.absentMinutes,
          status: computed.status,
        },
      });
    });

    this.logger.log(
      `Event processed: userId=${user.id} shiftId=${shift.id} status=${rawStatus}`,
    );
  }

  // ── Nightly ABSENT cron ─────────────────────────────────────────────────────

  /**
   * Har kecha 01:00 Asia/Tashkent — tugagan smenalarni YAKUNLAYDI:
   *   1. skani umuman bo'lmagan xodimlar → ABSENT
   *   2. mavjud yozuvlar qayta hisoblanadi → chiqish skani yo'qligi endi
   *      jimgina PRESENT emas, MISSING_CHECKOUT bo'lib ko'rinadi
   */
  @Cron('0 1 * * *', { timeZone: CLINIC_TZ })
  async markAbsentForCompletedShifts(): Promise<void> {
    this.logger.log('Running attendance finalization cron...');

    const now = new Date();
    const buffer = addMinutes(now, -ABSENT_BUFFER_MIN);

    // Tugagan shiftslar (endAt + buffer o'tgan).
    // Quyi chegara MUHIM: usiz cron har kecha butun tarixni qayta skanlaydi.
    const lookbackStart = addMinutes(now, -ABSENT_LOOKBACK_MIN);
    const completedShifts = await this.prisma.shift.findMany({
      where: { endAt: { gte: lookbackStart, lte: buffer } },
      include: {
        staff: { select: { userId: true } },
        attendanceRecords: {
          select: {
            id: true,
            userId: true,
            events: { select: { eventAt: true, rawStatus: true } },
          },
        },
      },
    });

    let absentCount = 0;
    let finalizedCount = 0;

    for (const shift of completedShifts) {
      // 1. Yozuvi yo'q xodimlar — ABSENT
      const recordedUserIds = new Set(shift.attendanceRecords.map((r) => r.userId));
      const missingUsers = shift.staff.filter((a) => !recordedUserIds.has(a.userId));

      for (const { userId } of missingUsers) {
        try {
          await this.prisma.attendanceRecord.upsert({
            where: { userId_shiftId: { userId, shiftId: shift.id } },
            create: {
              userId,
              shiftId: shift.id,
              status: AttendanceRecordStatus.ABSENT,
              absentMinutes: Math.max(
                0,
                Math.round((shift.endAt.getTime() - shift.startAt.getTime()) / 60_000),
              ),
            },
            update: {
              // Allaqachon yozilgan bo'lsa tegmaymiz — quyidagi yakunlash bosqichi
              // uni baribir qayta hisoblaydi.
            },
          });
          absentCount++;
        } catch (err: any) {
          this.logger.error(
            `Failed to mark absent: userId=${userId} shiftId=${shift.id}: ${err.message}`,
          );
        }
      }

      // 2. Mavjud yozuvlarni yakuniy holatga keltirish
      for (const record of shift.attendanceRecords) {
        try {
          const computed = computeAttendance(
            shift.startAt,
            shift.endAt,
            record.events,
            now,
          );
          await this.prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
              checkInAt: computed.checkInAt,
              checkOutAt: computed.checkOutAt,
              lateMinutes: computed.lateMinutes,
              earlyLeaveMinutes: computed.earlyLeaveMinutes,
              workedMinutes: computed.workedMinutes,
              absentMinutes: computed.absentMinutes,
              status: computed.status,
            },
          });
          finalizedCount++;
        } catch (err: any) {
          this.logger.error(
            `Failed to finalize record=${record.id}: ${err.message}`,
          );
        }
      }
    }

    this.logger.log(
      `Attendance finalization completed: ${absentCount} absent, ${finalizedCount} finalized.`,
    );
  }

  // ── Admin API ───────────────────────────────────────────────────────────────

  async listRecords(query: AttendanceRecordsQueryDto) {
    const where: any = {};

    if (query.userId) where.userId = query.userId;
    if (query.shiftId) where.shiftId = query.shiftId;
    if (query.status) where.status = query.status;

    // Sana filtr
    if (query.date) {
      const dayStart = new Date(`${query.date}T00:00:00+05:00`);
      const dayEnd = new Date(`${query.date}T23:59:59+05:00`);
      where.shift = {
        startAt: { lte: dayEnd },
        endAt: { gte: dayStart },
      };
    } else if (query.from || query.to) {
      where.shift = { AND: [] };
      if (query.from) {
        where.shift.AND.push({ endAt: { gte: new Date(`${query.from}T00:00:00+05:00`) } });
      }
      if (query.to) {
        where.shift.AND.push({ startAt: { lte: new Date(`${query.to}T23:59:59+05:00`) } });
      }
    }

    return this.prisma.attendanceRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true,
            employeeNo: true,
          },
        },
        shift: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
            department: { select: { id: true, name: true } },
          },
        },
        events: {
          select: { id: true, rawStatus: true, eventAt: true, status: true },
          orderBy: { eventAt: 'asc' },
        },
      },
      orderBy: [
        { shift: { startAt: 'desc' } },
        { user: { last_name: 'asc' } },
      ],
    });
  }

  async getRecord(id: string) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true,
            employeeNo: true,
          },
        },
        shift: {
          include: {
            department: { select: { id: true, name: true } },
          },
        },
        events: { orderBy: { eventAt: 'asc' } },
        adjustments: {
          include: {
            user: { select: { id: true, first_name: true, last_name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!record) throw new NotFoundException('Davomat yozuvi topilmadi');
    return record;
  }

  async patchRecord(id: string, dto: PatchAttendanceRecordDto) {
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Davomat yozuvi topilmadi');

    return this.prisma.attendanceRecord.update({
      where: { id },
      data: { note: dto.note },
    });
  }

  async listEvents(query: AttendanceEventsQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.eventAt = {};
      if (query.from) where.eventAt.gte = new Date(`${query.from}T00:00:00+05:00`);
      if (query.to) where.eventAt.lte = new Date(`${query.to}T23:59:59+05:00`);
    }
    return this.prisma.attendanceEvent.findMany({
      where,
      include: {
        user: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { eventAt: 'desc' },
      take: 200,
    });
  }

  // ── Istisnolar navbati ──────────────────────────────────────────────────────

  /**
   * Hal qilinmagan holatlar — ilgari bular faqat log'ga tushib yo'qolardi.
   *
   *   UNKNOWN_EMPLOYEE — terminal ID hech qaysi xodimga bog'lanmagan
   *   NO_SHIFT         — xodim tanildi, lekin o'sha vaqtda smenasi topilmadi
   *   MISSING_*        — kirish yoki chiqish skani yo'q yakunlangan yozuv
   */
  async listUnresolved() {
    const [events, records, unlinkedStaff] = await Promise.all([
      this.prisma.attendanceEvent.findMany({
        where: {
          status: {
            in: [
              AttendanceEventStatus.UNKNOWN_EMPLOYEE,
              AttendanceEventStatus.NO_SHIFT,
            ],
          },
        },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, role: true } },
        },
        orderBy: { eventAt: 'desc' },
        // Guruhlashdan OLDINGI xom chegara — bitta terminal ID o'nlab marta
        // skanerlagan bo'lishi mumkin, shuning uchun keng olamiz.
        take: UNRESOLVED_SCAN_LIMIT,
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          status: {
            in: [
              AttendanceRecordStatus.MISSING_CHECKIN,
              AttendanceRecordStatus.MISSING_CHECKOUT,
            ],
          },
        },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, role: true } },
          shift: {
            select: {
              id: true,
              startAt: true,
              endAt: true,
              note: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { shift: { startAt: 'desc' } },
        take: 100,
      }),
      // Face ID bog'lanmagan tibbiyot xodimlari — jimgina ishlamay qolish manbayi
      this.prisma.user.findMany({
        where: { employeeNo: null, role: { in: ['DOCTOR', 'HAMSHIRA'] } },
        select: { id: true, first_name: true, last_name: true, role: true },
        orderBy: { last_name: 'asc' },
      }),
    ]);

    const unknownRaw = events.filter(
      (e) => e.status === AttendanceEventStatus.UNKNOWN_EMPLOYEE,
    );
    const noShiftRaw = events.filter((e) => e.status === AttendanceEventStatus.NO_SHIFT);

    // NO_SHIFT eventlari uchun eng yaqin smenani taklif qilamiz — operator
    // "qaysi smenaga tegishli edi" degan savolni o'zi qidirmasligi uchun.
    const suggestions = await this.suggestShiftsFor(noShiftRaw);

    /*
      Skanlar GURUHLANADI, chunki bitta muammo bitta qator bo'lishi kerak:
      terminal ID 12 marta skanerlangan bo'lsa, operator uchun bu 12 ta
      alohida ish emas — bitta bog'lanmagan ID.

        UNKNOWN_EMPLOYEE → terminal ID bo'yicha
        NO_SHIFT         → xodim + taklif qilingan smena bo'yicha
                           (bir xodimning turli kunlardagi skanlari aralashmaydi)
    */
    const unknownEmployees = groupScans(
      unknownRaw,
      (e) => e.employeeNoStr,
      (key, group) => ({
        key: `unknown:${key}`,
        employeeNoStr: key,
        deviceIp: group[0].deviceIp,
      }),
    );

    const noShift = groupScans(
      noShiftRaw,
      (e) => `${e.userId ?? 'anon'}|${(suggestions.get(e.id) as { id?: string })?.id ?? 'none'}`,
      (key, group) => ({
        key: `noshift:${key}`,
        employeeNoStr: group[0].employeeNoStr,
        user: group[0].user,
        suggestedShift: suggestions.get(group[0].id) ?? null,
      }),
    );

    return {
      unknownEmployees,
      noShift,
      records,
      unlinkedStaff,
      totals: {
        // Hisoblagich GURUHLAR sonini ko'rsatadi — hal qilinishi kerak bo'lgan
        // ishlar soni, skanlar soni emas.
        unknownEmployees: unknownEmployees.length,
        noShift: noShift.length,
        records: records.length,
        unlinkedStaff: unlinkedStaff.length,
      },
    };
  }

  /** Har bir `NO_SHIFT` eventi uchun xodimning eng yaqin smenasini topadi. */
  private async suggestShiftsFor(
    events: { id: string; userId: string | null; eventAt: Date; rawStatus: string }[],
  ) {
    const result = new Map<string, unknown>();
    const withUser = events.filter((e) => e.userId);
    if (!withUser.length) return result;

    for (const event of withUser) {
      const nearby = await this.prisma.shift.findMany({
        where: {
          startAt: { lte: addMinutes(event.eventAt, SUGGEST_WINDOW_MIN) },
          endAt: { gte: subMinutes(event.eventAt, SUGGEST_WINDOW_MIN) },
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          note: true,
          department: { select: { id: true, name: true } },
        },
      });

      const best = pickShiftForEvent(nearby, event.eventAt, event.rawStatus);
      if (best) result.set(event.id, best);
    }

    return result;
  }

  /**
   * Terminal ID ni xodimga bog'laydi va shu ID bilan kelgan barcha
   * `UNKNOWN_EMPLOYEE` eventlarni qayta ishlaydi.
   */
  async linkEmployeeNo(eventId: string, userId: string) {
    const event = await this.prisma.attendanceEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Hodisa topilmadi');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, employeeNo: true },
    });
    if (!user) throw new NotFoundException('Xodim topilmadi');

    const taken = await this.prisma.user.findFirst({
      where: { employeeNo: event.employeeNoStr, NOT: { id: userId } },
      select: { id: true, first_name: true, last_name: true },
    });
    if (taken) {
      throw new BadRequestException(
        `Bu terminal ID allaqachon ${taken.first_name} ${taken.last_name} ga bog'langan`,
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { employeeNo: event.employeeNoStr },
    });

    // Shu ID bilan kelgan barcha hal qilinmagan skanlar endi mos keladi.
    const pending = await this.prisma.attendanceEvent.findMany({
      where: {
        employeeNoStr: event.employeeNoStr,
        status: AttendanceEventStatus.UNKNOWN_EMPLOYEE,
      },
      select: { id: true },
    });

    let reprocessed = 0;
    for (const { id } of pending) {
      if (await this.reprocessEvent(id)) reprocessed++;
    }

    return { linked: true, employeeNo: event.employeeNoStr, reprocessed };
  }

  /**
   * `NO_SHIFT` eventini smenaga bog'laydi: kerak bo'lsa xodimni smenaga
   * biriktiradi, keyin skanni qayta ishlaydi.
   */
  async resolveEventToShift(eventId: string, shiftId: string) {
    const event = await this.prisma.attendanceEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Hodisa topilmadi');
    if (!event.userId) {
      throw new BadRequestException('Avval terminal ID ni xodimga bog\'lang');
    }

    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true },
    });
    if (!shift) throw new NotFoundException('Smena topilmadi');

    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
      select: { role: true },
    });
    const role = user?.role === 'DOCTOR' ? ShiftStaffRole.DOCTOR : ShiftStaffRole.NURSE;

    await this.prisma.shiftStaff.upsert({
      where: { shiftId_userId: { shiftId, userId: event.userId } },
      create: { shiftId, userId: event.userId, role },
      update: {},
    });

    /*
      Bitta skan emas, SHU SMENAGA tegishli bo'lishi mumkin bo'lgan barcha
      hal qilinmagan skanlar qayta ishlanadi. Xodim kirish va chiqishda
      skanerlagan bo'lsa (yoki bir necha marta) — hammasi bir amalda hal
      bo'ladi, operator har birini alohida bosmaydi.
    */
    const shiftBounds = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      select: { startAt: true, endAt: true },
    });

    const siblings = await this.prisma.attendanceEvent.findMany({
      where: {
        userId: event.userId,
        status: AttendanceEventStatus.NO_SHIFT,
        ...(shiftBounds && {
          eventAt: {
            gte: subMinutes(shiftBounds.startAt, MATCH_WINDOW_MIN),
            lte: addMinutes(shiftBounds.endAt, MATCH_WINDOW_MIN),
          },
        }),
      },
      select: { id: true },
    });

    let matched = 0;
    for (const { id } of siblings) {
      if (await this.reprocessEvent(id)) matched++;
    }

    return { assigned: true, matched, total: siblings.length };
  }

  /**
   * Saqlangan eventni qayta ishlaydi — xom yozuv o'zgarmaydi, faqat
   * `userId` / `recordId` / `status` qayta bog'lanadi.
   */
  private async reprocessEvent(eventId: string): Promise<boolean> {
    const event = await this.prisma.attendanceEvent.findUnique({ where: { id: eventId } });
    if (!event) return false;

    const user =
      event.userId !== null
        ? await this.prisma.user.findUnique({ where: { id: event.userId } })
        : await this.prisma.user.findFirst({ where: { employeeNo: event.employeeNoStr } });

    if (!user) return false;

    const candidates = await this.prisma.shiftStaff.findMany({
      where: {
        userId: user.id,
        shift: {
          startAt: { lte: addMinutes(event.eventAt, MATCH_WINDOW_MIN) },
          endAt: { gte: subMinutes(event.eventAt, MATCH_WINDOW_MIN) },
        },
      },
      include: { shift: true },
    });

    const shift = pickShiftForEvent(
      candidates.map((c) => c.shift),
      event.eventAt,
      event.rawStatus,
    );

    if (!shift) {
      await this.prisma.attendanceEvent.update({
        where: { id: event.id },
        data: { userId: user.id, status: AttendanceEventStatus.NO_SHIFT },
      });
      return false;
    }

    await this.prisma.$transaction(async (tx) => {
      const record = await tx.attendanceRecord.upsert({
        where: { userId_shiftId: { userId: user.id, shiftId: shift.id } },
        create: { userId: user.id, shiftId: shift.id },
        update: {},
      });

      await tx.attendanceEvent.update({
        where: { id: event.id },
        data: {
          userId: user.id,
          recordId: record.id,
          status: AttendanceEventStatus.MATCHED,
        },
      });

      await this.recomputeRecord(tx, record.id);
    });

    return true;
  }

  /**
   * Qo'lda tuzatish. Xom `AttendanceEvent` TEGILMAYDI — qiymat
   * `manualCheckInAt` / `manualCheckOutAt` ga yoziladi va har bir
   * o'zgarish `AttendanceAdjustment` da audit izi sifatida qoladi.
   */
  async adjustRecord(id: string, dto: AdjustAttendanceRecordDto, adjustedBy: string) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
      select: { id: true, manualCheckInAt: true, manualCheckOutAt: true },
    });
    if (!record) throw new NotFoundException('Davomat yozuvi topilmadi');

    if (dto.checkInAt === undefined && dto.checkOutAt === undefined) {
      throw new BadRequestException('Hech bo\'lmasa bitta vaqt kiritilishi kerak');
    }

    const changes: {
      field: string;
      oldValue: Date | null;
      newValue: Date | null;
    }[] = [];

    if (dto.checkInAt !== undefined) {
      changes.push({
        field: 'checkInAt',
        oldValue: record.manualCheckInAt,
        newValue: dto.checkInAt ? new Date(dto.checkInAt) : null,
      });
    }
    if (dto.checkOutAt !== undefined) {
      changes.push({
        field: 'checkOutAt',
        oldValue: record.manualCheckOutAt,
        newValue: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.update({
        where: { id },
        data: {
          ...(dto.checkInAt !== undefined && {
            manualCheckInAt: dto.checkInAt ? new Date(dto.checkInAt) : null,
          }),
          ...(dto.checkOutAt !== undefined && {
            manualCheckOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
          }),
          ...(dto.note !== undefined && { note: dto.note }),
        },
      });

      await tx.attendanceAdjustment.createMany({
        data: changes.map((c) => ({
          recordId: id,
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
          reason: dto.reason,
          adjustedBy,
        })),
      });

      await this.recomputeRecord(tx, id);
    });

    return this.getRecord(id);
  }

  /**
   * Yozuvni xom skanlar + qo'lda kiritilgan vaqtlardan qayta hisoblaydi.
   * Idempotent — istalgan payt qayta chaqirilishi mumkin.
   */
  private async recomputeRecord(tx: PrismaTx, recordId: string): Promise<void> {
    const record = await tx.attendanceRecord.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        manualCheckInAt: true,
        manualCheckOutAt: true,
        shift: { select: { startAt: true, endAt: true } },
        events: { select: { eventAt: true, rawStatus: true } },
      },
    });
    if (!record) return;

    const computed = computeAttendance(
      record.shift.startAt,
      record.shift.endAt,
      record.events,
      new Date(),
      {
        manualCheckInAt: record.manualCheckInAt,
        manualCheckOutAt: record.manualCheckOutAt,
      },
    );

    await tx.attendanceRecord.update({
      where: { id: recordId },
      data: {
        checkInAt: computed.checkInAt,
        checkOutAt: computed.checkOutAt,
        lateMinutes: computed.lateMinutes,
        earlyLeaveMinutes: computed.earlyLeaveMinutes,
        workedMinutes: computed.workedMinutes,
        absentMinutes: computed.absentMinutes,
        status: computed.status,
      },
    });
  }

  async getMyRecords(userId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { userId },
      include: {
        shift: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { shift: { startAt: 'desc' } },
      take: 100,
    });
  }
}

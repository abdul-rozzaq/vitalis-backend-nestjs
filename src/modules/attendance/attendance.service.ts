import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CLINIC_TZ } from '../../common/clinic-time';
import {
  AttendanceEventStatus,
  AttendanceRecordStatus,
} from '../../generated/prisma/enums';
import {
  AttendanceEventsQueryDto,
  AttendanceRecordsQueryDto,
  HikvisionEventDto,
  PatchAttendanceRecordDto,
} from './attendance.dto';

/** Grace period minutlari — env'dan olinadi, default 5 */
const GRACE_MIN = parseInt(process.env.ATTENDANCE_GRACE_PERIOD_MIN ?? '5', 10);

/** Shift tugagandan keyingi buffer (ABSENT belgilash uchun) */
const ABSENT_BUFFER_MIN = 30;

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────

function addMinutes(date: Date, min: number): Date {
  return new Date(date.getTime() + min * 60_000);
}

function subMinutes(date: Date, min: number): Date {
  return new Date(date.getTime() - min * 60_000);
}

function diffMinutes(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / 60_000);
}

/**
 * Ikki DateTime'dan kechikish / erta ketish daqiqalari va status hisoblanadi.
 * checkIn/checkOut null bo'lsa mos qiymat hisoblanmaydi.
 */
function computeStatus(
  shiftStart: Date,
  shiftEnd: Date,
  checkInAt: Date | null,
  checkOutAt: Date | null,
): { lateMinutes: number; earlyLeaveMinutes: number; status: AttendanceRecordStatus } {
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;

  if (checkInAt) {
    const threshold = addMinutes(shiftStart, GRACE_MIN);
    if (checkInAt > threshold) {
      lateMinutes = diffMinutes(checkInAt, shiftStart);
    }
  }

  if (checkOutAt) {
    const threshold = subMinutes(shiftEnd, GRACE_MIN);
    if (checkOutAt < threshold) {
      earlyLeaveMinutes = diffMinutes(shiftEnd, checkOutAt);
    }
  }

  let status: AttendanceRecordStatus = AttendanceRecordStatus.PRESENT;
  if (lateMinutes > 0 && earlyLeaveMinutes > 0) {
    status = AttendanceRecordStatus.LATE_AND_EARLY_LEAVE;
  } else if (lateMinutes > 0) {
    status = AttendanceRecordStatus.LATE;
  } else if (earlyLeaveMinutes > 0) {
    status = AttendanceRecordStatus.EARLY_LEAVE;
  }

  return { lateMinutes, earlyLeaveMinutes, status };
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

    // 4. Mos shift topish — deterministik: eng erta boshlanadigan shift
    const shiftAssignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        userId: user.id,
        shift: {
          startAt: { lte: addMinutes(eventAt, GRACE_MIN) },
          endAt: { gte: subMinutes(eventAt, GRACE_MIN) },
        },
      },
      include: { shift: true },
      orderBy: { shift: { startAt: 'asc' } }, // deterministik tanlash
    });

    if (!shiftAssignment) {
      this.logger.warn(
        `No matching shift for userId=${user.id} at=${eventAt.toISOString()}`,
      );
      await this.prisma.attendanceEvent.update({
        where: { id: event.id },
        data: { userId: user.id, status: AttendanceEventStatus.NO_SHIFT },
      });
      return;
    }

    const shift = shiftAssignment.shift;

    // 5. AttendanceRecord upsert + status hisoblash ($transaction ichida)
    await this.prisma.$transaction(async (tx) => {
      // Record olish yoki yaratish
      const record = await tx.attendanceRecord.upsert({
        where: { userId_shiftId: { userId: user.id, shiftId: shift.id } },
        create: { userId: user.id, shiftId: shift.id },
        update: {},
      });

      // Rescan qoidasi:
      //   checkIn  → birinchi saqlanadi, qayta kelsa ignore
      //   checkOut → oxirgi ishlaydi (overwrite)
      let newCheckInAt = record.checkInAt;
      let newCheckOutAt = record.checkOutAt;

      if (rawStatus === 'checkIn') {
        if (record.checkInAt !== null) {
          // Qayta checkIn — log'ga tushadi, record o'zgarmaydi
          this.logger.warn(
            `Duplicate checkIn ignored for userId=${user.id} shiftId=${shift.id}`,
          );
          // Event'ni baribir record'ga bog'laymiz (audit trail)
          await tx.attendanceEvent.update({
            where: { id: event.id },
            data: {
              userId: user.id,
              recordId: record.id,
              status: AttendanceEventStatus.MATCHED,
            },
          });
          return;
        }
        newCheckInAt = eventAt;
      } else {
        // checkOut: oxirgi skan
        newCheckOutAt = eventAt;
      }

      // Status va daqiqalar qayta hisoblanadi
      const { lateMinutes, earlyLeaveMinutes, status } = computeStatus(
        shift.startAt,
        shift.endAt,
        newCheckInAt,
        newCheckOutAt,
      );

      await tx.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkInAt: newCheckInAt,
          checkOutAt: newCheckOutAt,
          lateMinutes,
          earlyLeaveMinutes,
          status,
        },
      });

      await tx.attendanceEvent.update({
        where: { id: event.id },
        data: {
          userId: user.id,
          recordId: record.id,
          status: AttendanceEventStatus.MATCHED,
        },
      });
    });

    this.logger.log(
      `Event processed: userId=${user.id} shiftId=${shift.id} status=${rawStatus}`,
    );
  }

  // ── Nightly ABSENT cron ─────────────────────────────────────────────────────

  /**
   * Har kecha 01:00 Asia/Tashkent — o'tgan shiftslar uchun
   * AttendanceRecord yo'q xodimlarni ABSENT deb belgilaydi.
   */
  @Cron('0 1 * * *', { timeZone: CLINIC_TZ })
  async markAbsentForCompletedShifts(): Promise<void> {
    this.logger.log('Running ABSENT marking cron...');

    const now = new Date();
    const buffer = addMinutes(now, -ABSENT_BUFFER_MIN);

    // Tugagan shiftslar (endAt + buffer o'tgan)
    const completedShifts = await this.prisma.shift.findMany({
      where: { endAt: { lte: buffer } },
      include: {
        assignments: { select: { userId: true } },
        attendanceRecords: { select: { userId: true } },
      },
    });

    for (const shift of completedShifts) {
      const recordedUserIds = new Set(shift.attendanceRecords.map((r) => r.userId));
      const missingUsers = shift.assignments.filter(
        (a) => !recordedUserIds.has(a.userId),
      );

      for (const { userId } of missingUsers) {
        try {
          await this.prisma.attendanceRecord.upsert({
            where: { userId_shiftId: { userId, shiftId: shift.id } },
            create: {
              userId,
              shiftId: shift.id,
              status: AttendanceRecordStatus.ABSENT,
            },
            update: {
              // Agar allaqachon boshqa status bilan yozilgan bo'lsa — o'zgartirmaymiz
              // (manual override muhim)
            },
          });
        } catch (err) {
          this.logger.error(
            `Failed to mark absent: userId=${userId} shiftId=${shift.id}: ${err.message}`,
          );
        }
      }
    }

    this.logger.log('ABSENT marking cron completed.');
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
      if (query.from) where.eventAt.gte = new Date(query.from);
      if (query.to) where.eventAt.lte = new Date(query.to);
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

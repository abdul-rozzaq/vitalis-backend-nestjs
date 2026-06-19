import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { clinicDayUTC } from "../../common/clinic-time";

function calcPlannedHours(startHour: number, endHour: number): number {
  return endHour > startHour ? endHour - startHour : 24 - startHour + endHour;
}

@Injectable()
export class WorkingHoursService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Nightly cron: har kecha soat 01:00 da kechagi assignmentlar uchun log ──

  @Cron("0 1 * * *")
  async buildDailyLog() {
    const yesterday = clinicDayUTC(new Date(Date.now() - 86400000));
    await this.buildLog(yesterday);
  }

  async buildLog(date: Date) {
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: { date },
      include: {
        roomShift: { select: { startHour: true, endHour: true } },
      },
    });

    for (const a of assignments) {
      // OVERTIME bilan hisoblash
      const effectiveEnd = a.overrideEnd ?? a.roomShift.endHour;
      const effectiveStart = a.overrideStart ?? a.roomShift.startHour;
      const planned = calcPlannedHours(a.roomShift.startHour, a.roomShift.endHour);
      const effective = calcPlannedHours(effectiveStart, effectiveEnd);
      const overtime = Math.max(0, effective - planned);

      await this.prisma.workingHoursLog.upsert({
        where: { userId_date_shiftAssignmentId: { userId: a.doctorId, date, shiftAssignmentId: a.id } },
        create: {
          userId: a.doctorId,
          date,
          plannedStart: a.roomShift.startHour,
          plannedEnd: a.roomShift.endHour,
          plannedHours: planned,
          actualHours: effective,
          overtimeHours: overtime,
          shiftAssignmentId: a.id,
        },
        update: {
          actualHours: effective,
          overtimeHours: overtime,
        },
      });
    }
  }

  // ── Query metodlar ────────────────────────────────────────────────────────

  async findLogs(userId?: string, from?: string, to?: string) {
    const fromDate = from ? clinicDayUTC(from) : undefined;
    const toDate = to ? clinicDayUTC(to) : undefined;

    return this.prisma.workingHoursLog.findMany({
      where: {
        ...(userId && { userId }),
        ...(fromDate && { date: { gte: fromDate } }),
        ...(toDate && { date: { lte: toDate } }),
      },
      include: {
        user: { select: { id: true, first_name: true, last_name: true } },
        shiftAssignment: { include: { roomShift: { select: { id: true, name: true } } } },
      },
      orderBy: { date: "desc" },
    });
  }

  async getSummary(userId: string, period: "week" | "month") {
    const now = new Date();
    const from = clinicDayUTC(new Date(now.getTime() - (period === "week" ? 7 : 30) * 86400000));
    const to = clinicDayUTC(now);

    const logs = await this.prisma.workingHoursLog.findMany({
      where: { userId, date: { gte: from, lte: to } },
    });

    const totalPlanned = logs.reduce((s, l) => s + l.plannedHours, 0);
    const totalActual = logs.reduce((s, l) => s + l.actualHours, 0);
    const totalOvertime = logs.reduce((s, l) => s + l.overtimeHours, 0);

    return { userId, period, from, to, totalPlanned, totalActual, totalOvertime, days: logs.length };
  }

  async getMyLogs(userId: string) {
    const from = clinicDayUTC(new Date(Date.now() - 30 * 86400000));
    return this.findLogs(userId, from.toISOString());
  }
}

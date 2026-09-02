import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { clinicDateTimeUTC, clinicDayOfWeek, clinicDayUTC } from "../../common/clinic-time";
import { UserRole, WorkType } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { crossesMidnight } from "./shift-generator";
import { UpsertFixedScheduleDto } from "./fixed-schedules.dto";

@Injectable()
export class FixedSchedulesService {
  private readonly logger = new Logger(FixedSchedulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.fixedWorkSchedule.findMany({
      include: {
        user: { select: { id: true, first_name: true, last_name: true, role: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getForUser(userId: string) {
    return this.prisma.fixedWorkSchedule.findUnique({
      where: { userId },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  /**
   * Xodimning aniq ish vaqtini yaratadi/yangilaydi va `user.workType`ni FIXED
   * qiladi. Darhol amal qilishi uchun bugun va ertangi kunga mos smena +
   * biriktirish ham shu yerda generatsiya qilinadi — tungi cron kutilmaydi.
   */
  async upsert(userId: string, dto: UpsertFixedScheduleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException("Xodim topilmadi");

    const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId }, select: { id: true } });
    if (!dept) throw new NotFoundException("Bo'lim topilmadi");

    if (dto.startTime === dto.endTime) {
      throw new BadRequestException("Boshlanish va tugash vaqti bir xil bo'lmasligi kerak");
    }

    const [schedule] = await this.prisma.$transaction([
      this.prisma.fixedWorkSchedule.upsert({
        where: { userId },
        create: {
          userId,
          departmentId: dto.departmentId,
          startTime: dto.startTime,
          endTime: dto.endTime,
          daysOfWeek: dto.daysOfWeek ?? [],
          isActive: dto.isActive ?? true,
        },
        update: {
          departmentId: dto.departmentId,
          startTime: dto.startTime,
          endTime: dto.endTime,
          daysOfWeek: dto.daysOfWeek ?? [],
          isActive: dto.isActive ?? true,
        },
        include: { department: { select: { id: true, name: true } } },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { workType: WorkType.FIXED } }),
    ]);

    // Kechiktirmasdan amal qilishi uchun bugun/ertaga smena+biriktirish darhol yaratiladi.
    await this.generateForDay(clinicDayUTC());
    await this.generateForDay(new Date(clinicDayUTC().getTime() + 86_400_000));

    return schedule;
  }

  /** Jadvalni o'chiradi va xodimni yana SMENA turiga qaytaradi. Avval yaratilgan smenalar tegilmaydi. */
  async remove(userId: string) {
    const existing = await this.prisma.fixedWorkSchedule.findUnique({ where: { userId }, select: { id: true } });
    if (!existing) throw new NotFoundException("Aniq ish vaqti topilmadi");

    await this.prisma.$transaction([
      this.prisma.fixedWorkSchedule.delete({ where: { userId } }),
      this.prisma.user.update({ where: { id: userId }, data: { workType: WorkType.SMENA } }),
    ]);

    return { message: "Aniq ish vaqti o'chirildi" };
  }

  /**
   * Berilgan klinika kuni uchun barcha faol aniq-vaqtli xodimlarga mos
   * `Shift` + `ShiftStaff` yozuvlarini yaratadi (mavjud bo'lsa — tegilmaydi).
   *
   * Bir xil bo'lim+vaqt oralig'idagi xodimlar bitta Shift ostida guruhlanadi
   * (Shift'ning `[departmentId, startAt, endAt]` unique cheklovi bilan mos).
   */
  async generateForDay(day: Date): Promise<{ shiftsEnsured: number; staffEnsured: number }> {
    const dow = clinicDayOfWeek(day);

    const schedules = await this.prisma.fixedWorkSchedule.findMany({
      // `user.workType` ham tekshiriladi — agar kimdir xodim tahrirlash formasi
      // orqali workType'ni to'g'ridan-to'g'ri SMENA'ga qaytarsa (bu yerdagi
      // `remove()` dan chetlab o'tib), jadval yozuvi hali isActive bo'lib
      // qolgan taqdirda ham generatsiya to'xtaydi.
      where: { isActive: true, user: { workType: WorkType.FIXED } },
      include: { user: { select: { id: true, role: true } } },
    });

    const applicable = schedules.filter((s) => s.daysOfWeek.length === 0 || s.daysOfWeek.includes(dow));
    if (!applicable.length) return { shiftsEnsured: 0, staffEnsured: 0 };

    const groups = new Map<string, typeof applicable>();
    for (const s of applicable) {
      const key = `${s.departmentId}|${s.startTime}|${s.endTime}`;
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    }

    let shiftsEnsured = 0;
    let staffEnsured = 0;

    for (const [, group] of groups) {
      const first = group[0];
      try {
        const startAt = clinicDateTimeUTC(day, first.startTime);
        const endAt = clinicDateTimeUTC(day, first.endTime, crossesMidnight(first) ? 1 : 0);

        const requiredDoctors = group.filter((s) => s.user.role === UserRole.DOCTOR).length;
        const requiredNurses = group.filter((s) => s.user.role === UserRole.HAMSHIRA).length;

        const shift = await this.prisma.shift.upsert({
          where: { departmentId_startAt_endAt: { departmentId: first.departmentId, startAt, endAt } },
          create: {
            departmentId: first.departmentId,
            startAt,
            endAt,
            requiredDoctors: Math.max(requiredDoctors, 0),
            requiredNurses: Math.max(requiredNurses, 0),
            note: "Belgilangan ish vaqti (avtomatik)",
          },
          update: {},
          select: { id: true },
        });
        shiftsEnsured++;

        for (const s of group) {
          try {
            await this.prisma.shiftStaff.upsert({
              where: { shiftId_userId: { shiftId: shift.id, userId: s.userId } },
              create: { shiftId: shift.id, userId: s.userId, role: s.user.role },
              update: {},
            });
            staffEnsured++;
          } catch (err) {
            this.logger.warn(`Xodim ${s.userId} ni smenaga (${shift.id}) biriktirib bo'lmadi: ${err.message}`);
          }
        }
      } catch (err) {
        this.logger.error(`Guruh (${first.departmentId} ${first.startTime}-${first.endTime}) uchun smena yaratib bo'lmadi: ${err.message}`);
      }
    }

    return { shiftsEnsured, staffEnsured };
  }
}

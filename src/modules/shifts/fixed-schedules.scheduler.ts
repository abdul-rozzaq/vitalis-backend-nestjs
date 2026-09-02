import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { clinicDayUTC } from "../../common/clinic-time";
import { FixedSchedulesService } from "./fixed-schedules.service";

@Injectable()
export class FixedSchedulesScheduler {
  private readonly logger = new Logger(FixedSchedulesScheduler.name);

  constructor(private readonly fixedSchedulesService: FixedSchedulesService) {}

  /**
   * Har kuni 00:05 (Asia/Tashkent) — bugungi kun uchun aniq-vaqtli xodimlarga
   * mos Shift + ShiftStaff oldindan yaratib qo'yiladi, shuning uchun ertalabki
   * birinchi skan kelguncha davomat tizimi ularni allaqachon kutayotgan bo'ladi.
   */
  @Cron("5 0 * * *", { timeZone: "Asia/Tashkent" })
  async generateTodaysFixedShifts() {
    this.logger.log("Aniq ish vaqtli xodimlar uchun bugungi smenalarni generatsiya qilish boshlandi...");
    try {
      const result = await this.fixedSchedulesService.generateForDay(clinicDayUTC());
      this.logger.log(`Tayyor: ${result.shiftsEnsured} smena, ${result.staffEnsured} biriktirish.`);
    } catch (err) {
      this.logger.error(`Aniq ish vaqtli smenalarni generatsiya qilishda xato: ${err.message}`);
    }
  }
}

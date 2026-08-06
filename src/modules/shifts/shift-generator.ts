import { clinicDateTimeUTC, clinicDayOfWeek, clinicDayUTC, parseClinicTime } from "../../common/clinic-time";

/** Generatsiya uchun kerakli shablon maydonlari (Prisma modelining qismi). */
export interface GeneratorTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  requiredDoctors: number;
  requiredNurses: number;
  daysOfWeek: number[];
}

/** Generatsiya natijasidagi bitta smena. */
export interface PlannedShift {
  templateId: string;
  templateName: string;
  startAt: Date;
  endAt: Date;
  requiredDoctors: number;
  requiredNurses: number;
}

/**
 * Shablon tungi smenami — ya'ni tugash vaqti boshlanish vaqtidan keyin
 * kelmaydimi (masalan 22:00 → 06:00, yoki 20:00 → 20:00 = to'liq sutka).
 */
export function crossesMidnight(template: Pick<GeneratorTemplate, "startTime" | "endTime">): boolean {
  const [sh, sm] = parseClinicTime(template.startTime);
  const [eh, em] = parseClinicTime(template.endTime);
  return eh * 60 + em <= sh * 60 + sm;
}

/**
 * Klinika kunlari ro'yxatini qaytaradi (ikkala chegara ham kiradi).
 * Sanalar UTC yarim tuni sifatida qaytariladi — `clinicDayUTC` bilan mos.
 */
export function clinicDayRange(from: string, to: string): Date[] {
  const start = clinicDayUTC(from);
  const end = clinicDayUTC(to);
  const days: Date[] = [];
  for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
    days.push(d);
  }
  return days;
}

/**
 * Shablonlar × kunlar bo'yicha yaratilishi kerak bo'lgan smenalarni hisoblaydi.
 *
 * Sof funksiya — bazaga murojaat qilmaydi, shuning uchun to'g'ridan-to'g'ri
 * test qilinadi. Vaqtlar Asia/Tashkent deb talqin qilinib UTC'ga o'giriladi.
 *
 * @param daysOfWeekOverride - berilsa, har bir shablonning o'z `daysOfWeek` i o'rniga ishlatiladi
 */
export function planShifts(
  templates: GeneratorTemplate[],
  from: string,
  to: string,
  daysOfWeekOverride?: number[],
): PlannedShift[] {
  const days = clinicDayRange(from, to);
  const planned: PlannedShift[] = [];

  for (const day of days) {
    const dow = clinicDayOfWeek(day);

    for (const template of templates) {
      const allowed =
        daysOfWeekOverride && daysOfWeekOverride.length > 0
          ? daysOfWeekOverride
          : template.daysOfWeek;

      // Bo'sh ro'yxat = har kuni
      if (allowed.length > 0 && !allowed.includes(dow)) continue;

      planned.push({
        templateId: template.id,
        templateName: template.name,
        startAt: clinicDateTimeUTC(day, template.startTime),
        endAt: clinicDateTimeUTC(day, template.endTime, crossesMidnight(template) ? 1 : 0),
        requiredDoctors: template.requiredDoctors,
        requiredNurses: template.requiredNurses,
      });
    }
  }

  return planned.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/**
 * Klinika vaqt mintaqasi bilan ishlash util'lari.
 *
 * Butun loyiha bitta vaqt mintaqasida ishlaydi: Asia/Tashkent (UTC+5, DST yo'q).
 * Maqsad — server TZ qanday bo'lishidan qat'i nazar `@db.Date` ustunlariga doim
 * bir xil kalendar kun yozilishi va aktiv-smena soati to'g'ri hisoblanishi.
 */

export const CLINIC_TZ = "Asia/Tashkent";

/**
 * Berilgan (yoki hozirgi) momentni klinika mintaqasidagi KALENDAR kunga aylantirib,
 * o'sha kunning UTC yarim tunini qaytaradi.
 *
 * Prisma `@db.Date` uchun barqaror: `new Date("2026-06-10")` + `setHours(0,0,0,0)`
 * kabi server-local aralashmasidan farqli o'laroq, natija server TZ'siga bog'liq emas.
 *
 * @param input - "YYYY-MM-DD", to'liq ISO datetime yoki Date. Bo'sh bo'lsa — hozir.
 */
export function clinicDayUTC(input?: string | Date | null): Date {
  const base = input == null ? new Date() : new Date(input);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(base);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

/**
 * Berilgan (yoki hozirgi) momentning klinika mintaqasidagi soatini (0–23) qaytaradi.
 */
export function clinicHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")!.value);
  return h === 24 ? 0 : h;
}

/**
 * Berilgan (yoki hozirgi) momentning klinika mintaqasidagi daqiqasini (0–59) qaytaradi.
 */
export function clinicMinute(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    minute: "2-digit",
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === "minute")!.value);
}

/**
 * Minut darajasida aktiv smena tekshiruvi.
 * Yarim tuni kesuvchi smenalarni ham to'g'ri hisobga oladi (masalan 22:30–06:00).
 * startMinute/endMinute = 0 bo'lsa isActiveShift() bilan teng natija beradi.
 */
export function isActiveShiftMinute(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  now: Date = new Date(),
): boolean {
  const h = clinicHour(now);
  const m = clinicMinute(now);
  const current = h * 60 + m;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

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
 * Klinika mintaqasidagi UTC ofseti (soatlarda). Toshkent DST ishlatmaydi,
 * shuning uchun bu konstanta yil davomida o'zgarmaydi.
 */
const CLINIC_UTC_OFFSET_HOURS = 5;

/**
 * Klinika mintaqasidagi kalendar kun + "HH:mm" ni aniq UTC momentga aylantiradi.
 *
 * `new Date("2026-09-01T08:00")` server TZ'siga bog'liq bo'lgani uchun ishlatilmaydi;
 * bu funksiya doim Asia/Tashkent (UTC+5) deb hisoblaydi.
 *
 * @param day  - "YYYY-MM-DD" yoki Date (klinika kuni sifatida talqin qilinadi)
 * @param time - "HH:mm"
 * @param dayOffset - qo'shiladigan kunlar soni (tungi smena uchun 1)
 */
export function clinicDateTimeUTC(day: string | Date, time: string, dayOffset = 0): Date {
  const base = clinicDayUTC(day);
  const [hh, mm] = parseClinicTime(time);
  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() + dayOffset,
      hh - CLINIC_UTC_OFFSET_HOURS,
      mm,
    ),
  );
}

/**
 * "HH:mm" ni [soat, daqiqa] ga ajratadi. Noto'g'ri format bo'lsa xato tashlaydi.
 */
export function parseClinicTime(time: string): [number, number] {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new Error(`Vaqt formati noto'g'ri (HH:mm kutilgan): ${time}`);
  return [Number(match[1]), Number(match[2])];
}

/**
 * Klinika mintaqasidagi hafta kunini qaytaradi: 1=Dushanba ... 7=Yakshanba.
 * `clinicDayUTC` natijasi UTC yarim tuni bo'lgani uchun `getUTCDay()` xavfsiz.
 */
export function clinicDayOfWeek(day: string | Date): number {
  const d = clinicDayUTC(day).getUTCDay(); // 0=Yakshanba
  return d === 0 ? 7 : d;
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

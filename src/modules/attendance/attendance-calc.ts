import { AttendanceRecordStatus } from '../../generated/prisma/enums';

/**
 * Davomat hisob-kitobi — sof funksiyalar.
 *
 * Bu yerda bazaga ham, Hikvision'ga ham murojaat yo'q. Terminal faqat
 * "kim, qachon, kirdimi yoki chiqdimi" ni yuboradi; ish vaqti chegaralari
 * BIZNING `Shift.startAt` / `Shift.endAt` dan olinadi.
 */

// ─── Konstantalar ────────────────────────────────────────────────────────────

/**
 * Kechikish chegarasi. Xodim smena boshlanishidan shuncha daqiqa keyin
 * kelsa ham "o'z vaqtida" hisoblanadi.
 */
export const GRACE_MIN = parseInt(process.env.ATTENDANCE_GRACE_PERIOD_MIN ?? '5', 10);

/**
 * Skanni smenaga ulash oynasi. `GRACE_MIN` dan ATAYLAB ajratilgan: grace
 * "kech keldimi" degan savolga javob beradi, bu esa "bu skan umuman qaysi
 * smenaga tegishli" degan savolga.
 *
 * Ilgari ikkalasi uchun ham `GRACE_MIN` ishlatilardi, natijada smenadan
 * 20 daqiqa oldin kelgan xodimning skani hech qaysi smenaga tushmay
 * `NO_SHIFT` bo'lib qolar, keyin cron uni ABSENT deb belgilardi.
 */
export const MATCH_WINDOW_MIN = parseInt(process.env.ATTENDANCE_MATCH_WINDOW_MIN ?? '90', 10);

/**
 * Smena tugagandan keyin yozuv "yakunlangan" deb hisoblanadigan buffer.
 * Shu vaqtgacha `checkOut` yo'qligi normal holat — xodim hali ishlayapti.
 */
export const FINALIZE_BUFFER_MIN = parseInt(process.env.ATTENDANCE_ABSENT_BUFFER_MIN ?? '30', 10);

const MS_PER_MIN = 60_000;

// ─── Yordamchilar ────────────────────────────────────────────────────────────

export function addMinutes(date: Date, min: number): Date {
  return new Date(date.getTime() + min * MS_PER_MIN);
}

export function subMinutes(date: Date, min: number): Date {
  return new Date(date.getTime() - min * MS_PER_MIN);
}

function diffMinutes(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_MIN);
}

// ─── Skanni smenaga ulash ────────────────────────────────────────────────────

export interface ShiftBounds {
  id: string;
  startAt: Date;
  endAt: Date;
}

/** Skan smena oralig'idan qancha uzoqda (ms). Oraliq ichida bo'lsa 0. */
export function distanceToShift(shift: ShiftBounds, eventAt: Date): number {
  if (eventAt < shift.startAt) return shift.startAt.getTime() - eventAt.getTime();
  if (eventAt > shift.endAt) return eventAt.getTime() - shift.endAt.getTime();
  return 0;
}

/**
 * Bir nechta nomzod smenadan eng mosini tanlaydi.
 *
 * Ilgari `orderBy: { startAt: 'asc' }` ishlatilardi — ya'ni doim eng eski
 * smena. Xodim ketma-ket ikki smenada bo'lsa (22:00–06:00 va 06:00–14:00),
 * 06:00 dagi bitta skan ikkalasiga ham mos kelardi va HAR DOIM tungisiga
 * tushardi; ikkinchi smena esa check-in'siz qolib ABSENT bo'lardi.
 *
 * Tanlash tartibi:
 *   1. oraliqqa eng yaqin (ichidagilar ustun)
 *   2. `checkIn` bo'lsa boshlanishi eng yaqin, `checkOut` bo'lsa tugashi
 *   3. determinizm uchun `startAt` bo'yicha
 */
export function pickShiftForEvent<T extends ShiftBounds>(
  shifts: T[],
  eventAt: Date,
  rawStatus: string,
): T | null {
  if (!shifts.length) return null;

  const anchorOf = (s: T) => (rawStatus === 'checkOut' ? s.endAt : s.startAt);

  return [...shifts].sort((a, b) => {
    const byDistance = distanceToShift(a, eventAt) - distanceToShift(b, eventAt);
    if (byDistance !== 0) return byDistance;

    const byAnchor =
      Math.abs(anchorOf(a).getTime() - eventAt.getTime()) -
      Math.abs(anchorOf(b).getTime() - eventAt.getTime());
    if (byAnchor !== 0) return byAnchor;

    return a.startAt.getTime() - b.startAt.getTime();
  })[0];
}

// ─── Segmentlarni juftlash ───────────────────────────────────────────────────

export interface PunchEvent {
  eventAt: Date;
  rawStatus: string;
}

export interface WorkSegment {
  from: Date;
  /** `null` — segment hali ochiq, xodim hozir ichkarida. */
  to: Date | null;
}

/**
 * Skanlarni kirish/chiqish juftlariga ajratadi.
 *
 * Terminal noto'g'ri sozlangan bo'lsa ketma-ketlik buzilishi mumkin
 * (`IN, IN, OUT` yoki `OUT, IN`). Bunday holatlar ma'lumotni buzmaydi:
 *   - ochiq segment ustiga kelgan `IN` e'tiborsiz qoldiriladi (eng erkisi saqlanadi)
 *   - juftsiz `OUT` e'tiborsiz qoldiriladi
 */
export function pairSegments(events: PunchEvent[]): WorkSegment[] {
  const sorted = [...events].sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime());
  const segments: WorkSegment[] = [];
  let openFrom: Date | null = null;

  for (const e of sorted) {
    if (e.rawStatus === 'checkIn') {
      if (openFrom === null) openFrom = e.eventAt;
      continue;
    }
    if (openFrom !== null) {
      segments.push({ from: openFrom, to: e.eventAt });
      openFrom = null;
    }
  }

  if (openFrom !== null) segments.push({ from: openFrom, to: null });
  return segments;
}

/**
 * Segmentlarning [from, to] oynasi bilan kesishgan qismini daqiqada qaytaradi.
 * Ochiq segment `now` gacha hisoblanadi.
 */
export function minutesWithin(
  segments: WorkSegment[],
  windowStart: Date,
  windowEnd: Date,
  now: Date,
): number {
  let total = 0;
  for (const seg of segments) {
    const segEnd = seg.to ?? now;
    const from = Math.max(seg.from.getTime(), windowStart.getTime());
    const to = Math.min(segEnd.getTime(), windowEnd.getTime());
    if (to > from) total += (to - from) / MS_PER_MIN;
  }
  return Math.round(total);
}

// ─── Yakuniy hisob ───────────────────────────────────────────────────────────

export interface AttendanceComputation {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  /** Smena oynasi ichida haqiqatda ichkarida bo'lgan daqiqalar. */
  workedMinutes: number;
  /** Smena oynasining o'tgan qismidan yo'q bo'lgan daqiqalar. */
  absentMinutes: number;
  /** Hozir ichkaridami — ochiq segment bor va smena tugamagan. */
  insideNow: boolean;
  status: AttendanceRecordStatus;
}

/**
 * Bir xodimning bir smenadagi barcha skanlaridan yakuniy xulosa chiqaradi.
 *
 * `workedMinutes` birinchi kirish va oxirgi chiqish ayirmasi EMAS — u
 * juftlangan segmentlarning smena oynasi bilan kesishmasi. Ya'ni xodim
 * smena o'rtasida chiqib ketib qaytsa, yo'q bo'lgan vaqt hisobga olinadi:
 *
 *   08:00 IN → 12:00 OUT → 15:00 IN → 16:00 OUT
 *   eski model: 08:00–16:00 = 8 soat
 *   yangi model: 4 soat + 1 soat = 5 soat ishlangan, 3 soat yo'q
 */
export interface ManualOverrides {
  manualCheckInAt?: Date | null;
  manualCheckOutAt?: Date | null;
}

/**
 * Operator qo'lda kiritgan vaqtlarni sintetik skan sifatida qo'shadi.
 *
 * Qoida ataylab tor: qo'lda kiritilgan qiymat faqat YETISHMAYOTGAN skanni
 * to'ldiradi, mavjudini almashtirmaydi. Aks holda smena o'rtasidagi
 * segmentlar buzilardi.
 */
function withManualPunches(events: PunchEvent[], overrides?: ManualOverrides): PunchEvent[] {
  if (!overrides) return events;
  const result = [...events];

  const hasCheckIn = events.some((e) => e.rawStatus === 'checkIn');
  if (overrides.manualCheckInAt && !hasCheckIn) {
    result.push({ eventAt: overrides.manualCheckInAt, rawStatus: 'checkIn' });
  }

  // Ochiq segment bo'lsagina chiqish qo'shiladi.
  const hasOpenSegment = pairSegments(result).some((s) => s.to === null);
  if (overrides.manualCheckOutAt && hasOpenSegment) {
    result.push({ eventAt: overrides.manualCheckOutAt, rawStatus: 'checkOut' });
  }

  return result;
}

export function computeAttendance(
  shiftStart: Date,
  shiftEnd: Date,
  rawEvents: PunchEvent[],
  now: Date = new Date(),
  overrides?: ManualOverrides,
): AttendanceComputation {
  const events = withManualPunches(rawEvents, overrides);
  const sorted = [...events].sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime());
  const checkInAt = sorted.find((e) => e.rawStatus === 'checkIn')?.eventAt ?? null;
  const checkOutAt = [...sorted].reverse().find((e) => e.rawStatus === 'checkOut')?.eventAt ?? null;

  const segments = pairSegments(sorted);
  const workedMinutes = minutesWithin(segments, shiftStart, shiftEnd, now);

  // Smenaning o'tgan qismi — hali tugamagan smenada qolgan vaqt "yo'q" emas.
  const elapsedEnd = now < shiftEnd ? now : shiftEnd;
  const elapsedMinutes = Math.max(0, diffMinutes(elapsedEnd, shiftStart));
  const absentMinutes = Math.max(0, elapsedMinutes - workedMinutes);

  let lateMinutes = 0;
  if (checkInAt && checkInAt > addMinutes(shiftStart, GRACE_MIN)) {
    lateMinutes = diffMinutes(checkInAt, shiftStart);
  }

  let earlyLeaveMinutes = 0;
  if (checkOutAt && checkOutAt < subMinutes(shiftEnd, GRACE_MIN)) {
    earlyLeaveMinutes = diffMinutes(shiftEnd, checkOutAt);
  }

  const insideNow = segments.some((s) => s.to === null) && now < shiftEnd;
  const isFinalized = now >= addMinutes(shiftEnd, FINALIZE_BUFFER_MIN);

  return {
    checkInAt,
    checkOutAt,
    lateMinutes,
    earlyLeaveMinutes,
    workedMinutes,
    absentMinutes,
    insideNow,
    status: resolveStatus({ checkInAt, checkOutAt, lateMinutes, earlyLeaveMinutes, isFinalized }),
  };
}

/**
 * Statusni aniqlaydi.
 *
 * To'liqsiz yozuv (kirish yoki chiqish skani yo'q) kechikishdan USTUN turadi —
 * chunki bunday yozuvdagi raqamlarga ishonib bo'lmaydi va u operatorning
 * aralashuvini talab qiladi. `lateMinutes` baribir saqlanadi, UI ikkalasini
 * ham ko'rsata oladi.
 *
 * To'liqsizlik faqat smena YAKUNLANGANDAN keyin belgilanadi — faol smenada
 * chiqish skanining yo'qligi mutlaqo normal.
 */
function resolveStatus(input: {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  isFinalized: boolean;
}): AttendanceRecordStatus {
  const { checkInAt, checkOutAt, lateMinutes, earlyLeaveMinutes, isFinalized } = input;

  if (!checkInAt && !checkOutAt) return AttendanceRecordStatus.ABSENT;

  if (isFinalized) {
    if (!checkInAt) return AttendanceRecordStatus.MISSING_CHECKIN;
    if (!checkOutAt) return AttendanceRecordStatus.MISSING_CHECKOUT;
  }

  if (lateMinutes > 0 && earlyLeaveMinutes > 0) {
    return AttendanceRecordStatus.LATE_AND_EARLY_LEAVE;
  }
  if (lateMinutes > 0) return AttendanceRecordStatus.LATE;
  if (earlyLeaveMinutes > 0) return AttendanceRecordStatus.EARLY_LEAVE;
  return AttendanceRecordStatus.PRESENT;
}

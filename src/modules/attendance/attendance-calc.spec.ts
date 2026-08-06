import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AttendanceRecordStatus } from '../../generated/prisma/enums';
import {
  computeAttendance,
  distanceToShift,
  minutesWithin,
  pairSegments,
  pickShiftForEvent,
} from './attendance-calc';

/** Toshkent DST'siz UTC+5 — "HH:mm" ni UTC Date'ga o'giradi. */
const at = (day: number, hh: number, mm = 0) =>
  new Date(Date.UTC(2026, 8, day, hh - 5, mm));

const IN = (d: Date) => ({ eventAt: d, rawStatus: 'checkIn' });
const OUT = (d: Date) => ({ eventAt: d, rawStatus: 'checkOut' });

describe('pairSegments', () => {
  it('oddiy kirish-chiqish juftini yig\'adi', () => {
    const segs = pairSegments([IN(at(1, 8)), OUT(at(1, 16))]);
    assert.equal(segs.length, 1);
    assert.deepEqual(segs[0], { from: at(1, 8), to: at(1, 16) });
  });

  it('smena o\'rtasida chiqib qaytishni ikki segment qiladi', () => {
    const segs = pairSegments([
      IN(at(1, 8)),
      OUT(at(1, 12)),
      IN(at(1, 15)),
      OUT(at(1, 16)),
    ]);
    assert.equal(segs.length, 2);
    assert.deepEqual(segs[1], { from: at(1, 15), to: at(1, 16) });
  });

  it('tartibsiz kelgan skanlarni vaqt bo\'yicha saralaydi', () => {
    const segs = pairSegments([OUT(at(1, 16)), IN(at(1, 8))]);
    assert.equal(segs.length, 1);
    assert.deepEqual(segs[0], { from: at(1, 8), to: at(1, 16) });
  });

  it('ochiq segment ustiga kelgan takroriy IN ni e\'tiborsiz qoldiradi', () => {
    // Terminal noto'g'ri sozlanganda uchraydi: IN, IN, OUT
    const segs = pairSegments([IN(at(1, 8)), IN(at(1, 9)), OUT(at(1, 16))]);
    assert.equal(segs.length, 1);
    assert.deepEqual(segs[0], { from: at(1, 8), to: at(1, 16) });
  });

  it('juftsiz OUT ni e\'tiborsiz qoldiradi', () => {
    const segs = pairSegments([OUT(at(1, 8)), IN(at(1, 9)), OUT(at(1, 16))]);
    assert.equal(segs.length, 1);
    assert.deepEqual(segs[0], { from: at(1, 9), to: at(1, 16) });
  });

  it('yopilmagan segmentni ochiq qoldiradi', () => {
    const segs = pairSegments([IN(at(1, 8))]);
    assert.equal(segs.length, 1);
    assert.equal(segs[0].to, null);
  });
});

describe('minutesWithin', () => {
  it('segmentni oyna chegarasiga qirqadi', () => {
    // 07:00–17:00 ichkarida, smena 08:00–16:00 → faqat 8 soat hisoblanadi
    const segs = pairSegments([IN(at(1, 7)), OUT(at(1, 17))]);
    assert.equal(minutesWithin(segs, at(1, 8), at(1, 16), at(1, 18)), 480);
  });

  it('ochiq segmentni `now` gacha hisoblaydi', () => {
    const segs = pairSegments([IN(at(1, 8))]);
    assert.equal(minutesWithin(segs, at(1, 8), at(1, 16), at(1, 11)), 180);
  });

  it('oyna tashqarisidagi segmentni hisobga olmaydi', () => {
    const segs = pairSegments([IN(at(1, 18)), OUT(at(1, 20))]);
    assert.equal(minutesWithin(segs, at(1, 8), at(1, 16), at(1, 21)), 0);
  });
});

describe('distanceToShift / pickShiftForEvent', () => {
  const night = { id: 'night', startAt: at(1, 22), endAt: at(2, 6) };
  const morning = { id: 'morning', startAt: at(2, 6), endAt: at(2, 14) };

  it('oraliq ichidagi skan uchun masofa 0', () => {
    assert.equal(distanceToShift(night, at(2, 2)), 0);
  });

  it('erta kelgan skan uchun masofa musbat', () => {
    assert.equal(distanceToShift(night, at(1, 21, 40)), 20 * 60_000);
  });

  it('smenadan oldin kelgan skanni to\'g\'ri smenaga bog\'laydi', () => {
    // 21:40 — smena 22:00 da boshlanadi. Eski kod bunda hech narsa topmasdi.
    const picked = pickShiftForEvent([night, morning], at(1, 21, 40), 'checkIn');
    assert.equal(picked?.id, 'night');
  });

  it('chegaradagi checkIn keyingi smenaga tushadi', () => {
    // 06:00 da ikkala smena ham mos keladi. checkIn → boshlanishi yaqin bo'lgani.
    const picked = pickShiftForEvent([night, morning], at(2, 6), 'checkIn');
    assert.equal(picked?.id, 'morning');
  });

  it('chegaradagi checkOut oldingi smenaga tushadi', () => {
    // Xuddi shu vaqt, lekin chiqish → tugashi yaqin bo'lgani.
    const picked = pickShiftForEvent([night, morning], at(2, 6), 'checkOut');
    assert.equal(picked?.id, 'night');
  });

  it('nomzod bo\'lmasa null qaytaradi', () => {
    assert.equal(pickShiftForEvent([], at(1, 8), 'checkIn'), null);
  });
});

describe('computeAttendance', () => {
  const start = at(1, 8);
  const end = at(1, 16);
  const afterShift = at(1, 17);

  it('o\'z vaqtida kelib ketganni PRESENT deb belgilaydi', () => {
    const r = computeAttendance(start, end, [IN(at(1, 8)), OUT(at(1, 16))], afterShift);
    assert.equal(r.status, AttendanceRecordStatus.PRESENT);
    assert.equal(r.lateMinutes, 0);
    assert.equal(r.workedMinutes, 480);
    assert.equal(r.absentMinutes, 0);
  });

  it('grace period ichidagi kechikishni kechikish deb hisoblamaydi', () => {
    const r = computeAttendance(start, end, [IN(at(1, 8, 4)), OUT(at(1, 16))], afterShift);
    assert.equal(r.status, AttendanceRecordStatus.PRESENT);
    assert.equal(r.lateMinutes, 0);
  });

  it('kechikishni smena boshidan hisoblaydi', () => {
    const r = computeAttendance(start, end, [IN(at(1, 8, 14)), OUT(at(1, 16))], afterShift);
    assert.equal(r.status, AttendanceRecordStatus.LATE);
    assert.equal(r.lateMinutes, 14);
    assert.equal(r.workedMinutes, 466);
    assert.equal(r.absentMinutes, 14);
  });

  it('erta ketishni qayd etadi', () => {
    const r = computeAttendance(start, end, [IN(at(1, 8)), OUT(at(1, 15))], afterShift);
    assert.equal(r.status, AttendanceRecordStatus.EARLY_LEAVE);
    assert.equal(r.earlyLeaveMinutes, 60);
  });

  it('kech kelib erta ketganni ikkalasi bilan belgilaydi', () => {
    const r = computeAttendance(start, end, [IN(at(1, 8, 30)), OUT(at(1, 15))], afterShift);
    assert.equal(r.status, AttendanceRecordStatus.LATE_AND_EARLY_LEAVE);
    assert.equal(r.lateMinutes, 30);
    assert.equal(r.earlyLeaveMinutes, 60);
  });

  it('smena o\'rtasidagi yo\'qlikni hisobga oladi', () => {
    // Eski model buni 8 soat deb ko'rsatardi (birinchi IN, oxirgi OUT).
    const r = computeAttendance(
      start,
      end,
      [IN(at(1, 8)), OUT(at(1, 12)), IN(at(1, 15)), OUT(at(1, 16))],
      afterShift,
    );
    assert.equal(r.workedMinutes, 300); // 4 soat + 1 soat
    assert.equal(r.absentMinutes, 180); // 3 soat yo'q
    assert.equal(r.status, AttendanceRecordStatus.PRESENT); // kech ham emas, erta ham ketmagan
  });

  it('erta kelgan xodimning ortiqcha vaqtini smenaga qo\'shmaydi', () => {
    const r = computeAttendance(start, end, [IN(at(1, 7)), OUT(at(1, 17))], afterShift);
    assert.equal(r.workedMinutes, 480);
    assert.equal(r.absentMinutes, 0);
    assert.equal(r.lateMinutes, 0);
  });

  it('yakunlangan smenada chiqish skani yo\'qligini MISSING_CHECKOUT qiladi', () => {
    const r = computeAttendance(start, end, [IN(at(1, 8))], afterShift);
    assert.equal(r.status, AttendanceRecordStatus.MISSING_CHECKOUT);
    assert.equal(r.checkOutAt, null);
  });

  it('yakunlangan smenada kirish skani yo\'qligini MISSING_CHECKIN qiladi', () => {
    const r = computeAttendance(start, end, [OUT(at(1, 16))], afterShift);
    assert.equal(r.status, AttendanceRecordStatus.MISSING_CHECKIN);
  });

  it('FAOL smenada chiqish skani yo\'qligi normal holat', () => {
    // Soat 11:00, smena 16:00 da tugaydi — hali chiqmagani muammo emas.
    const r = computeAttendance(start, end, [IN(at(1, 8))], at(1, 11));
    assert.equal(r.status, AttendanceRecordStatus.PRESENT);
    assert.equal(r.insideNow, true);
    assert.equal(r.workedMinutes, 180);
    assert.equal(r.absentMinutes, 0);
  });

  it('faol smenada qolgan vaqtni "yo\'q" deb hisoblamaydi', () => {
    // 09:00 da keldi, hozir 11:00. Kechikish 60 daq, lekin qolgan 5 soat emas.
    const r = computeAttendance(start, end, [IN(at(1, 9))], at(1, 11));
    assert.equal(r.absentMinutes, 60);
  });

  it('skan umuman bo\'lmasa ABSENT', () => {
    const r = computeAttendance(start, end, [], afterShift);
    assert.equal(r.status, AttendanceRecordStatus.ABSENT);
    assert.equal(r.absentMinutes, 480);
  });

  it('qo\'lda kiritilgan chiqish vaqti yetishmayotgan skanni to\'ldiradi', () => {
    // Xodim kirdi, chiqishda skanerlamadi → MISSING_CHECKOUT.
    // Operator 16:00 ni qo'lda kiritadi.
    const r = computeAttendance(start, end, [IN(at(1, 8))], afterShift, {
      manualCheckOutAt: at(1, 16),
    });
    assert.equal(r.status, AttendanceRecordStatus.PRESENT);
    assert.equal(r.workedMinutes, 480);
    assert.deepEqual(r.checkOutAt, at(1, 16));
  });

  it('qo\'lda kiritilgan kirish vaqti yetishmayotgan skanni to\'ldiradi', () => {
    const r = computeAttendance(start, end, [OUT(at(1, 16))], afterShift, {
      manualCheckInAt: at(1, 8),
    });
    assert.equal(r.status, AttendanceRecordStatus.PRESENT);
    assert.equal(r.workedMinutes, 480);
  });

  it('qo\'lda kiritilgan qiymat MAVJUD skanni almashtirmaydi', () => {
    // Haqiqiy kirish 09:00 da bo'lgan; qo'lda 08:00 kiritilsa ham
    // xom skan ustun turadi — aks holda segmentlar buzilardi.
    const r = computeAttendance(start, end, [IN(at(1, 9)), OUT(at(1, 16))], afterShift, {
      manualCheckInAt: at(1, 8),
    });
    assert.deepEqual(r.checkInAt, at(1, 9));
    assert.equal(r.lateMinutes, 60);
  });

  it('tungi smenani kun chegarasi orqali to\'g\'ri hisoblaydi', () => {
    const nightStart = at(1, 22);
    const nightEnd = at(2, 6);
    const r = computeAttendance(
      nightStart,
      nightEnd,
      [IN(at(1, 21, 50)), OUT(at(2, 6, 10))],
      at(2, 7),
    );
    assert.equal(r.workedMinutes, 480);
    assert.equal(r.lateMinutes, 0);
    assert.equal(r.earlyLeaveMinutes, 0);
    assert.equal(r.status, AttendanceRecordStatus.PRESENT);
  });
});

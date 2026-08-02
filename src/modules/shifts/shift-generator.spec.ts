/**
 * Smena generatori uchun testlar.
 *
 * Ishga tushirish:  npm run test:shifts
 *
 * Loyihada jest o'rnatilmagan, shuning uchun Node'ning o'z test runner'i
 * (`node:test`) ishlatiladi — qo'shimcha dependency talab qilmaydi.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clinicDateTimeUTC, clinicDayOfWeek } from "../../common/clinic-time";
import { clinicDayRange, crossesMidnight, GeneratorTemplate, planShifts } from "./shift-generator";

const morning: GeneratorTemplate = {
  id: "t-morning",
  name: "Ertalabki",
  startTime: "08:00",
  endTime: "16:00",
  requiredDoctors: 1,
  requiredNurses: 2,
  daysOfWeek: [],
};

const night: GeneratorTemplate = {
  id: "t-night",
  name: "Tungi",
  startTime: "22:00",
  endTime: "06:00",
  requiredDoctors: 1,
  requiredNurses: 1,
  daysOfWeek: [],
};

describe("clinicDateTimeUTC", () => {
  it("klinika vaqtini UTC'ga o'giradi (Toshkent = UTC+5)", () => {
    // 2026-09-01 08:00 Toshkent = 2026-09-01 03:00 UTC
    assert.equal(clinicDateTimeUTC("2026-09-01", "08:00").toISOString(), "2026-09-01T03:00:00.000Z");
  });

  it("yarim tundan oldingi klinika vaqti oldingi UTC kuniga tushadi", () => {
    // 2026-09-01 00:30 Toshkent = 2026-08-31 19:30 UTC
    assert.equal(clinicDateTimeUTC("2026-09-01", "00:30").toISOString(), "2026-08-31T19:30:00.000Z");
  });

  it("dayOffset kunni siljitadi", () => {
    assert.equal(clinicDateTimeUTC("2026-09-01", "06:00", 1).toISOString(), "2026-09-02T01:00:00.000Z");
  });

  it("noto'g'ri formatni rad etadi", () => {
    assert.throws(() => clinicDateTimeUTC("2026-09-01", "8:00"));
    assert.throws(() => clinicDateTimeUTC("2026-09-01", "24:00"));
  });
});

describe("clinicDayOfWeek", () => {
  it("1=Dushanba .. 7=Yakshanba qaytaradi", () => {
    assert.equal(clinicDayOfWeek("2026-08-31"), 1); // dushanba
    assert.equal(clinicDayOfWeek("2026-09-05"), 6); // shanba
    assert.equal(clinicDayOfWeek("2026-09-06"), 7); // yakshanba
  });
});

describe("crossesMidnight", () => {
  it("tungi smenani aniqlaydi", () => {
    assert.equal(crossesMidnight(night), true);
    assert.equal(crossesMidnight({ startTime: "16:00", endTime: "00:00" }), true);
  });

  it("kunduzgi smenani aniqlamaydi", () => {
    assert.equal(crossesMidnight(morning), false);
  });
});

describe("clinicDayRange", () => {
  it("ikkala chegarani ham qo'shadi", () => {
    assert.equal(clinicDayRange("2026-09-01", "2026-09-30").length, 30);
    assert.equal(clinicDayRange("2026-09-01", "2026-09-01").length, 1);
  });

  it("oy chegarasidan o'tadi", () => {
    const days = clinicDayRange("2026-08-30", "2026-09-02");
    assert.equal(days.length, 4);
  });

  it("kabisa yilining fevralini to'g'ri sanaydi", () => {
    assert.equal(clinicDayRange("2028-02-01", "2028-02-29").length, 29);
  });
});

describe("planShifts", () => {
  it("har kun uchun bitta smena yaratadi (daysOfWeek bo'sh)", () => {
    const planned = planShifts([morning], "2026-09-01", "2026-09-30");
    assert.equal(planned.length, 30);
    assert.equal(planned[0].startAt.toISOString(), "2026-09-01T03:00:00.000Z");
    assert.equal(planned[0].endAt.toISOString(), "2026-09-01T11:00:00.000Z");
  });

  it("tungi smenaning tugashi ertasi kunga o'tadi", () => {
    const planned = planShifts([night], "2026-09-01", "2026-09-01");
    assert.equal(planned.length, 1);
    // 22:00 Toshkent = 17:00 UTC, 06:00 (+1 kun) Toshkent = 01:00 UTC ertasi kun
    assert.equal(planned[0].startAt.toISOString(), "2026-09-01T17:00:00.000Z");
    assert.equal(planned[0].endAt.toISOString(), "2026-09-02T01:00:00.000Z");
    assert.ok(planned[0].endAt > planned[0].startAt, "endAt startAt dan keyin bo'lishi shart");
  });

  it("shablonning daysOfWeek filtrini qo'llaydi", () => {
    // Faqat dushanba/chorshanba/juma
    const weekdaysOnly = { ...morning, daysOfWeek: [1, 3, 5] };
    const planned = planShifts([weekdaysOnly], "2026-09-01", "2026-09-07");
    assert.equal(planned.length, 3);
    for (const p of planned) {
      assert.ok([1, 3, 5].includes(clinicDayOfWeek(p.startAt)));
    }
  });

  it("daysOfWeekOverride shablon filtrini bekor qiladi", () => {
    const weekdaysOnly = { ...morning, daysOfWeek: [1, 3, 5] };
    const planned = planShifts([weekdaysOnly], "2026-09-01", "2026-09-07", [6, 7]);
    assert.equal(planned.length, 2);
    for (const p of planned) {
      assert.ok([6, 7].includes(clinicDayOfWeek(p.startAt)));
    }
  });

  it("bo'sh override shablon filtrini saqlab qoladi", () => {
    const weekdaysOnly = { ...morning, daysOfWeek: [1, 3, 5] };
    const planned = planShifts([weekdaysOnly], "2026-09-01", "2026-09-07", []);
    assert.equal(planned.length, 3);
  });

  it("bir nechta shablonni birlashtiradi va vaqt bo'yicha saralaydi", () => {
    const planned = planShifts([night, morning], "2026-09-01", "2026-09-02");
    assert.equal(planned.length, 4);
    for (let i = 1; i < planned.length; i++) {
      assert.ok(planned[i].startAt >= planned[i - 1].startAt, "saralanmagan");
    }
    // Birinchisi 1-sentabr ertalabki (03:00 UTC), tungisi kechroq (17:00 UTC)
    assert.equal(planned[0].templateId, "t-morning");
  });

  it("kvota maydonlarini shablondan ko'chiradi", () => {
    const planned = planShifts([morning], "2026-09-01", "2026-09-01");
    assert.equal(planned[0].requiredDoctors, 1);
    assert.equal(planned[0].requiredNurses, 2);
    assert.equal(planned[0].templateName, "Ertalabki");
  });

  it("mos kun bo'lmasa bo'sh massiv qaytaradi", () => {
    const sundayOnly = { ...morning, daysOfWeek: [7] };
    // 2026-09-01 seshanba .. 2026-09-05 shanba — yakshanba yo'q
    assert.equal(planShifts([sundayOnly], "2026-09-01", "2026-09-05").length, 0);
  });
});

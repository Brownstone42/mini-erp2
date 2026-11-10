import { expect, test } from "vitest";
import { buildReportingPeriod } from "../../src/replenishment/reporting-period";

test("AT-04: พ.ย. 2026 ต้องแสดง ธ.ค. 2025 ถึง พ.ย. 2026 ครบ 12 เดือน", () => {
  // Given: เวลาอ้างอิงข้อมูล ไม่ใช้เวลาจริงของเครื่องที่รัน test
  const asOf = "2026-11-10T09:00:00+07:00";

  // When: สร้างช่วงเดือนสำหรับตารางรายงาน
  const period = buildReportingPeriod(asOf);

  // Then: เรียงจากเก่าไปใหม่ และเก็บเวลาอ้างอิงสำหรับแสดงข้อมูลถึงเวลาใด
  expect(period).toEqual({
    asOf: "2026-11-10T02:00:00.000Z",
    timeZone: "Asia/Bangkok",
    months: [
      { month: "2025-12", isPartial: false },
      { month: "2026-01", isPartial: false },
      { month: "2026-02", isPartial: false },
      { month: "2026-03", isPartial: false },
      { month: "2026-04", isPartial: false },
      { month: "2026-05", isPartial: false },
      { month: "2026-06", isPartial: false },
      { month: "2026-07", isPartial: false },
      { month: "2026-08", isPartial: false },
      { month: "2026-09", isPartial: false },
      { month: "2026-10", isPartial: false },
      { month: "2026-11", isPartial: true },
    ],
  });
});

test("AT-04: เปลี่ยนเดือนและปีตามเวลาไทย แม้ UTC ยังเป็นเดือนธันวาคม", () => {
  // 31 ธ.ค. 2026 18:00 UTC = 1 ม.ค. 2027 01:00 ประเทศไทย
  const period = buildReportingPeriod("2026-12-31T18:00:00Z");

  expect(period.months.map(({ month }) => month)).toEqual([
    "2026-02", "2026-03", "2026-04", "2026-05",
    "2026-06", "2026-07", "2026-08", "2026-09",
    "2026-10", "2026-11", "2026-12", "2027-01",
  ]);
  expect(period.months.filter(({ isPartial }) => isPartial)).toEqual([
    { month: "2027-01", isPartial: true },
  ]);
  expect(period.asOf).toBe("2026-12-31T18:00:00.000Z");
  expect(period.timeZone).toBe("Asia/Bangkok");
});

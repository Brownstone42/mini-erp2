import { expect, test } from "vitest";
import { presentMetric } from "../../src/replenishment/data-status";

const asOf = "2026-11-10T09:00:00+07:00";

test("AT-14: ข้อมูลขาดต้องเป็น null พร้อมเหตุผล ไม่แทนด้วย 0", () => {
  expect(presentMetric({ value: null, asOf: null, verifiedWithExpress: false,
    unavailableReason: "ยังไม่ได้รับข้อมูลยอดค้างส่ง" })).toEqual({
    value: null, status: "unavailable", label: "ข้อมูลไม่พร้อม",
    reason: "ยังไม่ได้รับข้อมูลยอดค้างส่ง", asOf: null,
  });
});

test("AT-14: ยอด 150 ที่ยังไม่เทียบ Express ต้องแสดงว่ายังไม่ยืนยัน", () => {
  expect(presentMetric({ value: 150, asOf, verifiedWithExpress: false })).toEqual({
    value: 150, status: "unverified", label: "ยังไม่ยืนยันกับ Express", reason: null, asOf,
  });
});

test("AT-14: ยอด 0 ที่มีข้อมูลจริงต้องยังเป็น 0 ไม่ถือว่าข้อมูลหาย", () => {
  expect(presentMetric({ value: 0, asOf, verifiedWithExpress: false })).toEqual({
    value: 0, status: "unverified", label: "ยังไม่ยืนยันกับ Express", reason: null, asOf,
  });
});

test("AT-14: ยืนยันได้เฉพาะเมื่อมีข้อมูลและสถานะยืนยันชัดเจน", () => {
  expect(presentMetric({ value: 70, asOf, verifiedWithExpress: true })).toEqual({
    value: 70, status: "verified", label: "ยืนยันกับ Express แล้ว", reason: null, asOf,
  });
});

test("AT-14: ข้อมูลขาดต้องไม่ขึ้นยืนยัน แม้มี flag ยืนยันค้างมา", () => {
  const result = presentMetric({ value: null, asOf, verifiedWithExpress: true });
  expect(result.value).toBeNull();
  expect(result.status).toBe("unavailable");
  expect(result.label).toBe("ข้อมูลไม่พร้อม");
});

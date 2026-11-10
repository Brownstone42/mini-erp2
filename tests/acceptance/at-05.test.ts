import { expect, test } from "vitest";
import { buildReportingPeriod } from "../../src/replenishment/reporting-period";
import { reviewCustomers } from "../../src/replenishment/review-customers";
import { partiallyShippedOrder } from "../fixtures/partially-shipped-order";

test("AT-05: รวมตั้งแต่ 1 ธ.ค. ถึงวันอ้างอิง ไม่รวมก่อนช่วงหรือวันอนาคต", () => {
  const order = partiallyShippedOrder();
  order.shipments = [
    { shipmentId: "OLD", shippedOn: "2025-11-30", shippedBoxes: 10 },
    { shipmentId: "START", shippedOn: "2025-12-01", shippedBoxes: 20 },
    { shipmentId: "AS-OF", shippedOn: "2026-11-10", shippedBoxes: 30 },
    { shipmentId: "TOMORROW", shippedOn: "2026-11-11", shippedBoxes: 5 },
    { shipmentId: "NEXT-MONTH", shippedOn: "2026-12-01", shippedBoxes: 15 },
  ];
  const period = buildReportingPeriod("2026-11-10T09:00:00+07:00");
  // AT-06 adds zero-valued months without changing the boundary expectations.
  const emptyMonths = Object.fromEntries(period.months.map(({ month }) => [month, 0]));

  const report = reviewCustomers([order], period);

  expect(report).toEqual({
    customers: [{
      customerCode: "C001",
      shippedBoxes: 50,
      // ส่งก่อนช่วง 10 กล่องยังลดภาระค้าง แต่รายการอนาคตยังไม่ลด
      outstandingBoxes: 40,
      shippedByMonth: { ...emptyMonths, "2025-12": 20, "2026-11": 30 },
    }],
    totals: {
      shippedBoxes: 50,
      outstandingBoxes: 40,
      shippedByMonth: { ...emptyMonths, "2025-12": 20, "2026-11": 30 },
    },
  });
});

test("AT-05: วันสิ้นสุดอิงเวลาไทยเมื่อ UTC ยังเป็นวันก่อนหน้า", () => {
  const order = partiallyShippedOrder();
  order.shipments = [
    { shipmentId: "DEC", shippedOn: "2026-12-31", shippedBoxes: 10 },
    { shipmentId: "JAN", shippedOn: "2027-01-01", shippedBoxes: 20 },
    { shipmentId: "FUTURE", shippedOn: "2027-01-02", shippedBoxes: 30 },
  ];
  const period = buildReportingPeriod("2026-12-31T18:00:00Z");
  const emptyMonths = Object.fromEntries(period.months.map(({ month }) => [month, 0]));

  const report = reviewCustomers([order], period);

  expect(report).toEqual({
    customers: [{
      customerCode: "C001",
      shippedBoxes: 30,
      outstandingBoxes: 70,
      shippedByMonth: { ...emptyMonths, "2026-12": 10, "2027-01": 20 },
    }],
    totals: {
      shippedBoxes: 30,
      outstandingBoxes: 70,
      shippedByMonth: { ...emptyMonths, "2026-12": 10, "2027-01": 20 },
    },
  });
});

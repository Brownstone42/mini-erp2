import { expect, test } from "vitest";
import { buildReportingPeriod } from "../../src/replenishment/reporting-period";
import { reviewCustomers } from "../../src/replenishment/review-customers";
import { partiallyShippedOrder } from "../fixtures/partially-shipped-order";
import { multipleShipmentsOrder } from "../fixtures/multiple-shipments-order";

const emptyMonths = {
  "2025-12": 0,
  "2026-01": 0,
  "2026-02": 0,
  "2026-03": 0,
  "2026-04": 0,
  "2026-05": 0,
  "2026-06": 0,
  "2026-07": 0,
  "2026-08": 0,
  "2026-09": 0,
  "2026-10": 0,
  "2026-11": 0,
};
const period = buildReportingPeriod("2026-11-10T09:00:00+07:00");

test("AT-06: ข้อมูลครบ ต้องมี 12 เดือนและเติม 0 แยกบริษัทและยอดรวม", () => {
  const report = reviewCustomers([
    partiallyShippedOrder(), multipleShipmentsOrder(),
  ], period);

  expect(report).toEqual({
    customers: [
      {
        customerCode: "C001", shippedBoxes: 60, outstandingBoxes: 40,
        shippedByMonth: { ...emptyMonths, "2026-10": 60 },
      },
      {
        customerCode: "C002", shippedBoxes: 50, outstandingBoxes: 30,
        shippedByMonth: { ...emptyMonths, "2026-09": 30, "2026-10": 20 },
      },
    ],
    totals: {
      shippedBoxes: 110, outstandingBoxes: 70,
      shippedByMonth: { ...emptyMonths, "2026-09": 30, "2026-10": 80 },
    },
  });
  for (const row of [...report.customers, report.totals]) {
    expect(Object.keys(row.shippedByMonth)).toEqual(Object.keys(emptyMonths));
  }
});

test("AT-06: มีคำสั่งซื้อแต่ไม่มีการส่ง ต้องเป็น 0 ทั้ง 12 เดือนและคงยอดค้าง", () => {
  const order = partiallyShippedOrder();
  order.shipments = [];

  expect(reviewCustomers([order], period)).toEqual({
    customers: [{
      customerCode: "C001", shippedBoxes: 0, outstandingBoxes: 100,
      shippedByMonth: emptyMonths,
    }],
    totals: { shippedBoxes: 0, outstandingBoxes: 100, shippedByMonth: emptyMonths },
  });
});

test("AT-06: ชุดข้อมูลครบแต่ไม่มีคำสั่งซื้อ ยอดรวมยังมี 12 เดือนเป็น 0", () => {
  expect(reviewCustomers([], period)).toEqual({
    customers: [],
    totals: { shippedBoxes: 0, outstandingBoxes: 0, shippedByMonth: emptyMonths },
  });
});

import { expect, test } from "vitest";
import { buildReportingPeriod } from "../../src/replenishment/reporting-period";
import { reviewCustomers } from "../../src/replenishment/review-customers";
import { partiallyShippedOrder } from "../fixtures/partially-shipped-order";
import { multipleShipmentsOrder } from "../fixtures/multiple-shipments-order";
import { oldOutstandingOrder } from "../fixtures/old-outstanding-order";

const period = buildReportingPeriod("2026-11-10T09:00:00+07:00");
const emptyMonths = {
  "2025-12": 0, "2026-01": 0, "2026-02": 0, "2026-03": 0,
  "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0,
  "2026-08": 0, "2026-09": 0, "2026-10": 0, "2026-11": 0,
};

test("AT-07: คำสั่งซื้อเก่าค้าง 10 ต้องเพิ่มยอดค้างรวมเป็น 80 แต่ส่งในช่วงยัง 110", () => {
  // สั่ง ต.ค. 2025 จำนวน 25 ส่ง พ.ย. 2025 จำนวน 15 เหลือค้าง 10
  const report = reviewCustomers([
    partiallyShippedOrder(), multipleShipmentsOrder(), oldOutstandingOrder(),
  ], period);

  expect(report).toEqual({
    customers: [
      {
        customerCode: "C001", shippedBoxes: 60, outstandingBoxes: 50,
        shippedByMonth: { ...emptyMonths, "2026-10": 60 },
      },
      {
        customerCode: "C002", shippedBoxes: 50, outstandingBoxes: 30,
        shippedByMonth: { ...emptyMonths, "2026-09": 30, "2026-10": 20 },
      },
    ],
    totals: {
      shippedBoxes: 110, outstandingBoxes: 80,
      shippedByMonth: { ...emptyMonths, "2026-09": 30, "2026-10": 80 },
    },
  });
});

test("AT-07: บริษัทที่มีแต่คำสั่งซื้อเก่าค้างส่งต้องยังอยู่ในรายงาน", () => {
  const order = oldOutstandingOrder();
  order.customerCode = "C003";

  expect(reviewCustomers([order], period)).toEqual({
    customers: [{
      customerCode: "C003", shippedBoxes: 0, outstandingBoxes: 10,
      shippedByMonth: emptyMonths,
    }],
    totals: {
      shippedBoxes: 0, outstandingBoxes: 10, shippedByMonth: emptyMonths,
    },
  });
});

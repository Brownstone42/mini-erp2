import { expect, test } from "vitest";
import { reviewReplenishment } from "../../src/replenishment/review-replenishment";
import { buildReportingPeriod } from "../../src/replenishment/reporting-period";
import { partiallyShippedOrder } from "../fixtures/partially-shipped-order";

const emptyMonths = {
  "2025-12": 0, "2026-01": 0, "2026-02": 0, "2026-03": 0,
  "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0,
  "2026-08": 0, "2026-09": 0, "2026-10": 0, "2026-11": 0,
};

test.each([
  {
    scenario: "ส่งครบครั้งเดียว",
    shipments: [{ shipmentId: "SHIP-FULL", shippedOn: "2026-10-15", shippedBoxes: 100 }],
    expectedMonths: { ...emptyMonths, "2026-10": 100 },
  },
  {
    scenario: "ส่งบางส่วนแล้วส่งครบข้ามเดือน",
    shipments: [
      { shipmentId: "SHIP-PART-1", shippedOn: "2026-10-15", shippedBoxes: 60 },
      { shipmentId: "SHIP-PART-2", shippedOn: "2026-11-05", shippedBoxes: 40 },
    ],
    expectedMonths: { ...emptyMonths, "2026-10": 60, "2026-11": 40 },
  },
])("AT-10: $scenario สั่ง 100 ส่ง 100 ค้าง 0 และเก็บประวัติส่งตามเดือน", ({ shipments, expectedMonths }) => {
  // Given: คำสั่งซื้อ 100 กล่อง ส่งครบ ไม่มีการยกเลิกหรือคืนสินค้า
  const order = partiallyShippedOrder();
  order.shipments = shipments;
  const selection = { sku: "VINYL-001", warehouseCode: "WH-01" };
  const period = buildReportingPeriod("2026-11-10T09:00:00+07:00");

  const report = reviewReplenishment(
    [order], [{ ...selection, onHandBoxes: 150 }], selection, period,
  );

  // Then: ภาระค้างหมดแล้ว แต่บริษัทและประวัติส่งยังปรากฏในรายงาน
  expect(report).toEqual({
    selection,
    onHandBoxes: 150,
    customers: [{
      customerCode: "C001",
      shippedBoxes: 100,
      outstandingBoxes: 0,
      shippedByMonth: expectedMonths,
    }],
    totals: {
      shippedBoxes: 100,
      outstandingBoxes: 0,
      shippedByMonth: expectedMonths,
    },
  });
});

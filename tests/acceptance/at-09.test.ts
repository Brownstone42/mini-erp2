import { expect, test } from "vitest";
import { reviewReplenishment } from "../../src/replenishment/review-replenishment";
import { buildReportingPeriod } from "../../src/replenishment/reporting-period";
import { partiallyShippedOrder } from "../fixtures/partially-shipped-order";
import { multipleShipmentsOrder } from "../fixtures/multiple-shipments-order";

test.each([
  { orderedBoxes: 100, outstandingBoxes: 70 },
  { orderedBoxes: 200, outstandingBoxes: 170 },
])("AT-09: คงเหลือ 150 ต้องแยกจากค้างส่ง $outstandingBoxes ไม่หักออกเอง", ({ orderedBoxes, outstandingBoxes }) => {
  // Given: สต็อกตามแหล่งข้อมูล 150 กล่อง และคำสั่งซื้อของบริษัทเอ/บี
  const selection = { sku: "VINYL-001", warehouseCode: "WH-01" };
  const balances = [{ ...selection, onHandBoxes: 150 }];
  const orderA = partiallyShippedOrder();
  orderA.orderedBoxes = orderedBoxes;
  const period = buildReportingPeriod("2026-11-10T09:00:00+07:00");

  const report = reviewReplenishment(
    [orderA, multipleShipmentsOrder()], balances, selection, period,
  );

  // Then: คงเหลือตามแหล่งข้อมูล และภาระค้างส่งเป็นคนละค่า
  expect(report.onHandBoxes).toBe(150);
  expect(report.totals.outstandingBoxes).toBe(outstandingBoxes);
  expect(report.totals.shippedBoxes).toBe(110);
  expect(report.onHandBoxes).not.toBe(150 - outstandingBoxes);
  expect(balances).toEqual([{ ...selection, onHandBoxes: 150 }]);
});

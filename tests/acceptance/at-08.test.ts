import { expect, test } from "vitest";
import { reviewReplenishment } from "../../src/replenishment/review-replenishment";
import { buildReportingPeriod } from "../../src/replenishment/reporting-period";
import { partiallyShippedOrder } from "../fixtures/partially-shipped-order";
import { multipleShipmentsOrder } from "../fixtures/multiple-shipments-order";

const period = buildReportingPeriod("2026-11-10T09:00:00+07:00");
const selection = { sku: "VINYL-001", warehouseCode: "WH-01" };
const emptyMonths = {
  "2025-12": 0, "2026-01": 0, "2026-02": 0, "2026-03": 0,
  "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0,
  "2026-08": 0, "2026-09": 0, "2026-10": 0, "2026-11": 0,
};

test.each([
  { sku: "NITRILE-001", warehouseCode: "WH-01" },
  { sku: "VINYL-001", warehouseCode: "WH-02" },
  { sku: "NITRILE-001", warehouseCode: "WH-02" },
])("AT-08: ไม่รวม $sku ใน $warehouseCode เมื่อเลือก VINYL-001 ใน WH-01", (other) => {
  // ลูกค้าเดิมมีคำสั่งซื้ออื่นด้วย ต้องไม่เพิ่มยอดให้บริษัทเอ
  const otherOrder = {
    ...partiallyShippedOrder(), ...other,
    orderId: "SO-OTHER", orderedBoxes: 900,
    shipments: [{ shipmentId: "SHIP-OTHER", shippedOn: "2026-10-10", shippedBoxes: 400 }],
  };
  // ลูกค้าที่มีเฉพาะสินค้า/คลังอื่นต้องไม่ปรากฏในรายงาน
  const otherCustomerOrder = {
    ...otherOrder, orderId: "SO-OTHER-CUSTOMER", customerCode: "C999",
    shipments: [{ shipmentId: "SHIP-OTHER-CUSTOMER", shippedOn: "2026-10-11", shippedBoxes: 400 }],
  };

  const report = reviewReplenishment(
    [otherOrder, partiallyShippedOrder(), otherCustomerOrder, multipleShipmentsOrder()],
    [{ ...other, onHandBoxes: 999 }, { ...selection, onHandBoxes: 150 }],
    selection,
    period,
  );

  expect(report).toEqual({
    selection, onHandBoxes: 150,
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
});

test("AT-08: เปลี่ยนตัวเลือกต้องใช้ SKU และคลังที่เลือกจริง ไม่กำหนดค่าตายตัว", () => {
  const other = { sku: "NITRILE-001", warehouseCode: "WH-02" };
  const otherOrder = { ...partiallyShippedOrder(), ...other, orderId: "SO-OTHER", customerCode: "C003" };

  expect(reviewReplenishment(
    [partiallyShippedOrder(), otherOrder],
    [{ ...selection, onHandBoxes: 150 }, { ...other, onHandBoxes: 25 }],
    other,
    period,
  )).toEqual({
    selection: other, onHandBoxes: 25,
    customers: [{
      customerCode: "C003", shippedBoxes: 60, outstandingBoxes: 40,
      shippedByMonth: { ...emptyMonths, "2026-10": 60 },
    }],
    totals: {
      shippedBoxes: 60, outstandingBoxes: 40,
      shippedByMonth: { ...emptyMonths, "2026-10": 60 },
    },
  });
});

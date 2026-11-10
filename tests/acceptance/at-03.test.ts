import { expect, test } from "vitest";
import { reviewCustomers } from "../../src/replenishment/review-customers";
import { partiallyShippedOrder } from "../fixtures/partially-shipped-order";
import { multipleShipmentsOrder } from "../fixtures/multiple-shipments-order";

test("AT-03: แยกยอดบริษัทเอและบี รวมส่งจริง 110 และค้างส่ง 70", () => {
  // Given: บริษัทเอสั่ง 100 ส่ง 60; บริษัทบีสั่ง 80 ส่ง 30 และ 20
  const orders = [partiallyShippedOrder(), multipleShipmentsOrder()];

  // When: ขอข้อมูลทบทวนของทุกบริษัท
  const report = reviewCustomers(orders);

  // Then: ยอดแต่ละบริษัทไม่ปะปนกัน และยอดรวมรวมแต่ละรายการเพียงครั้งเดียว
  expect(report).toEqual({
    customers: [
      {
        customerCode: "C001",
        shippedBoxes: 60,
        outstandingBoxes: 40,
        shippedByMonth: { "2026-10": 60 },
      },
      {
        customerCode: "C002",
        shippedBoxes: 50,
        outstandingBoxes: 30,
        shippedByMonth: { "2026-09": 30, "2026-10": 20 },
      },
    ],
    totals: {
      shippedBoxes: 110,
      outstandingBoxes: 70,
      shippedByMonth: { "2026-09": 30, "2026-10": 80 },
    },
  });
});

test("AT-03: หลายคำสั่งซื้อของลูกค้าเดียวกันต้องรวมเป็นบริษัทเดียว", () => {
  const additionalOrder = partiallyShippedOrder();
  additionalOrder.orderId = "SO-003";
  additionalOrder.orderedBoxes = 25;
  additionalOrder.shipments = [
    { shipmentId: "SHIP-004", shippedOn: "2026-10-20", shippedBoxes: 10 },
  ];

  // คั่นด้วยบริษัทบี เพื่อให้การจัดกลุ่มไม่ขึ้นกับรายการที่อยู่ติดกัน
  const report = reviewCustomers([
    partiallyShippedOrder(),
    multipleShipmentsOrder(),
    additionalOrder,
  ]);

  expect(report).toEqual({
    customers: [
      {
        customerCode: "C001",
        shippedBoxes: 70,
        outstandingBoxes: 55,
        shippedByMonth: { "2026-10": 70 },
      },
      {
        customerCode: "C002",
        shippedBoxes: 50,
        outstandingBoxes: 30,
        shippedByMonth: { "2026-09": 30, "2026-10": 20 },
      },
    ],
    totals: {
      shippedBoxes: 120,
      outstandingBoxes: 85,
      shippedByMonth: { "2026-09": 30, "2026-10": 90 },
    },
  });
});

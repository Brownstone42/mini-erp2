import { expect, test } from "vitest";
import { reviewOrderByMonth } from "../../src/replenishment/review-order";
import { multipleShipmentsOrder } from "../fixtures/multiple-shipments-order";

test("AT-02: ส่ง ก.ย. 30 และ ต.ค. 20 ต้องแยกเดือน รวมส่ง 50 และค้าง 30", () => {
  // Given: บริษัทบีสั่ง 80 กล่อง ส่งสองครั้งต่างเดือน ไม่มีการยกเลิก
  const order = multipleShipmentsOrder();

  // When: ขอข้อมูลทบทวนพร้อมยอดส่งจริงรายเดือน
  const review = reviewOrderByMonth(order);

  // Then: นับยอดสั่งเพียงครั้งเดียว และแยกยอดส่งตามเดือนที่ส่งจริง
  expect(review).toEqual({
    customerCode: "C002",
    shippedBoxes: 50,
    outstandingBoxes: 30,
    shippedByMonth: { "2026-09": 30, "2026-10": 20 },
  });
});

test("AT-02: ส่งหลายครั้งในเดือนเดียวกันต้องรวมยอด ไม่เขียนทับรายการก่อน", () => {
  const order = multipleShipmentsOrder();
  order.shipments = [
    { shipmentId: "SHIP-003", shippedOn: "2026-10-15", shippedBoxes: 20 },
    { shipmentId: "SHIP-002A", shippedOn: "2026-09-10", shippedBoxes: 10 },
    { shipmentId: "SHIP-002B", shippedOn: "2026-09-20", shippedBoxes: 20 },
  ];

  const review = reviewOrderByMonth(order);

  expect(review).toEqual({
    customerCode: "C002",
    shippedBoxes: 50,
    outstandingBoxes: 30,
    shippedByMonth: { "2026-09": 30, "2026-10": 20 },
  });
});

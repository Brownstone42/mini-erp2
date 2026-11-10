import { expect, test } from "vitest";
import { reviewOrder } from "../../src/replenishment/review-order";
import { partiallyShippedOrder } from "../fixtures/partially-shipped-order";

test("AT-01: สั่ง 100 กล่อง ส่งจริง 60 ต้องแสดงส่งจริง 60 และค้างส่ง 40 แยกกัน", () => {
  // Given: บริษัทเอ (C001) สั่ง 100 กล่อง ส่งแล้ว 60 และไม่มีการยกเลิก
  const order = partiallyShippedOrder();

  // When: ขอข้อมูลทบทวนคำสั่งซื้อสำหรับ Manager
  const review = reviewOrder(order);

  // Then: ยอดส่งจริงไม่ใช่ยอดสั่ง และแยกจากยอดค้างส่งของลูกค้ารายนี้
  expect(review).toEqual({
    customerCode: "C001",
    shippedBoxes: 60,
    outstandingBoxes: 40,
  });
  expect(review.shippedBoxes).not.toBe(100);
});

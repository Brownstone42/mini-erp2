import type { OrderReviewInput } from "../../src/replenishment/review-order";

export function oldOutstandingOrder(): OrderReviewInput {
  return {
    orderId: "SO-OLD-001",
    orderedOn: "2025-10-01",
    customerCode: "C001",
    sku: "VINYL-001",
    warehouseCode: "WH-01",
    unit: "box",
    orderedBoxes: 25,
    cancelledBoxes: 0,
    shipments: [
      { shipmentId: "SHIP-OLD-001", shippedOn: "2025-11-15", shippedBoxes: 15 },
    ],
  };
}

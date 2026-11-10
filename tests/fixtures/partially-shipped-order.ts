import type { OrderReviewInput } from "../../src/replenishment/review-order";

export function partiallyShippedOrder(): OrderReviewInput {
  return {
    orderId: "SO-001",
    orderedOn: "2026-10-01",
    customerCode: "C001",
    sku: "VINYL-001",
    warehouseCode: "WH-01",
    unit: "box",
    orderedBoxes: 100,
    cancelledBoxes: 0,
    shipments: [
      {
        shipmentId: "SHIP-001",
        shippedOn: "2026-10-15",
        shippedBoxes: 60,
      },
    ],
  };
}

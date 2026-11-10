import type { OrderReviewInput } from "../../src/replenishment/review-order";

export function multipleShipmentsOrder(): OrderReviewInput {
  return {
    orderId: "SO-002",
    orderedOn: "2026-09-01",
    customerCode: "C002",
    sku: "VINYL-001",
    warehouseCode: "WH-01",
    unit: "box",
    orderedBoxes: 80,
    cancelledBoxes: 0,
    shipments: [
      { shipmentId: "SHIP-002", shippedOn: "2026-09-10", shippedBoxes: 30 },
      { shipmentId: "SHIP-003", shippedOn: "2026-10-15", shippedBoxes: 20 },
    ],
  };
}

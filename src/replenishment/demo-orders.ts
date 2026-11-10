import type { OrderReviewInput } from "./review-order";

export const demoAsOf = "2026-11-10T09:00:00+07:00";
export const demoCustomerNames: Record<string, string> = { C001: "บริษัทเอ", C002: "บริษัทบี" };

// Raw mock orders: outstanding amounts are calculated, never supplied as answers.
export const demoOrders: ReadonlyArray<OrderReviewInput> = [
  {
    orderId: "SO-001", orderedOn: "2026-10-01", customerCode: "C001",
    sku: "VINYL-001", warehouseCode: "WH-01", unit: "box", orderedBoxes: 100, cancelledBoxes: 0,
    shipments: [{ shipmentId: "SHIP-001", shippedOn: "2026-10-15", shippedBoxes: 60 }],
  },
  {
    orderId: "SO-002", orderedOn: "2026-09-01", customerCode: "C002",
    sku: "VINYL-001", warehouseCode: "WH-01", unit: "box", orderedBoxes: 80, cancelledBoxes: 0,
    shipments: [
      { shipmentId: "SHIP-002", shippedOn: "2026-09-10", shippedBoxes: 30 },
      { shipmentId: "SHIP-003", shippedOn: "2026-10-15", shippedBoxes: 20 },
    ],
  },
];

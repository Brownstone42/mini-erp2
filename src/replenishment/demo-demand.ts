import type { DemandInput, SalesOrder, BacklogLine } from "./review-demand";

export const demoAsOf = "2026-11-10T09:00:00+07:00";
export function demoDemandInput(scenario?: string): DemandInput {
  const a: SalesOrder = { orderId: "ORD-001", customerCode: "C001", sku: "VINYL-001",
    orderedOn: "2026-10-01", dueOn: "2026-10-15", orderedBoxes: 100,
    shipments: [{ shipmentId: "SHIP-001", shippedOn: "2026-10-15", shippedBoxes: 60 }] };
  const b: SalesOrder = { orderId: "ORD-002", customerCode: "C002", sku: "VINYL-001",
    orderedOn: "2026-09-01", dueOn: "2026-10-15", orderedBoxes: 80,
    shipments: [{ shipmentId: "SHIP-002", shippedOn: "2026-09-10", shippedBoxes: 30 },
      { shipmentId: "SHIP-003", shippedOn: "2026-10-15", shippedBoxes: 20 }] };
  const orders = [a, b];
  // Report quantities are independent inputs, never derived from order minus shipments.
  const backlog: BacklogLine[] = [
    { orderId: "ORD-001", customerCode: "C001", sku: "VINYL-001", orderedOn: "2026-10-01", dueOn: "2026-10-15", outstandingBoxes: 40 },
    { orderId: "ORD-002", customerCode: "C002", sku: "VINYL-001", orderedOn: "2026-09-01", dueOn: "2026-10-15", outstandingBoxes: 30 },
  ];
  if (["old", "combined"].includes(scenario ?? "")) {
    orders.push({ ...a, orderId: "ORD-OLD", orderedOn: "2025-10-01", dueOn: "2025-10-15", orderedBoxes: 20,
      shipments: [{ shipmentId: "SHIP-OLD", shippedOn: "2025-10-15", shippedBoxes: 10 }] });
    backlog.push({ ...backlog[0]!, orderId: "ORD-OLD", orderedOn: "2025-10-01", dueOn: "2025-10-15", outstandingBoxes: 10 });
  }
  if (["booking", "combined"].includes(scenario ?? "")) {
    orders.push({ ...b, orderId: "ORD-BOOK", orderedOn: "2026-11-05", dueOn: "2027-01-15", orderedBoxes: 50, shipments: [] });
    backlog.push({ ...backlog[1]!, orderId: "ORD-BOOK", orderedOn: "2026-11-05", dueOn: "2027-01-15", outstandingBoxes: 50 });
  }
  const stock = [{ sku: "VINYL-001", onHandBoxes: scenario === "zero" ? 0 : 150 }];
  if (scenario === "other-sku") {
    orders.push({ ...a, orderId: "OTHER", sku: "OTHER-SKU", orderedBoxes: 999 });
    backlog.push({ ...backlog[0]!, sku: "OTHER-SKU", outstandingBoxes: 999 });
    stock.push({ sku: "OTHER-SKU", onHandBoxes: 999 });
  }
  const selected = scenario === "only-a" || scenario === "fulfilled" ? "C001" : scenario === "only-b" ? "C002" : null;
  if (scenario === "fulfilled") {
    a.shipments[0]!.shippedBoxes = 100;
    backlog[0]!.outstandingBoxes = 0;
  }
  return {
    sku: "VINYL-001", asOf: demoAsOf,
    customers: [{ customerCode: "C001", name: "บริษัทเอ" }, { customerCode: "C002", name: "บริษัทบี" }].filter(c => !selected || c.customerCode === selected),
    orders: { data: scenario === "missing-orders" ? null : orders.filter(o => !selected || o.customerCode === selected), asOf: demoAsOf, verifiedWithExpress: false },
    backlog: { data: scenario === "missing-outstanding" ? null : backlog.filter(o => !selected || o.customerCode === selected), asOf: demoAsOf, verifiedWithExpress: false },
    stock: { data: scenario === "missing-stock" ? null : stock, asOf: demoAsOf, verifiedWithExpress: false },
  };
}

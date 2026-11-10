import type { ReportingPeriod } from "./reporting-period";

export interface OrderReviewInput {
  orderId: string;
  orderedOn: string; // Business calendar date; does not limit outstanding orders to 12 months.
  customerCode: string;
  sku: string;
  warehouseCode: string;
  unit: "box";
  orderedBoxes: number;
  cancelledBoxes: number;
  shipments: ReadonlyArray<{
    shipmentId: string;
    shippedOn: string; // Business calendar date in YYYY-MM-DD format.
    shippedBoxes: number;
  }>;
}

export interface OrderReview {
  customerCode: string;
  shippedBoxes: number;
  outstandingBoxes: number;
}

export interface MonthlyOrderReview extends OrderReview {
  shippedByMonth: Record<string, number>;
}

export function reviewOrderByMonth(
  input: OrderReviewInput,
  period?: ReportingPeriod,
): MonthlyOrderReview {
  let shipmentsAsOf = input.shipments;
  let reportShipments = input.shipments;

  if (period) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: period.timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(period.asOf));
    const part = (type: string) => parts.find((entry) => entry.type === type)!.value;
    const endDate = `${part("year")}-${part("month")}-${part("day")}`;
    const startDate = `${period.months[0]!.month}-01`;

    // Dates are YYYY-MM-DD. Same-day records must come from the asOf snapshot.
    shipmentsAsOf = input.shipments.filter((shipment) => shipment.shippedOn <= endDate);
    reportShipments = shipmentsAsOf.filter((shipment) => shipment.shippedOn >= startDate);
  }

  const outstandingBoxes = reviewOrder({ ...input, shipments: shipmentsAsOf }).outstandingBoxes;
  const reportSummary = reviewOrder({ ...input, shipments: reportShipments });
  const shippedByMonth: Record<string, number> = {};

  for (const shipment of reportShipments) {
    const month = shipment.shippedOn.slice(0, 7);
    shippedByMonth[month] =
      (shippedByMonth[month] ?? 0) + shipment.shippedBoxes;
  }

  return { ...reportSummary, outstandingBoxes, shippedByMonth };
}

// AT-01 and AT-02 cover active orders with no cancellations or returns.
export function reviewOrder(input: OrderReviewInput): OrderReview {
  const shippedBoxes = input.shipments.reduce(
    (total, shipment) => total + shipment.shippedBoxes,
    0,
  );

  return {
    customerCode: input.customerCode,
    shippedBoxes,
    outstandingBoxes: input.orderedBoxes - shippedBoxes,
  };
}

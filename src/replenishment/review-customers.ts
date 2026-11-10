import {
  reviewOrderByMonth,
  type MonthlyOrderReview,
  type OrderReviewInput,
} from "./review-order";
import type { ReportingPeriod } from "./reporting-period";

export interface CustomerReviewReport {
  customers: MonthlyOrderReview[];
  totals: {
    shippedBoxes: number;
    outstandingBoxes: number;
    shippedByMonth: Record<string, number>;
  };
}

export function reviewCustomers(
  orders: ReadonlyArray<OrderReviewInput>,
  period?: ReportingPeriod,
): CustomerReviewReport {
  // This calculation receives complete data; unavailable data is handled in AT-14.
  // Create a fresh month map per row so customers never share mutable totals.
  const emptyMonths = (): Record<string, number> =>
    Object.fromEntries((period?.months ?? []).map(({ month }) => [month, 0]));
  const customers = new Map<string, MonthlyOrderReview>();
  const totals: CustomerReviewReport["totals"] = {
    shippedBoxes: 0,
    outstandingBoxes: 0,
    shippedByMonth: emptyMonths(),
  };

  for (const order of orders) {
    const review = reviewOrderByMonth(order, period);
    let customer = customers.get(review.customerCode);

    if (!customer) {
      customer = {
        customerCode: review.customerCode,
        shippedBoxes: 0,
        outstandingBoxes: 0,
        shippedByMonth: emptyMonths(),
      };
      customers.set(review.customerCode, customer);
    }

    customer.shippedBoxes += review.shippedBoxes;
    customer.outstandingBoxes += review.outstandingBoxes;
    totals.shippedBoxes += review.shippedBoxes;
    totals.outstandingBoxes += review.outstandingBoxes;

    for (const [month, boxes] of Object.entries(review.shippedByMonth)) {
      customer.shippedByMonth[month] =
        (customer.shippedByMonth[month] ?? 0) + boxes;
      totals.shippedByMonth[month] =
        (totals.shippedByMonth[month] ?? 0) + boxes;
    }
  }

  return { customers: [...customers.values()], totals };
}

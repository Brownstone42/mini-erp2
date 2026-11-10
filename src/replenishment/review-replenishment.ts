import type { OrderReviewInput } from "./review-order";
import type { ReportingPeriod } from "./reporting-period";
import { reviewCustomers, type CustomerReviewReport } from "./review-customers";

export interface ProductWarehouse {
  sku: string;
  warehouseCode: string;
}

// One balance per SKU/warehouse in a complete snapshot, all quantities in boxes.
export interface StockBalance extends ProductWarehouse {
  onHandBoxes: number;
}

export interface ReplenishmentReview extends CustomerReviewReport {
  selection: ProductWarehouse;
  onHandBoxes: number | null;
}

export function reviewReplenishment(
  orders: ReadonlyArray<OrderReviewInput>,
  balances: ReadonlyArray<StockBalance>,
  selection: ProductWarehouse,
  period: ReportingPeriod,
): ReplenishmentReview {
  const matchesSelection = (item: ProductWarehouse) =>
    item.sku === selection.sku && item.warehouseCode === selection.warehouseCode;
  const selectedOrders = orders.filter(matchesSelection);
  const balance = balances.find(matchesSelection);

  return {
    selection: { ...selection },
    onHandBoxes: balance?.onHandBoxes ?? null,
    ...reviewCustomers(selectedOrders, period),
  };
}

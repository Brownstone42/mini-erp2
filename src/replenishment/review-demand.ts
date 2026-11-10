import { presentMetric, type MetricDisplay } from "./data-status";
import { buildReportingPeriod, type ReportingPeriod } from "./reporting-period";

export interface SalesOrder {
  orderId: string; customerCode: string; sku: string;
  orderedOn: string; dueOn: string | null; orderedBoxes: number;
  shipments: Array<{ shipmentId: string; shippedOn: string; shippedBoxes: number }>;
}
export interface BacklogLine {
  orderId: string; customerCode: string; sku: string;
  orderedOn: string; dueOn: string | null; outstandingBoxes: number;
}
export interface Snapshot<T> { data: T | null; asOf: string; verifiedWithExpress: boolean }
export interface DemandInput {
  sku: string; asOf: string; customers: Array<{ customerCode: string; name: string }>;
  orders: Snapshot<SalesOrder[]>;
  backlog: Snapshot<BacklogLine[]>;
  stock: Snapshot<Array<{ sku: string; onHandBoxes: number }>>;
}
export interface DemandRow { orderedByMonth: Record<string, number | null>; orderedBoxes: number | null }
export interface DemandReview {
  period: ReportingPeriod;
  customers: Array<DemandRow & { customerCode: string; name: string }>;
  totals: DemandRow;
  metrics: Array<MetricDisplay & { id: string; title: string }>;
  outstandingDetails: BacklogLine[] | null;
  orderDetails: SalesOrder[] | null;
}
export function reviewDemand(input: DemandInput): DemandReview {
  const period = buildReportingPeriod(input.asOf);
  const businessDate = (asOf: string) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(asOf));
    const value = (type: string) => parts.find(p => p.type === type)!.value;
    return `${value("year")}-${value("month")}-${value("day")}`;
  };
  const endDate = businessDate(new Date(input.orders.asOf) < new Date(input.asOf) ? input.orders.asOf : input.asOf);
  const startDate = `${period.months[0]!.month}-01`;
  // These sources are snapshots, including only records available at their asOf.
  // Order dates control the demand window; delivery dates never move demand.
  const orderDetails = input.orders.data === null ? null : input.orders.data
    .filter(o => o.sku === input.sku && o.orderedOn >= startDate && o.orderedOn <= endDate)
    .map(o => ({ ...o, shipments: o.shipments.filter(s => s.shippedOn <= endDate) }));
  const emptyRow = (): DemandRow => ({
    orderedBoxes: orderDetails === null ? null : 0,
    orderedByMonth: Object.fromEntries(period.months.map(({ month }) => [month, orderDetails === null ? null : 0])),
  });
  const customers = new Map(input.customers.map(c => [c.customerCode, { ...c, ...emptyRow() }]));
  const totals = emptyRow();
  for (const order of orderDetails ?? []) {
    let row = customers.get(order.customerCode);
    if (!row) {
      row = { customerCode: order.customerCode, name: order.customerCode, ...emptyRow() };
      customers.set(order.customerCode, row);
    }
    const month = order.orderedOn.slice(0,7);
    row.orderedBoxes! += order.orderedBoxes;
    row.orderedByMonth[month]! += order.orderedBoxes;
    totals.orderedBoxes! += order.orderedBoxes;
    totals.orderedByMonth[month]! += order.orderedBoxes;
  }
  // Never join backlog to the 12-month orders: that would drop old/advance work.
  const outstandingDetails = input.backlog.data === null ? null : input.backlog.data.filter(r => r.sku === input.sku);
  const outstandingBoxes = outstandingDetails === null ? null : outstandingDetails.reduce((sum,r) => sum + r.outstandingBoxes,0);
  const onHandBoxes = input.stock.data?.find(s => s.sku === input.sku)?.onHandBoxes ?? null;
  const metric = (id: string, title: string, value: number | null, source: Snapshot<unknown>) => ({
    id, title, ...presentMetric({ value, asOf: value === null ? null : source.asOf,
      verifiedWithExpress: source.verifiedWithExpress, unavailableReason: `ยังไม่ได้รับข้อมูล${title}` }),
  });
  return { period, customers: [...customers.values()], totals, outstandingDetails, orderDetails,
    metrics: [metric("stock", "ยอดคงเหลือ", onHandBoxes, input.stock),
      metric("orders", "ยอดสั่งในช่วง", totals.orderedBoxes, input.orders),
      metric("outstanding", "ยอดค้างส่ง", outstandingBoxes, input.backlog)],
  };
}

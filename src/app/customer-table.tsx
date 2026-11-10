import Link from "next/link";
import { demoHref, formatReportMonth, formatSnapshotTime } from "../replenishment/demo-metrics";
import type { DemandReview, DemandRow } from "../replenishment/review-demand";

export function CustomerTable({ review, scenario }: { review: DemandReview; scenario?: string }) {
  const metric = review.metrics.find(m => m.id === "orders")!;
  const cells = (row: DemandRow) => <>
    {review.period.months.map(({ month }) => <td key={month}>{row.orderedByMonth[month] ?? "—"}</td>)}
    <td className="summary-cell">{row.orderedBoxes ?? "—"}</td>
  </>;
  return (
    <section aria-labelledby="customers-heading">
      <h2 id="customers-heading">ยอดแยกบริษัทลูกค้า</h2>
      <p className={`data-state ${metric.status}`}>{metric.label}</p>
      {metric.reason && <p>{metric.reason}</p>}
      {metric.asOf && <p>{formatSnapshotTime(metric.asOf)}</p>}
      <p id="table-help">ยอดสั่งนับตามวันที่สั่ง ไม่ใช่กำหนดส่ง · หน่วย: กล่อง<br />
        0 = มีข้อมูลแต่ไม่มียอด · — = ข้อมูลไม่พร้อม<br />
        เลื่อนตารางแนวนอนเพื่อดูทุกเดือน กดชื่อบริษัทเพื่อดูคำสั่งซื้อและการส่งจริง</p>
      <div className="table-scroll" role="region" aria-label="เลื่อนตารางยอดแยกบริษัท" tabIndex={0} aria-describedby="table-help">
        <table>
          <caption>ยอดสั่งรายเดือนแยกบริษัท (กล่อง)</caption>
          <thead><tr><th scope="col">บริษัทลูกค้า</th>
            {review.period.months.map(({ month, isPartial }) => <th scope="col" key={month}>
              {formatReportMonth(month)}{isPartial && " (ยังไม่เต็มเดือน)"}
            </th>)}
            <th scope="col">ยอดสั่งรวม</th>
          </tr></thead>
          <tbody>{review.customers.map(row => <tr key={row.customerCode}>
            <th scope="row"><Link href={demoHref(`/orders/${encodeURIComponent(row.customerCode)}`, scenario)}>{row.customerCode} {row.name}</Link></th>
            {cells(row)}
          </tr>)}</tbody>
          <tfoot><tr><th scope="row">รวมทุกบริษัท</th>{cells(review.totals)}</tr></tfoot>
        </table>
      </div>
    </section>
  );
}

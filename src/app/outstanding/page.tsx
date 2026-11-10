import Link from "next/link";
import { buildDemoReview, demoHref, formatBusinessDate, formatSnapshotTime } from "../../replenishment/demo-metrics";
import { demoDemandInput } from "../../replenishment/demo-demand";
import { demoProduct } from "../../replenishment/demo-product";

export default async function OutstandingPage({ searchParams }: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = typeof params.scenario === "string" ? params.scenario : undefined;
  const review = buildDemoReview(scenario);
  const metric = review.metrics.find(m => m.id === "outstanding")!;
  const names = new Map(demoDemandInput(scenario).customers.map(c => [c.customerCode, c.name]));
  return <main>
    <Link href={demoHref("/", scenario)}>กลับหน้าทบทวน</Link>
    <h1>รายละเอียดค้างส่ง</h1>
    <p className="demo">ข้อมูลสมมติสำหรับฝึกใช้งาน</p>
    <p>{demoProduct.sku} · {demoProduct.name}</p>
    <p>ตามรายงานค้างส่ง ไม่จำกัดวันที่สั่งหรือกำหนดส่ง รวมงานเก่าและงานจองล่วงหน้า</p>
    <p className={`data-state ${metric.status}`}>{metric.label}</p>
    {metric.reason && <p>{metric.reason}</p>}
    {metric.asOf && <p>{formatSnapshotTime(metric.asOf)}</p>}
    <p className="metric-value">ค้างส่งรวม: {metric.value === null ? "—" : `${metric.value} กล่อง`}</p>
    {review.outstandingDetails !== null && <>
      <p>หน่วย: กล่อง · เลื่อนตารางแนวนอนเพื่อดูทุกคอลัมน์</p>
      <div className="table-scroll" role="region" aria-label="เลื่อนรายการค้างส่ง" tabIndex={0}>
        <table>
          <caption>รายการค้างส่ง (กล่อง)</caption>
          <thead><tr><th scope="col">เอกสาร</th><th scope="col">บริษัทลูกค้า</th><th scope="col">วันที่สั่ง</th><th scope="col">กำหนดส่ง</th><th scope="col">ค้างส่ง</th></tr></thead>
          <tbody>{review.outstandingDetails.map((row, index) => <tr key={`${row.orderId}-${index}`}>
            <th scope="row">{row.orderId}</th>
            <td>{row.customerCode} {names.get(row.customerCode) ?? ""}</td>
            <td>{formatBusinessDate(row.orderedOn)}</td><td>{formatBusinessDate(row.dueOn)}</td><td>{row.outstandingBoxes}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {review.outstandingDetails.length === 0 && <p>ไม่มีรายการค้างส่งในรายงาน</p>}
    </>}
  </main>;
}

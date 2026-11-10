import Link from "next/link";
import { notFound } from "next/navigation";
import { buildDemoReview, demoHref, formatBusinessDate, formatReportMonth, formatSnapshotTime } from "../../../replenishment/demo-metrics";
import { demoProduct } from "../../../replenishment/demo-product";

export default async function CustomerOrdersPage({ params, searchParams }: {
  params: Promise<{ customerCode: string }>;
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const { customerCode } = await params;
  const search = await searchParams;
  const scenario = typeof search.scenario === "string" ? search.scenario : undefined;
  const review = buildDemoReview(scenario);
  const customer = review.customers.find(c => c.customerCode === customerCode);
  if (!customer) notFound();
  const metric = review.metrics.find(m => m.id === "orders")!;
  const orders = review.orderDetails?.filter(o => o.customerCode === customerCode) ?? null;
  return <main>
    <Link href={demoHref("/", scenario)}>กลับหน้าทบทวน</Link>
    <h1>คำสั่งซื้อ {customer.customerCode} {customer.name}</h1>
    <p className="demo">ข้อมูลสมมติสำหรับฝึกใช้งาน</p>
    <p>{demoProduct.sku} · {demoProduct.name}</p>
    <p>คำสั่งซื้อช่วง {formatReportMonth(review.period.months[0]!.month)} – {formatReportMonth(review.period.months[11]!.month)}</p>
    <p className={`data-state ${metric.status}`}>{metric.label}</p>
    {metric.reason && <p>{metric.reason}</p>}
    {metric.asOf && <p>{formatSnapshotTime(metric.asOf)}</p>}
    {orders?.map(order => <section key={order.orderId} aria-labelledby={`order-${order.orderId}`}>
      <h2 id={`order-${order.orderId}`}>{order.orderId}</h2>
      <p>วันที่สั่ง: {formatBusinessDate(order.orderedOn)}</p>
      <p>กำหนดส่ง: {formatBusinessDate(order.dueOn)}</p>
      <p>จำนวนสั่ง: {order.orderedBoxes} กล่อง</p>
      <p>ส่งจริงรวม: {order.shipments.reduce((sum,s) => sum + s.shippedBoxes,0)} กล่อง</p>
      {order.shipments.length === 0 ? <p>ยังไม่มีรายการส่งจริง</p> : <div className="table-scroll" role="region" aria-label={`เลื่อนรายการส่ง ${order.orderId}`} tabIndex={0}>
        <table>
          <caption>รายการส่งจริงของ {order.orderId} (กล่อง)</caption>
          <thead><tr><th scope="col">เอกสารส่ง</th><th scope="col">วันที่ส่งจริง</th><th scope="col">จำนวนส่ง</th></tr></thead>
          <tbody>{order.shipments.map(shipment => <tr key={shipment.shipmentId}>
            <th scope="row">{shipment.shipmentId}</th><td>{formatBusinessDate(shipment.shippedOn)}</td><td>{shipment.shippedBoxes}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>)}
    {orders?.length === 0 && <p>ไม่มีคำสั่งซื้อในช่วงรายงาน</p>}
  </main>;
}

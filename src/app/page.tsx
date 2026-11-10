import { demoProduct } from "../replenishment/demo-product";
import { getReviewDate } from "../replenishment/review-schedule";
import { ReviewDateForm } from "./review-date-form";
import { buildDemoReview, demoHref, formatReportMonth, formatSnapshotTime } from "../replenishment/demo-metrics";
import Link from "next/link";
import { CustomerTable } from "./customer-table";

export const dynamic = "force-dynamic";

export default async function ReplenishmentPage({ searchParams }: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const { scenario } = await searchParams;
  const selectedScenario = typeof scenario === "string" ? scenario : undefined;
  const review = buildDemoReview(selectedScenario);
  const { metrics, period } = review;
  const savedDate = await getReviewDate({ sku: demoProduct.sku, warehouseCode: demoProduct.warehouseCode });
  const formattedDate = savedDate ? new Intl.DateTimeFormat("th-TH", {
    calendar: "gregory", timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(`${savedDate}T00:00:00Z`)) : null;
  return (
    <main>
      <p className="eyebrow">MINI-ERP V2 · MANAGER</p>
      <h1>ทบทวนการเติมสต็อก</h1>
      <p className="demo">ข้อมูลสมมติสำหรับฝึกใช้งาน</p>
      <section aria-labelledby="product-heading">
        <h2 id="product-heading">{demoProduct.name}</h2>
        <p>{demoProduct.sku}</p>
      </section>
      <nav className="scenarios" aria-label="ตัวอย่างสถานะข้อมูล">
        <span>ลองข้อมูลสมมติ: </span>
        <a href="/">มีข้อมูล</a>
        <a href="/?scenario=missing-stock">คงเหลือไม่พร้อม</a>
        <a href="/?scenario=missing-orders">ยอดสั่งไม่พร้อม</a>
        <a href="/?scenario=missing-outstanding">ค้างส่งไม่พร้อม</a>
        <a href="/?scenario=zero">คงเหลือเป็นศูนย์</a>
        <a href="/?scenario=old">งานค้างเก่า</a>
        <a href="/?scenario=booking">งานจองล่วงหน้า</a>
        <a href="/?scenario=combined">งานเก่าและงานจอง</a>
      </nav>
      <p>ช่วงยอดสั่ง: {formatReportMonth(period.months[0]!.month)} – {formatReportMonth(period.months[11]!.month)} (เดือนปัจจุบันยังไม่เต็มเดือน)</p>
      <div className="metrics">
        {metrics.map(metric => (
          <section key={metric.id} aria-labelledby={`${metric.id}-heading`}>
            <h2 id={`${metric.id}-heading`}>{metric.title}</h2>
            <p className="metric-value">{metric.value === null ? "—" : `${metric.value} กล่อง`}</p>
            <p className={`data-state ${metric.status}`}>{metric.label}</p>
            {metric.reason && <p>{metric.reason}</p>}
            {metric.asOf && <p className="snapshot-time">{formatSnapshotTime(metric.asOf)}</p>}
            {metric.id === "outstanding" && <>
              <p>ตามรายงานค้างส่ง ไม่จำกัดเวลา รวมงานเก่าและงานจองล่วงหน้า</p>
              <Link href={demoHref("/outstanding", selectedScenario)}>ดูรายละเอียดค้างส่ง</Link>
            </>}
          </section>
        ))}
      </div>
      <CustomerTable review={review} scenario={selectedScenario} />
      <section aria-labelledby="decision-heading">
        <h2 id="decision-heading">ข้อมูลประกอบการตัดสินใจ</h2>
        <dl>
          <div><dt>MOQ</dt><dd>{demoProduct.moqBoxes} กล่อง</dd></div>
          <div><dt>Lead time</dt><dd>{demoProduct.leadTimeDays} วัน</dd></div>
        </dl>
        <p>Manager พิจารณาปริมาณและเวลาที่จะสั่งซื้อด้วยตนเอง</p>
      </section>
      <section aria-labelledby="review-heading">
        <h2 id="review-heading">ทบทวนครั้งถัดไป</h2>
        <p>{formattedDate ? `วันทบทวนที่บันทึกไว้: ${formattedDate}` : "ยังไม่ได้ตั้งวันทบทวน"}</p>
        <ReviewDateForm savedDate={savedDate} />
      </section>
    </main>
  );
}

import { expect, test } from "vitest";
import { reviewDemand } from "../../src/replenishment/review-demand";
import { demoDemandInput } from "../../src/replenishment/demo-demand";

const run = (scenario?: string) => reviewDemand(demoDemandInput(scenario));
test("AT-R2-01 สั่ง 100 ส่ง 60 ใช้รายงานค้าง 40", () => {
  const r = run("only-a");
  expect(r.totals.orderedBoxes).toBe(100);
  expect(r.totals.orderedByMonth["2026-10"]).toBe(100);
  expect(r.metrics.find(m => m.id === "outstanding")?.value).toBe(40);
});
test("AT-R2-02 ส่งหลายครั้งไม่ทำให้ยอดสั่งซ้ำหรือย้ายเดือน", () => {
  const r = run("only-b");
  expect(r.totals.orderedBoxes).toBe(80);
  expect(r.totals.orderedByMonth["2026-09"]).toBe(80);
  expect(r.totals.orderedByMonth["2026-10"]).toBe(0);
});
test("AT-R2-03 แยกบริษัทและรวมสั่ง 180", () => {
  const r = run();
  expect(r.customers.map(c => [c.customerCode, c.orderedBoxes])).toEqual([["C001", 100], ["C002", 80]]);
  expect(r.totals.orderedBoxes).toBe(180);
});
test("AT-R2-04/06 ครบ 12 เดือนและเติมศูนย์เฉพาะข้อมูลพร้อม", () => {
  const r = run();
  expect(r.period.months.map(m => m.month)).toEqual(["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
  expect(r.period.months.filter(m => m.isPartial).map(m => m.month)).toEqual(["2026-11"]);
  expect(Object.values(r.totals.orderedByMonth)).toEqual([0,0,0,0,0,0,0,0,0,80,100,0]);
});
test("AT-R2-05 ขอบเขตใช้วันที่สั่งและ snapshot ไม่ใช้วันที่ส่ง", () => {
  const input = demoDemandInput("only-a");
  const base = input.orders.data![0]!;
  input.orders.data = [
    { ...base, orderId: "EARLY", orderedOn: "2025-11-30", orderedBoxes: 9 },
    { ...base, orderId: "START", orderedOn: "2025-12-01", orderedBoxes: 11 },
    { ...base, orderId: "AFTER", orderedOn: "2026-11-11", orderedBoxes: 13 },
  ];
  const r = reviewDemand(input);
  expect(r.totals.orderedBoxes).toBe(11);
  expect(r.totals.orderedByMonth["2025-12"]).toBe(11);
  expect(r.orderDetails?.map(o => o.orderId)).toEqual(["START"]);
});
test.each([["old",180,80],["booking",230,120],["combined",230,130]] as const)("AT-R2-07/08/09 งานเก่า/จอง %s", (scenario, ordered, backlog) => {
  const r = run(scenario);
  expect(r.totals.orderedBoxes).toBe(ordered);
  expect(r.metrics.find(m => m.id === "outstanding")?.value).toBe(backlog);
  expect(r.outstandingDetails?.reduce((sum, row) => sum + row.outstandingBoxes, 0)).toBe(backlog);
  if (scenario !== "old") expect(r.customers.find(c => c.customerCode === "C002")?.orderedByMonth["2026-11"]).toBe(50);
});
test("AT-R2-10 กรอง SKU ทุกแหล่ง", () => {
  const r = run("other-sku");
  expect(r.metrics.map(m => m.value)).toEqual([150,180,70]);
  expect(r.orderDetails?.every(o => o.sku === "VINYL-001")).toBe(true);
  expect(r.outstandingDetails?.every(o => o.sku === "VINYL-001")).toBe(true);
});
test("AT-R2-11 ไม่หักคงเหลือหรือบวกสั่งกับค้าง", () => {
  expect(run().metrics.map(m => m.value)).toEqual([150,180,70]);
});
test("AT-R2-12 ส่งครบแต่ประวัติสั่งยังอยู่", () => {
  expect(run("fulfilled").metrics.map(m => m.value)).toEqual([150,100,0]);
});
test.each(["stock", "orders", "outstanding"])("AT-R2-16 ข้อมูล %s ขาด", id => {
  const r = run(`missing-${id}`);
  expect(r.metrics.find(m => m.id === id)).toMatchObject({ value: null, status: "unavailable" });
  if (id === "orders") {
    expect(Object.values(r.totals.orderedByMonth)).toEqual(Array(12).fill(null));
    expect(r.orderDetails).toBeNull();
  }
  if (id === "outstanding") expect(r.outstandingDetails).toBeNull();
});
test("AT-R2-16 ใช้ยอดจากรายงานแม้ไม่เท่ากับสั่งลบส่ง", () => {
  const input = demoDemandInput("only-a");
  input.backlog.data![0]!.outstandingBoxes = 7;
  expect(reviewDemand(input).metrics.find(m => m.id === "outstanding")?.value).toBe(7);
  input.backlog.data = null;
  expect(reviewDemand(input).metrics.find(m => m.id === "outstanding")?.value).toBeNull();
});
test("AT-R2-17 ศูนย์/ไม่ยืนยัน/flag ค้าง และเวลาแต่ละแหล่ง", () => {
  const input = demoDemandInput("zero");
  input.stock.asOf = "2026-11-10T08:00:00+07:00";
  expect(reviewDemand(input).metrics[0]).toMatchObject({ value: 0, status: "unverified", asOf: input.stock.asOf });
  input.backlog.data = null;
  input.backlog.verifiedWithExpress = true;
  expect(reviewDemand(input).metrics[2]).toMatchObject({ value: null, status: "unavailable" });
});
test("AT-R2-18 เก็บเอกสารเก่าและกำหนดส่งอนาคตครบ", () => {
  const r = run("combined");
  expect(r.outstandingDetails?.map(o => [o.orderId,o.orderedOn,o.dueOn,o.outstandingBoxes])).toEqual([
    ["ORD-001","2026-10-01","2026-10-15",40], ["ORD-002","2026-09-01","2026-10-15",30],
    ["ORD-OLD","2025-10-01","2025-10-15",10], ["ORD-BOOK","2026-11-05","2027-01-15",50],
  ]);
});
test("AT-R2-19 รายการส่งอ้างอิงคำสั่งเดิม ไม่รวมส่งหลัง snapshot", () => {
  const input = demoDemandInput("only-b");
  input.orders.data![0]!.shipments.push({ shipmentId: "FUTURE", shippedOn: "2026-11-11", shippedBoxes: 9 });
  expect(reviewDemand(input).orderDetails?.[0]?.shipments.map(s => [s.shippedOn,s.shippedBoxes])).toEqual([["2026-09-10",30],["2026-10-15",20]]);
});

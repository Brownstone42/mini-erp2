import { expect, test } from "@playwright/test";

for (const [id,scenario,ordered,backlog] of [
  ["01","only-a",100,40], ["02","only-b",80,30], ["07","old",180,80],
  ["08","booking",230,120], ["09","combined",230,130], ["10","other-sku",180,70], ["12","fulfilled",100,0],
] as const) {
  test(`AT-R2-${id} หน้าหลัก ${scenario}`, async ({ page }) => {
    await page.goto(`/?scenario=${scenario}`);
    await expect(page.getByRole("region", { name: "ยอดสั่งในช่วง", exact: true }).getByText(`${ordered} กล่อง`, { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "ยอดค้างส่ง", exact: true }).getByText(`${backlog} กล่อง`, { exact: true })).toBeVisible();
    await expect(page.getByRole("row", { name: /^รวมทุกบริษัท/ }).getByRole("cell").last()).toHaveText(String(ordered));
    await expect(page.getByRole("combobox", { name: /คลัง/ })).toHaveCount(0);
    await expect(page.getByText(/WH-01|OTHER-SKU/)).toHaveCount(0);
  });
}

test("AT-R2-18 รายละเอียดค้างแสดงสี่รายการและวันที่ถูกชนิด", async ({ page }) => {
  await page.goto("/?scenario=combined");
  await page.getByRole("link", { name: "ดูรายละเอียดค้างส่ง", exact: true }).click();
  await expect(page.getByRole("heading", { name: "รายละเอียดค้างส่ง", exact: true })).toBeVisible();
  const table = page.getByRole("table", { name: "รายการค้างส่ง (กล่อง)" });
  await expect(table.getByRole("columnheader")).toHaveText(["เอกสาร", "บริษัทลูกค้า", "วันที่สั่ง", "กำหนดส่ง", "ค้างส่ง"]);
  for (const [id,cells] of [
    ["ORD-001",["C001 บริษัทเอ","1 ต.ค. 2026","15 ต.ค. 2026","40"]],
    ["ORD-002",["C002 บริษัทบี","1 ก.ย. 2026","15 ต.ค. 2026","30"]],
    ["ORD-OLD",["C001 บริษัทเอ","1 ต.ค. 2025","15 ต.ค. 2025","10"]],
    ["ORD-BOOK",["C002 บริษัทบี","5 พ.ย. 2026","15 ม.ค. 2027","50"]],
  ] as const) {
    await expect(table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: id, exact: true }) }).getByRole("cell")).toHaveText([...cells]);
  }
  await expect(page.getByText("ค้างส่งรวม: 130 กล่อง", { exact: true })).toBeVisible();
  await expect(page.getByText("ยังไม่ยืนยันกับ Express", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/r2-backlog.png", fullPage: true });
});

test("AT-R2-19 รายละเอียดสั่งเทียบส่งจริง", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "C002 บริษัทบี", exact: true }).click();
  await expect(page.getByRole("heading", { name: "คำสั่งซื้อ C002 บริษัทบี", exact: true })).toBeVisible();
  const order = page.getByRole("region", { name: "ORD-002", exact: true });
  await expect(order.getByText("วันที่สั่ง: 1 ก.ย. 2026", { exact: true })).toBeVisible();
  await expect(order.getByText("จำนวนสั่ง: 80 กล่อง", { exact: true })).toBeVisible();
  await expect(order.getByText("ส่งจริงรวม: 50 กล่อง", { exact: true })).toBeVisible();
  await expect(order.getByRole("row", { name: /^SHIP-002/ }).getByRole("cell")).toHaveText(["10 ก.ย. 2026", "30"]);
  await expect(order.getByRole("row", { name: /^SHIP-003/ }).getByRole("cell")).toHaveText(["15 ต.ค. 2026", "20"]);
  await expect(page.getByText("ORD-001", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/r2-order.png", fullPage: true });
});

for (const width of [1280,390]) {
  test(`AT-R2-20 อ่านและกลับจากหน้ารายละเอียด ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/?scenario=combined");
    const scroll = page.getByRole("region", { name: "เลื่อนตารางยอดแยกบริษัท", exact: true });
    await expect(scroll).toBeVisible();
    await scroll.focus();
    await scroll.evaluate(e => { e.scrollLeft = e.scrollWidth; });
    await expect(scroll.getByRole("columnheader", { name: "ยอดสั่งรวม", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "ดูรายละเอียดค้างส่ง", exact: true }).click();
    await expect(page.getByText("ค้างส่งรวม: 130 กล่อง", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "กลับหน้าทบทวน", exact: true }).click();
    await expect(page.getByRole("region", { name: "ยอดค้างส่ง", exact: true }).getByText("130 กล่อง", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "C002 บริษัทบี", exact: true }).click();
    await expect(page.getByRole("region", { name: "ORD-BOOK", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "กลับหน้าทบทวน", exact: true }).click();
    await expect(page.getByText("VINYL-001", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "ยอดสั่งในช่วง", exact: true }).getByText("230 กล่อง", { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/r2-${width}.png`, fullPage: true });
  });
}

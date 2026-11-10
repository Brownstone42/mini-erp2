import { expect, test } from "@playwright/test";

test("AT-R2-03/04/06/11 ตารางสั่งครบทุกช่องและการ์ดตรงกัน", async ({ page }) => {
  await page.goto("/");
  const table = page.getByRole("table", { name: "ยอดสั่งรายเดือนแยกบริษัท (กล่อง)" });
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader")).toHaveText(["บริษัทลูกค้า", "ธ.ค. 2025", "ม.ค. 2026", "ก.พ. 2026", "มี.ค. 2026", "เม.ย. 2026", "พ.ค. 2026", "มิ.ย. 2026", "ก.ค. 2026", "ส.ค. 2026", "ก.ย. 2026", "ต.ค. 2026", "พ.ย. 2026 (ยังไม่เต็มเดือน)", "ยอดสั่งรวม"]);
  await expect(table.getByRole("row")).toHaveCount(4);
  await expect(table.getByRole("row", { name: /^C001 บริษัทเอ/ }).getByRole("cell")).toHaveText(["0","0","0","0","0","0","0","0","0","0","100","0","100"]);
  await expect(table.getByRole("row", { name: /^C002 บริษัทบี/ }).getByRole("cell")).toHaveText(["0","0","0","0","0","0","0","0","0","80","0","0","80"]);
  await expect(table.getByRole("row", { name: /^รวมทุกบริษัท/ }).getByRole("cell")).toHaveText(["0","0","0","0","0","0","0","0","0","80","100","0","180"]);
  for (const [name,value] of [["ยอดคงเหลือ","150 กล่อง"],["ยอดสั่งในช่วง","180 กล่อง"],["ยอดค้างส่ง","70 กล่อง"]]) {
    await expect(page.getByRole("region", { name, exact: true }).getByText(value, { exact: true })).toBeVisible();
  }
  await expect(table.getByRole("columnheader", { name: /ค้างส่ง|ส่งจริง/ })).toHaveCount(0);
  await expect(page.getByText(/ORD-001|SHIP-001/)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "ยอดแยกบริษัทลูกค้า", exact: true }).getByText("ยังไม่ยืนยันกับ Express", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/r2-main.png", fullPage: true });
});

test("AT-R2-16 ยอดสั่งไม่พร้อมทุกช่องเป็นขีด ค้างยังมีข้อมูล", async ({ page }) => {
  await page.goto("/?scenario=missing-orders");
  const table = page.getByRole("table", { name: "ยอดสั่งรายเดือนแยกบริษัท (กล่อง)" });
  for (const name of [/^C001/, /^C002/, /^รวมทุกบริษัท/]) {
    await expect(table.getByRole("row", { name }).getByRole("cell")).toHaveText(Array(13).fill("—"));
  }
  await expect(page.getByRole("region", { name: "ยอดค้างส่ง", exact: true }).getByText("70 กล่อง", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "C001 บริษัทเอ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "คำสั่งซื้อ C001 บริษัทเอ", exact: true })).toBeVisible();
  await expect(page.getByText("ข้อมูลไม่พร้อม", { exact: true })).toBeVisible();
  await expect(page.getByText("ORD-001", { exact: true })).toHaveCount(0);
});

test("AT-R2-16 ค้างไม่พร้อมไม่คำนวณแทนและรายละเอียดไม่มีตัวเลขหลอก", async ({ page }) => {
  await page.goto("/?scenario=missing-outstanding");
  await expect(page.getByRole("region", { name: "ยอดค้างส่ง", exact: true }).getByText("—", { exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /^รวมทุกบริษัท/ }).getByRole("cell").last()).toHaveText("180");
  await page.getByRole("link", { name: "ดูรายละเอียดค้างส่ง", exact: true }).click();
  await expect(page.getByRole("heading", { name: "รายละเอียดค้างส่ง", exact: true })).toBeVisible();
  await expect(page.getByText("ข้อมูลไม่พร้อม", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

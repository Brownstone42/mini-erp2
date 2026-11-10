import { expect, test } from "@playwright/test";
import { withTestDatabase } from "../support/database";

async function clearTestSchedule() {
  await withTestDatabase((pool) => pool.query(
    'DELETE FROM "ReviewSchedule" WHERE "sku" = $1 AND "warehouseCode" = $2',
    ["VINYL-001", "WH-01"],
  ));
}

test.beforeEach(clearTestSchedule);
test.afterEach(clearTestSchedule);

test("AT-R2-14: บันทึก 20 พ.ย. 2026 แล้วเปิด browser context ใหม่ยังเห็นวันเดิม", async ({ page, browser }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ทบทวนการเติมสต็อก", exact: true })).toBeVisible();
  await expect(page.getByText("ยังไม่ได้ตั้งวันทบทวน", { exact: true })).toBeVisible();
  await page.getByLabel("วันกลับมาทบทวน").fill("2026-11-20");
  await page.getByRole("button", { name: "บันทึกวันทบทวน", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("บันทึกวันทบทวนแล้ว");
  // อ่าน PostgreSQL โดย connection ใหม่ แยกจาก Prisma/หน้าเว็บ
  const saved = await withTestDatabase((pool) => pool.query(
    'SELECT "reviewDate"::text AS date FROM "ReviewSchedule" WHERE "sku" = $1 AND "warehouseCode" = $2',
    ["VINYL-001", "WH-01"],
  ));
  expect(saved.rows).toEqual([{ date: "2026-11-20" }]);

  // Context ใหม่ไม่มี cookie/localStorage เดิม จึงต้องอ่านค่าที่บันทึกบน server
  const newContext = await browser.newContext();
  try {
    const reopened = await newContext.newPage();
    await reopened.goto("http://127.0.0.1:3100/");
    await expect(reopened.getByLabel("วันกลับมาทบทวน")).toHaveValue("2026-11-20");
    await expect(reopened.getByText("วันทบทวนที่บันทึกไว้: 20 พ.ย. 2026", { exact: true })).toBeVisible();
    await reopened.screenshot({ path: "test-results/at-12-saved.png", fullPage: true });
  } finally {
    await newContext.close();
  }
});

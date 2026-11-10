import { expect, test } from "@playwright/test";
import { withTestDatabase } from "../support/database";
import { testStagingCredentials } from "../support/staging-auth";

test.beforeEach(async () => {
  // เตรียมวันเดิมในฐานทดสอบเท่านั้น ไม่ขึ้นกับการรัน AT-12 มาก่อน
  await withTestDatabase((pool) => pool.query(
    `INSERT INTO "ReviewSchedule" ("sku", "warehouseCode", "reviewDate")
     VALUES ($1, $2, $3::date)
     ON CONFLICT ("sku", "warehouseCode") DO UPDATE SET "reviewDate" = EXCLUDED."reviewDate"`,
    ["VINYL-001", "WH-01", "2026-11-20"],
  ));
});

test.afterEach(async () => {
  await withTestDatabase((pool) => pool.query(
    'DELETE FROM "ReviewSchedule" WHERE "sku" = $1 AND "warehouseCode" = $2',
    ["VINYL-001", "WH-01"],
  ));
});

test("AT-R2-15: เปลี่ยนวันทบทวน 20 เป็น 25 พ.ย. 2026 แล้วเปิดหน้าใหม่เห็นวันใหม่", async ({ page, browser }) => {
  await page.goto("/");
  await expect(page.getByLabel("วันกลับมาทบทวน")).toHaveValue("2026-11-20");
  await expect(page.getByText("วันทบทวนที่บันทึกไว้: 20 พ.ย. 2026", { exact: true })).toBeVisible();

  await page.getByLabel("วันกลับมาทบทวน").fill("2026-11-25");
  await page.getByRole("button", { name: "บันทึกวันทบทวน", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("บันทึกวันทบทวนแล้ว");
  await expect(page.getByText("วันทบทวนที่บันทึกไว้: 25 พ.ย. 2026", { exact: true })).toBeVisible();

  // ตรวจว่ามีแถวเดียวและวันที่ใหม่แทนที่วันเดิมจริง
  const saved = await withTestDatabase((pool) => pool.query(
    'SELECT "reviewDate"::text AS date FROM "ReviewSchedule" WHERE "sku" = $1 AND "warehouseCode" = $2',
    ["VINYL-001", "WH-01"],
  ));
  expect(saved.rows).toEqual([{ date: "2026-11-25" }]);

  const newContext = await browser.newContext({ httpCredentials: testStagingCredentials });
  try {
    const reopened = await newContext.newPage();
    await reopened.goto("http://127.0.0.1:3100/");
    await expect(reopened.getByLabel("วันกลับมาทบทวน")).toHaveValue("2026-11-25");
    await expect(reopened.getByText("วันทบทวนที่บันทึกไว้: 25 พ.ย. 2026", { exact: true })).toBeVisible();
    await expect(reopened.getByText("วันทบทวนที่บันทึกไว้: 20 พ.ย. 2026", { exact: true })).toHaveCount(0);
    await reopened.screenshot({ path: "test-results/at-13-updated.png", fullPage: true });
  } finally {
    await newContext.close();
  }
});

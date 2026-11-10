import { expect, test } from "@playwright/test";

test("AT-R2-16/17: ข้อมูลสมมติ 150/180/70 ต้องระบุว่ายังไม่ยืนยันกับ Express", async ({ page }) => {
  await page.goto("/");
  for (const [name, value] of [["ยอดคงเหลือ", "150 กล่อง"], ["ยอดสั่งในช่วง", "180 กล่อง"], ["ยอดค้างส่ง", "70 กล่อง"]]) {
    const region = page.getByRole("region", { name, exact: true });
    await expect(region.getByText(value, { exact: true })).toBeVisible();
    await expect(region.getByText("ยังไม่ยืนยันกับ Express", { exact: true })).toBeVisible();
    await expect(region.getByText("ข้อมูล ณ 10 พ.ย. 2026 เวลา 09:00 น.", { exact: true })).toBeVisible();
  }
  await expect(page.getByText("ยืนยันกับ Express แล้ว", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/at-14-unverified.png", fullPage: true });
});

for (const scenario of [
  { query: "missing-stock", name: "ยอดคงเหลือ", available: "ยอดค้างส่ง", value: "70 กล่อง" },
  { query: "missing-orders", name: "ยอดสั่งในช่วง", available: "ยอดคงเหลือ", value: "150 กล่อง" },
  { query: "missing-outstanding", name: "ยอดค้างส่ง", available: "ยอดคงเหลือ", value: "150 กล่อง" },
]) {
  test(`AT-R2-16/17: ${scenario.name} ไม่พร้อมต้องไม่แสดง 0 และไม่กระทบส่วนที่พร้อม`, async ({ page }) => {
    await page.goto(`/?scenario=${scenario.query}`);
    const region = page.getByRole("region", { name: scenario.name, exact: true });
    await expect(region.getByText("ข้อมูลไม่พร้อม", { exact: true })).toBeVisible();
    await expect(region.getByText("—", { exact: true })).toBeVisible();
    await expect(region.getByText(/\d+ กล่อง/)).toHaveCount(0);
    await expect(region.getByText("ยืนยันกับ Express แล้ว", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: scenario.available, exact: true }).getByText(scenario.value, { exact: true })).toBeVisible();
    if (scenario.query === "missing-outstanding") {
      await page.screenshot({ path: "test-results/at-14-unavailable.png", fullPage: true });
    }
  });
}

test("AT-R2-16/17: ข้อมูลครบแต่ยอดเป็นศูนย์ต้องแสดง 0 พร้อมสถานะยังไม่ยืนยัน", async ({ page }) => {
  await page.goto("/?scenario=zero");
  const region = page.getByRole("region", { name: "ยอดคงเหลือ", exact: true });
  await expect(region.getByText("0 กล่อง", { exact: true })).toBeVisible();
  await expect(region.getByText("ข้อมูลไม่พร้อม", { exact: true })).toHaveCount(0);
  await expect(region.getByText("ยังไม่ยืนยันกับ Express", { exact: true })).toBeVisible();
});

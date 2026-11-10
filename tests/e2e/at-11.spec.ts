import { expect, test } from "@playwright/test";

test("AT-R2-13: Manager เห็น MOQ 200 กล่องและ lead time 30 วันพร้อมหน่วย", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ทบทวนการเติมสต็อก", exact: true })).toBeVisible();
  const information = page.getByRole("region", { name: "ข้อมูลประกอบการตัดสินใจ" });
  await expect(information.getByText("MOQ", { exact: true })).toBeVisible();
  await expect(information.getByText("200 กล่อง", { exact: true })).toBeVisible();
  await expect(information.getByText("Lead time", { exact: true })).toBeVisible();
  await expect(information.getByText("30 วัน", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/at-11-desktop.png", fullPage: true });
});

test("AT-R2-13: เปิดข้อมูลเพื่อพิจารณาเอง ไม่มีการส่งคำขอสั่งซื้ออัตโนมัติ", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });
  await page.goto("/");
  await expect(page.getByText("Manager พิจารณาปริมาณและเวลาที่จะสั่งซื้อด้วยตนเอง")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "ทบทวนการเติมสต็อก", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
  await expect(page.getByRole("button", { name: /สั่งซื้อ|purchase/i })).toHaveCount(0);
});

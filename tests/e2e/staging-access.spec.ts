import { expect, test } from "@playwright/test";
import { withTestDatabase } from "../support/database";

test("anonymous and wrong credentials cannot read pages or submit writes", async () => {
  // Node fetch does not inherit Playwright's configured HTTP credentials.
  const base = "http://127.0.0.1:3100";
    for (const path of ["/", "/orders/C001", "/outstanding", "/?scenario=combined", "/?_rsc=probe"]) {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain("Basic");
      expect(await response.text()).not.toContain("บริษัทเอ");
    }
    const wrong = await fetch(base, { headers: { Authorization: `Basic ${Buffer.from("ci-reviewer:wrong").toString("base64")}` } });
    expect(wrong.status).toBe(401);
    const health = await fetch(`${base}/api/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    expect((await fetch(`${base}/api/health`, { method: "POST" })).status).toBe(401);
});

test("replaying a real save request without credentials cannot change the database", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("วันกลับมาทบทวน").fill("2026-11-25");
  const sent = page.waitForRequest(r => r.method() === "POST" && new URL(r.url()).pathname === "/");
  await page.getByRole("button", { name: "บันทึกวันทบทวน", exact: true }).click();
  const action = await sent;
  await expect(page.getByRole("status")).toHaveText("บันทึกวันทบทวนแล้ว");
  const headers = await action.allHeaders();
  delete headers.authorization;
  delete headers.cookie;
  delete headers["content-length"];
  try {
    const response = await fetch(action.url(), {
      method: "POST", headers, body: action.postData()!.replaceAll("2026-11-25", "2026-11-20"),
    });
    expect(response.status).toBe(401);
    const saved = await withTestDatabase(pool => pool.query('SELECT "reviewDate"::text AS date FROM "ReviewSchedule" WHERE "sku"=$1 AND "warehouseCode"=$2', ["VINYL-001", "WH-01"]));
    expect(saved.rows).toEqual([{ date: "2026-11-25" }]);
  } finally {
    await withTestDatabase(pool => pool.query('DELETE FROM "ReviewSchedule" WHERE "sku"=$1 AND "warehouseCode"=$2', ["VINYL-001", "WH-01"]));
  }
});

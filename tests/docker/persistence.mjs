import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const exec = promisify(execFile);
const composeArgs = ["compose", "-f", "compose.docker.yaml"];
const compose = async (...args) => (await exec("docker", [...composeArgs, ...args], { timeout: 180_000, maxBuffer: 2_000_000 })).stdout.trim();
const baseURL = "http://127.0.0.1:3300";
const date = "2026-11-25";
const sql = 'SELECT "reviewDate"::text FROM "ReviewSchedule" WHERE "sku" = \'VINYL-001\' AND "warehouseCode" = \'WH-01\'';
const storedDate = () => compose("exec", "-T", "db", "psql", "-U", "mini_erp_docker", "-d", "mini_erp_docker", "-At", "-c", sql);
await mkdir("test-results/docker", { recursive: true });
assert.equal((await fetch(`${baseURL}/api/health`)).status, 200);
const before = { app: await compose("ps", "-q", "app"), db: await compose("ps", "-q", "db") };
assert.ok(before.app && before.db, "Start the isolated Docker stack before this test");
const inspection = JSON.parse((await exec("docker", ["inspect", before.db])).stdout)[0];
const volume = inspection.Mounts.find(m => m.Destination === "/var/lib/postgresql/data").Name;
assert.equal(volume, "mini-erp2-demo_review_data");

let browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(baseURL);
  const { expect } = await import("@playwright/test");
  for (const [name,value] of [["ยอดคงเหลือ","150 กล่อง"],["ยอดสั่งในช่วง","180 กล่อง"],["ยอดค้างส่ง","70 กล่อง"]]) {
    await expect(page.getByRole("region", { name, exact: true }).getByText(value, { exact: true })).toBeVisible();
  }
  await page.getByLabel("วันกลับมาทบทวน").fill(date);
  await page.getByRole("button", { name: "บันทึกวันทบทวน", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("บันทึกวันทบทวนแล้ว");
  assert.equal(await storedDate(), date);
  await page.screenshot({ path: "test-results/docker/before.png", fullPage: true });
} finally { await browser.close(); }
console.log("Saved 2026-11-25 through the production UI; PostgreSQL confirms it.");

await compose("down"); // Intentionally no -v: keep the named database volume.
assert.equal(await compose("ps", "-q"), "");
console.log("Containers removed; named volume retained. Recreating containers...");
await compose("up", "-d", "--wait", "--wait-timeout", "120");
const after = { app: await compose("ps", "-q", "app"), db: await compose("ps", "-q", "db") };
assert.notEqual(before.app, after.app);
assert.notEqual(before.db, after.db);
assert.equal(await storedDate(), date);
assert.equal((await fetch(`${baseURL}/api/health`)).status, 200);

browser = await chromium.launch();
try {
  const { expect } = await import("@playwright/test");
  const page = await browser.newPage();
  await page.goto(baseURL);
  await expect(page.getByLabel("วันกลับมาทบทวน")).toHaveValue(date);
  await expect(page.getByText("วันทบทวนที่บันทึกไว้: 25 พ.ย. 2026", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "ดูรายละเอียดค้างส่ง", exact: true }).click();
  await expect(page.getByRole("heading", { name: "รายละเอียดค้างส่ง", exact: true })).toBeVisible();
  await expect(page.getByText("ค้างส่งรวม: 70 กล่อง", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "กลับหน้าทบทวน", exact: true }).click();
  await expect(page.getByLabel("วันกลับมาทบทวน")).toHaveValue(date);
  await page.screenshot({ path: "test-results/docker/after.png", fullPage: true });
} finally { await browser.close(); }
await writeFile("test-results/docker/persistence.json", JSON.stringify({ date, volume, before, after, passed: true }, null, 2));
console.log("PASS: new containers + fresh browser retain the saved date; health and detail page pass.");

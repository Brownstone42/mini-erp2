import { getDatabase } from "../db/client";
import type { ProductWarehouse } from "./review-replenishment";

export async function getReviewDate(selection: ProductWarehouse): Promise<string | null> {
  const schedule = await getDatabase().reviewSchedule.findUnique({
    where: { sku_warehouseCode: selection },
  });
  return schedule?.reviewDate.toISOString().slice(0, 10) ?? null;
}

export function parseReviewDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid review date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Invalid review date");
  }
  return date;
}

export async function saveReviewDate(selection: ProductWarehouse, value: string) {
  const reviewDate = parseReviewDate(value);
  await getDatabase().reviewSchedule.upsert({
    where: { sku_warehouseCode: selection },
    create: { ...selection, reviewDate },
    update: { reviewDate },
  });
}

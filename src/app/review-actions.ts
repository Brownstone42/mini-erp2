"use server";

import { revalidatePath } from "next/cache";
import { demoProduct } from "../replenishment/demo-product";
import { parseReviewDate, saveReviewDate } from "../replenishment/review-schedule";

export async function saveReviewDateAction(
  _previous: { message: string; error: string },
  formData: FormData,
) {
  const value = formData.get("reviewDate");
  if (typeof value !== "string") return { message: "", error: "กรุณาเลือกวันที่ที่ถูกต้อง" };
  try {
    parseReviewDate(value);
  } catch {
    return { message: "", error: "กรุณาเลือกวันที่ที่ถูกต้อง" };
  }
  try {
    await saveReviewDate({ sku: demoProduct.sku, warehouseCode: demoProduct.warehouseCode }, value);
  } catch {
    return { message: "", error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
  revalidatePath("/");
  return { message: "บันทึกวันทบทวนแล้ว", error: "" };
}

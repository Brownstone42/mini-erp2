"use client";

import { useActionState } from "react";
import { saveReviewDateAction } from "./review-actions";

export function ReviewDateForm({ savedDate }: { savedDate: string | null }) {
  const [state, action, pending] = useActionState(saveReviewDateAction, { message: "", error: "" });
  return (
    <form action={action}>
      <label htmlFor="reviewDate">วันกลับมาทบทวน</label>
      <div className="form-controls">
        <input key={savedDate ?? "empty"} id="reviewDate" name="reviewDate" type="date" required defaultValue={savedDate ?? ""} />
        <button type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกวันทบทวน"}</button>
      </div>
      <p role="status">{state.message}</p>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}

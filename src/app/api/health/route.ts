import { getDatabase } from "../../../db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check the application table too, so an unapplied migration is not healthy.
    await getDatabase().reviewSchedule.count();
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/health";

// Readiness: can this instance serve traffic? Requires the database.
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await checkDatabase();
  return NextResponse.json({ status: db.ok ? "ready" : "not_ready", db }, { status: db.ok ? 200 : 503 });
}

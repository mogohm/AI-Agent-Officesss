import { NextResponse } from "next/server";

// Liveness: the web process is running. No dependencies checked.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}

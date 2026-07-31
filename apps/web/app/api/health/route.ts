import { NextResponse } from "next/server";
import { checkDatabase, checkRedis, checkWorker } from "@/lib/health";

// Deep health: database + redis + background worker. 200 only if all critical
// dependencies are healthy (redis-not-configured is treated as healthy).
export const dynamic = "force-dynamic";

export async function GET() {
  const [database, redis, worker] = await Promise.all([checkDatabase(), checkRedis(), checkWorker()]);
  const healthy = database.ok && redis.ok; // worker is degraded-not-fatal for the web tier
  return NextResponse.json(
    { status: healthy ? "healthy" : "unhealthy", checks: { database, redis, worker } },
    { status: healthy ? 200 : 503 },
  );
}

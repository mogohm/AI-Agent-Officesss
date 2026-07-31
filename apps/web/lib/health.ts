import { db } from "@/lib/db";
import { redisAvailable, env } from "@/lib/env";

export type Check = { ok: boolean; latencyMs?: number; detail?: string };

export async function checkDatabase(): Promise<Check> {
  const t0 = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, detail: err instanceof Error ? err.message : "db error" };
  }
}

export async function checkRedis(): Promise<Check> {
  if (!redisAvailable || !env.REDIS_URL) return { ok: true, detail: "not configured (DB-queue fallback)" };
  const t0 = Date.now();
  try {
    const IORedis = (await import("ioredis")).default;
    const r = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
    await r.connect();
    await r.ping();
    await r.quit();
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, detail: err instanceof Error ? err.message : "redis error" };
  }
}

/** A worker is considered live if it heartbeat within the last 40s. */
export async function checkWorker(): Promise<Check & { queueDepth?: number }> {
  try {
    const [latest, queueDepth] = await Promise.all([
      db.workerHeartbeat.findFirst({ orderBy: { lastSeenAt: "desc" } }),
      db.agentTask.count({ where: { status: "QUEUED" } }),
    ]);
    if (!latest) return { ok: false, detail: "no worker has ever reported", queueDepth };
    const ageMs = Date.now() - latest.lastSeenAt.getTime();
    return { ok: ageMs < 40_000 && latest.status !== "offline", detail: `${latest.processName} · ${Math.round(ageMs / 1000)}s ago · ${latest.status}`, queueDepth };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "worker check error" };
  }
}

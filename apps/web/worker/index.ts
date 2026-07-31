import "dotenv/config";
import { db } from "@/lib/db";
import { env, redisAvailable } from "@/lib/env";
import { logger } from "@/lib/logger";
import { executeQueuedTask } from "@/lib/execution/runTask";
import { queueConfig } from "@/lib/queue";

/**
 * Standalone background worker.
 *
 * Two intake paths (both drive the same executeQueuedTask, which locks the row
 * atomically so a task is never processed twice):
 *   1. Redis/BullMQ consumer — low-latency, used when REDIS_URL is set.
 *   2. Database polling — reliable fallback; always runs so nothing is stranded.
 *
 * The DB is the source of truth. A stuck task (RUNNING past its timeout with no
 * live worker) is requeued on the next sweep.
 */

const PROCESS_NAME = process.env.WORKER_NAME || `worker-${process.pid}`;
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_MS || 2000);
const HEARTBEAT_MS = 10_000;
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 3);
const STUCK_MS = 5 * 60_000; // reclaim RUNNING tasks older than this

let running = true;
let inFlight = 0;
let heartbeatId: string | null = null;

async function heartbeat(status: string) {
  try {
    const queueDepth = await db.agentTask.count({ where: { status: "QUEUED" } });
    if (heartbeatId) {
      await db.workerHeartbeat.update({ where: { id: heartbeatId }, data: { status, lastSeenAt: new Date(), queueDepth } });
    } else {
      const existing = await db.workerHeartbeat.findFirst({ where: { processName: PROCESS_NAME } });
      const row = existing
        ? await db.workerHeartbeat.update({ where: { id: existing.id }, data: { status, lastSeenAt: new Date(), queueDepth } })
        : await db.workerHeartbeat.create({ data: { processName: PROCESS_NAME, status, queueDepth, meta: { redis: redisAvailable, concurrency: CONCURRENCY } } });
      heartbeatId = row.id;
    }
  } catch (err) {
    logger.error("heartbeat failed", { action: "worker.heartbeat_failed" });
  }
}

/** Requeue tasks stuck in RUNNING with no progress (e.g. a crashed worker). */
async function reclaimStuck() {
  const cutoff = new Date(Date.now() - STUCK_MS);
  const res = await db.agentTask.updateMany({
    where: { status: "RUNNING", startedAt: { lt: cutoff } },
    data: { status: "QUEUED" },
  });
  if (res.count > 0) logger.warn("reclaimed stuck tasks", { action: "worker.reclaim", count: res.count });
}

async function claimAndRun(taskId: string) {
  inFlight++;
  try {
    const r = await executeQueuedTask(taskId);
    if (r === "ran") await db.workerHeartbeat.updateMany({ where: { processName: PROCESS_NAME }, data: { lastJobAt: new Date() } });
  } catch (err) {
    logger.error("task crashed worker loop", { taskId, action: "worker.task_crash" });
  } finally {
    inFlight--;
  }
}

async function pollOnce() {
  if (inFlight >= CONCURRENCY) return;
  const capacity = CONCURRENCY - inFlight;
  const now = new Date();
  const due = await db.agentTask.findMany({
    where: { status: "QUEUED", OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: capacity,
    select: { id: true },
  });
  for (const t of due) void claimAndRun(t.id);
}

async function startRedisConsumer() {
  if (!redisAvailable || !env.REDIS_URL) return null;
  const { Worker } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const w = new Worker(queueConfig.name, async (job) => { await executeQueuedTask(job.data.taskId as string); }, { connection, concurrency: CONCURRENCY });
  w.on("failed", (job, err) => logger.error("bullmq job failed", { action: "worker.bullmq_failed", taskId: job?.data?.taskId }));
  logger.info("redis consumer started", { action: "worker.redis_up", queue: queueConfig.name });
  return w;
}

async function main() {
  logger.info("worker starting", { action: "worker.start", process: PROCESS_NAME, redis: redisAvailable, concurrency: CONCURRENCY });
  await heartbeat("online");
  const redisWorker = await startRedisConsumer();

  const hb = setInterval(() => void heartbeat(running ? "online" : "draining"), HEARTBEAT_MS);
  let sweeps = 0;

  while (running) {
    try {
      if (sweeps++ % 15 === 0) await reclaimStuck(); // ~every 30s
      await pollOnce();
    } catch (err) {
      logger.error("poll loop error", { action: "worker.poll_error" });
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  clearInterval(hb);
  if (redisWorker) await redisWorker.close();
}

async function shutdown(signal: string) {
  logger.info("worker draining", { action: "worker.shutdown", signal });
  running = false;
  const deadline = Date.now() + 20_000;
  while (inFlight > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 250));
  await heartbeat("offline");
  await db.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

main().catch((err) => {
  logger.error("worker fatal", { action: "worker.fatal", error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});

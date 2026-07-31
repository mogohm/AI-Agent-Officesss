import { redisAvailable, env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Task queue abstraction.
 *
 * - When Redis is configured we enqueue a BullMQ job for low-latency pickup.
 * - When Redis is NOT configured the standalone worker polls the database for
 *   QUEUED tasks, so enqueue is a no-op — the task is already persisted as
 *   QUEUED by the caller. The DB is always the source of truth either way.
 */
const QUEUE_NAME = "agent-tasks";

// Lazily created so the web process never opens a Redis connection unless used.
let queuePromise: Promise<unknown> | null = null;

async function getQueue() {
  if (!redisAvailable || !env.REDIS_URL) return null;
  if (!queuePromise) {
    queuePromise = (async () => {
      const { Queue } = await import("bullmq");
      const IORedis = (await import("ioredis")).default;
      const connection = new IORedis(env.REDIS_URL!, { maxRetriesPerRequest: null });
      return new Queue(QUEUE_NAME, { connection });
    })();
  }
  return queuePromise as Promise<import("bullmq").Queue>;
}

export async function enqueueTask(taskId: string, delayMs = 0): Promise<void> {
  const queue = await getQueue();
  if (!queue) return; // DB polling path
  try {
    await queue.add("run", { taskId }, { jobId: `task:${taskId}:${Date.now()}`, delay: delayMs, removeOnComplete: true, removeOnFail: 200, attempts: 1 });
  } catch (err) {
    logger.error("enqueue failed (falling back to DB polling)", { taskId, action: "queue.enqueue_failed" });
  }
}

export const queueConfig = { name: QUEUE_NAME, redisAvailable };

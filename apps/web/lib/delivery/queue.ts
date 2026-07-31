import { db } from "@/lib/db";
import type { QueueName, QueueJobStatus } from "@prisma/client";

/**
 * Durable queue (§4). PostgreSQL is the queue of record — jobs survive worker
 * and Redis restarts. `jobKey` is deterministic, so a duplicate delivery is a
 * no-op instead of a second execution (threat T10).
 *
 * This is NOT an in-memory queue: every job is a persisted row claimed with a
 * conditional update, which is the same proven pattern as the office worker.
 */

export const jobKeys = {
  orchestrate: (missionId: string, iteration: number) => `mission:${missionId}:orchestrate:${iteration}`,
  agentExecute: (agentRunId: string) => `agent:${agentRunId}:execute`,
  workspacePrepare: (workPackageId: string) => `workspace:${workPackageId}:prepare`,
};

export type EnqueueInput = {
  jobKey: string;
  queue: QueueName;
  payload: Record<string, unknown>;
  missionId?: string;
  workPackageId?: string;
  agentRunId?: string;
  correlationId: string;
  maxAttempts?: number;
  delayMs?: number;
};

/** Idempotent: enqueueing the same jobKey twice never creates a second job. */
export async function enqueue(input: EnqueueInput): Promise<{ id: string; duplicate: boolean }> {
  const existing = await db.queueJob.findUnique({ where: { jobKey: input.jobKey }, select: { id: true } });
  if (existing) return { id: existing.id, duplicate: true };
  try {
    const job = await db.queueJob.create({
      data: {
        jobKey: input.jobKey, queue: input.queue, payload: input.payload as object,
        missionId: input.missionId ?? null, workPackageId: input.workPackageId ?? null,
        agentRunId: input.agentRunId ?? null, correlationId: input.correlationId,
        maxAttempts: input.maxAttempts ?? 3,
        runAfter: new Date(Date.now() + (input.delayMs ?? 0)),
      },
      select: { id: true },
    });
    return { id: job.id, duplicate: false };
  } catch {
    // unique violation from a concurrent enqueue — still idempotent
    const j = await db.queueJob.findUnique({ where: { jobKey: input.jobKey }, select: { id: true } });
    return { id: j!.id, duplicate: true };
  }
}

const LEASE_MS = 5 * 60_000;

/**
 * Atomically claim one ready job. The conditional updateMany guarantees only a
 * single worker can win a given job, even with several workers polling.
 */
export async function claimNext(opts: { workerId: string; queues: QueueName[] }): Promise<
  { id: string; jobKey: string; queue: QueueName; payload: unknown; attempt: number; missionId: string | null; workPackageId: string | null; agentRunId: string | null } | null
> {
  const now = new Date();
  const candidates = await db.queueJob.findMany({
    where: {
      queue: { in: opts.queues },
      runAfter: { lte: now },
      OR: [
        { status: "QUEUED" },
        // reclaim a stalled job whose lease expired (worker crash recovery)
        { status: { in: ["CLAIMED", "RUNNING"] }, leaseUntil: { lt: now } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: { id: true },
  });

  for (const c of candidates) {
    const claimed = await db.queueJob.updateMany({
      where: {
        id: c.id,
        OR: [{ status: "QUEUED" }, { status: { in: ["CLAIMED", "RUNNING"] }, leaseUntil: { lt: now } }],
      },
      data: {
        status: "CLAIMED", claimedBy: opts.workerId, claimedAt: now,
        leaseUntil: new Date(Date.now() + LEASE_MS), attempt: { increment: 1 },
      },
    });
    if (claimed.count === 1) {
      return db.queueJob.findUniqueOrThrow({
        where: { id: c.id },
        select: { id: true, jobKey: true, queue: true, payload: true, attempt: true, missionId: true, workPackageId: true, agentRunId: true },
      });
    }
  }
  return null;
}

export async function renewLease(jobId: string): Promise<void> {
  await db.queueJob.updateMany({ where: { id: jobId }, data: { leaseUntil: new Date(Date.now() + LEASE_MS) } });
}

export async function markRunning(jobId: string): Promise<void> {
  await db.queueJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });
}

export async function completeJob(jobId: string, status: Extract<QueueJobStatus, "SUCCEEDED" | "FAILED" | "DEAD" | "CANCELLED">, error?: string): Promise<void> {
  await db.queueJob.update({ where: { id: jobId }, data: { status, lastError: error?.slice(0, 2000) ?? null, leaseUntil: null } });
}

/** Retry with exponential backoff, or bury the job once attempts are exhausted. */
export async function failJob(jobId: string, error: string): Promise<"retry" | "dead"> {
  const job = await db.queueJob.findUniqueOrThrow({ where: { id: jobId }, select: { attempt: true, maxAttempts: true } });
  if (job.attempt >= job.maxAttempts) {
    await completeJob(jobId, "DEAD", error);
    return "dead";
  }
  const backoff = Math.min(60_000, 2 ** job.attempt * 1000);
  await db.queueJob.update({
    where: { id: jobId },
    data: { status: "QUEUED", lastError: error.slice(0, 2000), runAfter: new Date(Date.now() + backoff), leaseUntil: null, claimedBy: null },
  });
  return "retry";
}

/** Cancel every outstanding job for a mission (used by CANCEL / PAUSE). */
export async function cancelMissionJobs(missionId: string): Promise<number> {
  const res = await db.queueJob.updateMany({
    where: { missionId, status: { in: ["QUEUED", "CLAIMED"] } },
    data: { status: "CANCELLED", leaseUntil: null },
  });
  return res.count;
}

export async function queueDepth(): Promise<Record<string, number>> {
  const rows = await db.queueJob.groupBy({ by: ["status"], _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}

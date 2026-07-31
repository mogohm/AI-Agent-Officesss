import "dotenv/config";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { claimNext, markRunning, completeJob, failJob, renewLease, enqueue, jobKeys } from "@/lib/delivery/queue";
import { orchestrate, transitionMission } from "@/lib/delivery/orchestrator";
import { prepareBaseWorkspace } from "@/lib/delivery/workspace";
import { runAssetAudit } from "@/lib/delivery/agents/asset-audit";
import { MissingCredentialsError } from "@/lib/delivery/providers";
import { emit } from "@/lib/delivery/events";
import { DEFAULT_LIMITS } from "@/lib/delivery/loop-safety";

/**
 * Persistent delivery worker (§5). Runs OUTSIDE Next.js — this is the only
 * process permitted to touch the filesystem, git, or a shell.
 *
 *   npm run missions:worker
 *
 * Load the repo-root .env.local too, so an OPENAI_API_KEY placed there (the
 * existing convention for the asset pipeline) is available without duplication.
 */
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
for (const f of [path.join(REPO_ROOT, ".env.local"), path.join(REPO_ROOT, ".env")]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, raw] = m;
    const v = raw.replace(/^["']|["']$/g, "");
    if (v && !process.env[k]) process.env[k] = v;
  }
}

const WORKER_ID = process.env.DELIVERY_WORKER_ID || `delivery-${os.hostname()}-${process.pid}`;
const POLL_MS = Number(process.env.DELIVERY_POLL_MS || 2000);
const HEARTBEAT_MS = 10_000;
const VERSION = "0.1.0-slice";

let running = true;
let activeJobs = 0;

async function heartbeat(status: string) {
  try {
    const existing = await db.workerHeartbeat.findFirst({ where: { processName: WORKER_ID } });
    const data = {
      status, lastSeenAt: new Date(),
      queueDepth: await db.queueJob.count({ where: { status: "QUEUED" } }),
      meta: { hostname: os.hostname(), version: VERSION, activeJobs, capabilities: ["asset-audit", "workspace", "orchestrate"], startedAt: START },
    };
    if (existing) await db.workerHeartbeat.update({ where: { id: existing.id }, data });
    else await db.workerHeartbeat.create({ data: { processName: WORKER_ID, ...data } });
  } catch (err) {
    logger.error("delivery worker heartbeat failed", { action: "delivery.heartbeat_failed" });
  }
}
const START = new Date().toISOString();

/** Refuse work for a mission that is no longer runnable (§5). */
async function missionRunnable(missionId: string): Promise<boolean> {
  const m = await db.mission.findUnique({ where: { id: missionId }, select: { status: true } });
  return !!m && !["PAUSED", "CANCELLED", "COMPLETED", "BLOCKED"].includes(m.status);
}

async function handleOrchestrate(payload: { missionId: string }) {
  const r = await orchestrate(payload.missionId);
  logger.info("orchestrated", { action: "delivery.orchestrate", scheduled: r.scheduled.join(",") || "-", blocked: r.blocked?.reason });
}

async function handleAgentExecution(payload: {
  missionId: string; missionKey: string; workPackageId: string; workPackageKey: string; agentRunId: string; role: string;
}) {
  const { missionId, missionKey, workPackageId, workPackageKey, agentRunId, role } = payload;

  if (!(await missionRunnable(missionId))) {
    await db.agentRun.update({ where: { id: agentRunId }, data: { status: "CANCELLED", completedAt: new Date() } });
    await db.workPackage.update({ where: { id: workPackageId }, data: { status: "READY" } });
    return;
  }

  await db.agentRun.update({ where: { id: agentRunId }, data: { status: "RUNNING", startedAt: new Date() } });
  await db.workPackage.update({ where: { id: workPackageId }, data: { status: "IN_PROGRESS" } });
  await emit(missionId, "agent.started", { wp: workPackageKey, role, agentRunId });

  const mission = await db.mission.findUniqueOrThrow({ where: { id: missionId }, select: { repositoryUrl: true, baseBranch: true } });
  await prepareBaseWorkspace({ missionId, missionKey, repositoryUrl: mission.repositoryUrl, baseBranch: mission.baseBranch });

  if (role !== "UX_VISUAL") {
    throw new Error(`no executor implemented for role ${role} in this slice (read-only asset audit only)`);
  }

  const { artifactPaths, audit, usage } = await runAssetAudit({ missionId, missionKey, workPackageId, workPackageKey, agentRunId });

  await db.$transaction(async (tx) => {
    await tx.agentRun.update({
      where: { id: agentRunId },
      data: {
        status: "SUCCEEDED", completedAt: new Date(),
        outputSummary: `audited ${audit.summary.total} assets (retain ${audit.summary.retain}, inspect ${audit.summary.manualInspection}) @ ${audit.repositoryCommit.slice(0, 8)}`,
        promptTokens: usage.prompt, completionTokens: usage.completion, totalTokens: usage.prompt + usage.completion,
        costUsd: usage.cost,
      },
    });
    await tx.agentUsageRecord.create({
      data: {
        missionId, agentRunId, role: "UX_VISUAL", provider: "OPENAI",
        model: process.env.DELIVERY_OPENAI_MODEL ?? "gpt-4o-mini",
        promptTokens: usage.prompt, completionTokens: usage.completion,
        totalTokens: usage.prompt + usage.completion, costUsd: usage.cost,
      },
    });
    await tx.missionBudget.updateMany({
      where: { missionId },
      data: { spentCostUsd: { increment: usage.cost }, spentTokens: { increment: usage.prompt + usage.completion } },
    });
    await tx.workPackage.update({ where: { id: workPackageId }, data: { status: "PASSED", completedAt: new Date() } });
    await tx.requirementTrace.updateMany({ where: { workPackageId }, data: { satisfied: true, note: `evidence: ${artifactPaths.map((p) => p.split(/[\\/]/).pop()).join(", ")}` } });
    await tx.missionAuditLog.create({
      data: {
        missionId, action: "work_package.passed", entityType: "workPackage", entityId: workPackageId,
        fromState: "IN_PROGRESS", toState: "PASSED", reason: "asset audit completed with evidence",
        evidence: { artifacts: artifactPaths, commit: audit.repositoryCommit, assets: audit.summary.total },
      },
    });
  });

  await emit(missionId, "agent.completed", { wp: workPackageKey, agentRunId, assets: audit.summary.total, cost: usage.cost });
  await emit(missionId, "work_package.updated", { wp: workPackageKey, status: "PASSED" });
  logger.info("work package passed", { action: "delivery.wp_passed", wp: workPackageKey, assets: audit.summary.total });
}

async function processJob(job: Awaited<ReturnType<typeof claimNext>>) {
  if (!job) return;
  activeJobs++;
  const lease = setInterval(() => void renewLease(job.id), 60_000);
  try {
    await markRunning(job.id);
    const payload = job.payload as Record<string, string>;
    if (job.queue === "MISSION_ORCHESTRATION") await handleOrchestrate(payload as { missionId: string });
    else if (job.queue === "AGENT_EXECUTION") await handleAgentExecution(payload as never);
    else throw new Error(`unsupported queue ${job.queue} in this slice`);
    await completeJob(job.id, "SUCCEEDED");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const credentials = err instanceof MissingCredentialsError;
    logger.error("delivery job failed", { action: "delivery.job_failed", jobKey: job.jobKey, credentials });

    if (job.agentRunId) {
      await db.agentRun.update({ where: { id: job.agentRunId }, data: { status: "FAILED", completedAt: new Date(), error: msg.slice(0, 2000) } }).catch(() => {});
    }
    if (job.workPackageId) {
      await db.workPackage.update({ where: { id: job.workPackageId }, data: { status: "FAILED" } }).catch(() => {});
    }
    if (job.missionId) {
      await emit(job.missionId, "agent.failed", { error: msg.slice(0, 300), credentials });
      if (credentials) {
        // BLOCKED_CREDENTIALS is terminal for this turn — never retried blindly
        await completeJob(job.id, "DEAD", msg);
        await transitionMission({
          missionId: job.missionId, to: "BLOCKED", reason: msg,
          blockedReason: "BLOCKED_CREDENTIALS",
          blockedDetail: `missing: ${(err as MissingCredentialsError).missingEnv.join(", ")}`,
        }).catch(() => {});
        return;
      }
    }
    await failJob(job.id, msg);
  } finally {
    clearInterval(lease);
    activeJobs--;
  }
}

async function main() {
  logger.info("delivery worker starting", { action: "delivery.start", worker: WORKER_ID, version: VERSION });
  await heartbeat("online");
  const hb = setInterval(() => void heartbeat(running ? "online" : "draining"), HEARTBEAT_MS);

  while (running) {
    try {
      const job = await claimNext({ workerId: WORKER_ID, queues: ["MISSION_ORCHESTRATION", "AGENT_EXECUTION"] });
      if (job) await processJob(job);
      else await new Promise((r) => setTimeout(r, POLL_MS));
    } catch (err) {
      logger.error("delivery poll error", { action: "delivery.poll_error" });
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
  clearInterval(hb);
}

async function shutdown(signal: string) {
  logger.info("delivery worker draining", { action: "delivery.shutdown", signal });
  running = false;
  const deadline = Date.now() + Math.min(30_000, DEFAULT_LIMITS.maxAgentRunMs);
  while (activeJobs > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 250));
  await heartbeat("offline");
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

main().catch((err) => {
  logger.error("delivery worker fatal", { action: "delivery.fatal", error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});

export { enqueue, jobKeys };

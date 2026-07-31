import "dotenv/config";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { claimNext, markRunning, completeJob, failJob, renewLease, enqueue, jobKeys } from "@/lib/delivery/queue";
import { orchestrate, transitionMission } from "@/lib/delivery/orchestrator";
import { prepareBaseWorkspace, layout } from "@/lib/delivery/workspace";
import { runCommand } from "@/lib/delivery/command-runner";
import { runAssetStandardization, BlockedAssetGeneration, BlockedBudget } from "@/lib/delivery/agents/asset-standardize";
import { runAssetReview } from "@/lib/delivery/agents/asset-review";
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

  if (role === "ASSET") {
    await handleAssetStandardization({ missionId, missionKey, workPackageId, workPackageKey, agentRunId });
    return;
  }
  if (role !== "UX_VISUAL") {
    throw new Error(`no executor implemented for role ${role} in this slice`);
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

/**
 * ASSET work package: generate → INDEPENDENT review (separate AgentRun) →
 * commit in the isolated worktree → PASSED. The generator can never approve
 * its own output (§14).
 */
async function handleAssetStandardization(o: {
  missionId: string; missionKey: string; workPackageId: string; workPackageKey: string; agentRunId: string;
}) {
  const { missionId, missionKey, workPackageId, workPackageKey, agentRunId } = o;

  const gen = await runAssetStandardization({ missionId, missionKey, workPackageId, workPackageKey, agentRunId });

  await db.agentRun.update({
    where: { id: agentRunId },
    data: {
      status: "SUCCEEDED", completedAt: new Date(), costUsd: gen.cost,
      outputSummary: `generated ${gen.manifest.length} assets (plan ${gen.plan.assets.length}) $${gen.cost.toFixed(4)}`,
    },
  });
  await db.workPackage.update({ where: { id: workPackageId }, data: { status: "IN_REVIEW" } });
  await emit(missionId, "work_package.updated", { wp: workPackageKey, status: "IN_REVIEW" });

  // ---- independent review run ----
  const reviewRun = await db.agentRun.create({
    data: { missionId, workPackageId, role: "CODE_REVIEW", status: "RUNNING", startedAt: new Date(), inputSummary: `independent review of ${gen.manifest.length} generated assets` },
  });
  await emit(missionId, "agent.started", { wp: workPackageKey, role: "ASSET_REVIEW", agentRunId: reviewRun.id });

  const review = await runAssetReview({
    missionId, missionKey, workPackageId, workPackageKey,
    reviewerAgentRunId: reviewRun.id, generatorAgentRunId: agentRunId,
    worktreePath: gen.worktreePath, manifest: gen.manifest,
  });

  await db.agentRun.update({
    where: { id: reviewRun.id },
    data: {
      status: "SUCCEEDED", completedAt: new Date(),
      promptTokens: review.usage.prompt, completionTokens: review.usage.completion,
      totalTokens: review.usage.prompt + review.usage.completion, costUsd: review.usage.cost,
      outputSummary: `review ${review.report.verdict}: ${review.report.summary.approved} approved, ${review.report.summary.changesRequested} changes, ${review.report.summary.blocked} blocked`,
    },
  });

  const totalCost = gen.cost + review.usage.cost;
  await db.$transaction(async (tx) => {
    await tx.agentUsageRecord.create({
      data: {
        missionId, agentRunId: reviewRun.id, role: "ASSET", provider: "OPENAI",
        model: process.env.DELIVERY_IMAGE_MODEL ?? "gpt-image-1-mini",
        promptTokens: review.usage.prompt, completionTokens: review.usage.completion,
        totalTokens: review.usage.prompt + review.usage.completion, costUsd: totalCost,
      },
    });
    await tx.missionBudget.updateMany({ where: { missionId }, data: { spentCostUsd: { increment: totalCost } } });
    await tx.workPackage.update({ where: { id: workPackageId }, data: { costUsd: totalCost } });
  });

  if (review.report.verdict !== "APPROVED") {
    await db.workPackage.update({ where: { id: workPackageId }, data: { status: "CHANGES_REQUESTED" } });
    for (const a of review.report.assets.filter((x) => x.verdict !== "APPROVED")) {
      const key = `DEF-${workPackageKey}-${path.basename(a.targetPath)}`.slice(0, 60);
      await db.defect.upsert({
        where: { missionId_key: { missionId, key } },
        update: { status: "OPEN", description: a.findings.join("; ") || "review requested changes" },
        create: {
          missionId, workPackageId, key, title: `Asset review: ${path.basename(a.targetPath)}`,
          description: a.findings.join("; ") || "review requested changes",
          severity: a.verdict === "BLOCKED" ? "P1" : "P2", category: "visual",
          suspectedFiles: [a.targetPath], assignedRole: "ASSET",
        },
      });
    }
    await emit(missionId, "work_package.updated", { wp: workPackageKey, status: "CHANGES_REQUESTED", verdict: review.report.verdict });
    throw new Error(`asset review returned ${review.report.verdict} — ${review.report.summary.changesRequested} changes requested, ${review.report.summary.blocked} blocked`);
  }

  // ---- commit inside the isolated worktree (§16) ----
  await db.workPackage.update({ where: { id: workPackageId }, data: { status: "TESTING" } });
  const wsRoot = layout(missionKey).root;
  const status = await runCommand({ executable: "git", args: ["status", "--porcelain"], cwd: gen.worktreePath, workspaceRoot: wsRoot, missionId, agentRunId: reviewRun.id, toolName: "git.status" });
  const changed = status.stdout.split("\n").filter(Boolean);
  const unexpected = changed.filter((l) => !/public\/assets\/office\//.test(l));
  if (unexpected.length > 0) {
    throw new Error(`unexpected repository changes outside the asset directories: ${unexpected.slice(0, 5).join(" | ")}`);
  }

  let commitSha: string | null = null;
  if (changed.length > 0) {
    await runCommand({ executable: "git", args: ["add", "apps/web/public/assets/office"], cwd: gen.worktreePath, workspaceRoot: wsRoot, missionId, agentRunId: reviewRun.id, toolName: "git.add" });
    await runCommand({ executable: "git", args: ["config", "user.email", "delivery@ai-agent-office.local"], cwd: gen.worktreePath, workspaceRoot: wsRoot, missionId, toolName: "git.config" });
    await runCommand({ executable: "git", args: ["config", "user.name", "Autonomous Delivery Center"], cwd: gen.worktreePath, workspaceRoot: wsRoot, missionId, toolName: "git.config" });
    await runCommand({ executable: "git", args: ["commit", "-m", `assets(${workPackageKey}): standardized ${gen.manifest.length} assets to style lock`], cwd: gen.worktreePath, workspaceRoot: wsRoot, missionId, agentRunId: reviewRun.id, toolName: "git.commit" });
    const sha = await runCommand({ executable: "git", args: ["rev-parse", "HEAD"], cwd: gen.worktreePath, workspaceRoot: wsRoot, missionId, toolName: "git.sha" });
    commitSha = sha.ok ? sha.stdout.trim() : null;
    if (commitSha) {
      await db.gitCommitRecord.create({
        data: {
          missionId, workPackageId, sha: commitSha, branch: `work/${missionKey}/${workPackageKey}`,
          message: `assets(${workPackageKey}): standardized ${gen.manifest.length} assets`,
          authorName: "Autonomous Delivery Center", filesChanged: changed.length, pushed: false,
        },
      });
    }
  }

  await db.$transaction(async (tx) => {
    await tx.workPackage.update({ where: { id: workPackageId }, data: { status: "PASSED", completedAt: new Date() } });
    await tx.requirementTrace.updateMany({ where: { workPackageId }, data: { satisfied: true, note: `assets standardized; commit ${commitSha?.slice(0, 8) ?? "n/a"}` } });
    await tx.missionAuditLog.create({
      data: {
        missionId, action: "work_package.passed", entityType: "workPackage", entityId: workPackageId,
        fromState: "TESTING", toState: "PASSED", reason: "assets generated, independently reviewed and committed",
        evidence: { assets: gen.manifest.length, cost: totalCost, commit: commitSha, review: review.report.verdict, artifacts: [...gen.artifactPaths, ...review.artifactPaths] },
      },
    });
  });
  await emit(missionId, "agent.completed", { wp: workPackageKey, assets: gen.manifest.length, cost: totalCost, commit: commitSha });
  await emit(missionId, "work_package.updated", { wp: workPackageKey, status: "PASSED" });
  logger.info("asset work package passed", { action: "delivery.wp_passed", wp: workPackageKey, assets: gen.manifest.length, cost: totalCost });
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
    const assetBlocked = err instanceof BlockedAssetGeneration;
    const budgetBlocked = err instanceof BlockedBudget;
    if (job.missionId) {
      await emit(job.missionId, "agent.failed", { error: msg.slice(0, 300), credentials, assetBlocked, budgetBlocked });
      if (assetBlocked || budgetBlocked) {
        await completeJob(job.id, "DEAD", msg);
        await transitionMission({
          missionId: job.missionId, to: "BLOCKED", reason: msg,
          blockedReason: budgetBlocked ? "BUDGET_EXCEEDED" : "MAX_ATTEMPTS",
          blockedDetail: (budgetBlocked ? "BLOCKED_BUDGET: " : "BLOCKED_ASSET_GENERATION: ") + msg.slice(0, 500),
        }).catch(() => {});
        return;
      }
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

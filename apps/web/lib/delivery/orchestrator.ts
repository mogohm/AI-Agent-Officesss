import { db } from "@/lib/db";
import { selectSchedulable, detectDeadlock, findDependencyCycle, type SchedulableWorkPackage } from "./work-package-state";
import { evaluateSafety } from "./loop-safety";
import { assertMissionTransition } from "./mission-state";
import { enqueue, jobKeys } from "./queue";
import { emit } from "./events";
import type { MissionStatus, BlockedReason } from "@prisma/client";

/**
 * Mission orchestrator (§2B). Pure function of persisted state: it reads the
 * mission, applies safety limits, picks eligible work packages and enqueues
 * agent runs. Crash-safe — re-running a turn is idempotent thanks to
 * deterministic job keys.
 */

export async function transitionMission(opts: {
  missionId: string; to: MissionStatus; reason: string;
  userId?: string; blockedReason?: BlockedReason; blockedDetail?: string;
}): Promise<void> {
  const m = await db.mission.findUniqueOrThrow({ where: { id: opts.missionId }, select: { status: true } });
  if (m.status === opts.to) return; // idempotent
  assertMissionTransition(m.status, opts.to);

  await db.mission.update({
    where: { id: opts.missionId },
    data: {
      status: opts.to,
      blockedReason: opts.to === "BLOCKED" ? (opts.blockedReason ?? "MANUAL_ESCALATION") : "NONE",
      blockedDetail: opts.to === "BLOCKED" ? (opts.blockedDetail ?? opts.reason) : null,
      ...(opts.to === "ANALYZING" ? { startedAt: new Date() } : {}),
      ...(opts.to === "COMPLETED" || opts.to === "CANCELLED" ? { completedAt: new Date() } : {}),
    },
  });
  await db.missionAuditLog.create({
    data: {
      missionId: opts.missionId, userId: opts.userId ?? null, action: "mission.transition",
      entityType: "mission", entityId: opts.missionId,
      fromState: m.status, toState: opts.to, reason: opts.reason,
    },
  });
  await emit(opts.missionId, "mission.updated", { from: m.status, to: opts.to, reason: opts.reason });
}

/**
 * Roles this build can actually execute. The orchestrator must never dispatch
 * work it has no executor for — doing so would fail packages for a reason that
 * has nothing to do with the work itself. Packages for unimplemented roles stay
 * eligible and are reported as awaiting an executor.
 */
export const EXECUTABLE_ROLES = new Set(["UX_VISUAL", "ASSET"]);

/**
 * Controlled vertical-slice policy (§3): only these work packages may be
 * dispatched this round. FRONTEND_DEV/BACKEND_DEV remain awaitingExecutor.
 * An empty set means "no restriction".
 */
export const ALLOWED_WORK_PACKAGE_CODES = new Set(
  (process.env.DELIVERY_ALLOWED_WP ?? "WP-001,WP-002").split(",").map((s) => s.trim()).filter(Boolean),
);

export type OrchestrateResult = {
  scheduled: string[];
  awaitingExecutor: string[];
  blocked?: { reason: BlockedReason; detail: string };
  note?: string;
};

/** One scheduling turn. */
export async function orchestrate(missionId: string): Promise<OrchestrateResult> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    include: { budget: true, workPackages: { include: { dependsOn: true }, orderBy: { key: "asc" } } },
  });

  // paused / cancelled / terminal missions never schedule (§3)
  if (["PAUSED", "CANCELLED", "COMPLETED", "BLOCKED"].includes(mission.status)) {
    return { scheduled: [], awaitingExecutor: [], note: `mission is ${mission.status}` };
  }

  const packages: SchedulableWorkPackage[] = mission.workPackages.map((w) => ({
    id: w.id, status: w.status, role: w.role,
    dependsOnIds: w.dependsOn.map((d) => d.dependsOnId),
    attemptCount: w.attemptCount, maxAttempts: w.maxAttempts,
  }));

  // safety limits before anything is dispatched (§9)
  const elapsedMin = mission.startedAt ? (Date.now() - mission.startedAt.getTime()) / 60000 : 0;
  const safety = evaluateSafety({
    spentCostUsd: Number(mission.budget?.spentCostUsd ?? 0), maxCostUsd: Number(mission.budget?.maxCostUsd ?? 25),
    spentTokens: mission.budget?.spentTokens ?? 0, maxTokens: mission.budget?.maxTokens ?? 5_000_000,
    elapsedMin, maxDurationMin: mission.budget?.maxDurationMin ?? 480,
    iteration: mission.iteration, maxIterations: mission.maxIterations,
    identicalFailureStreak: 0, maxIdenticalFailures: mission.budget?.maxIdenticalFailures ?? 2,
    defectAttempts: 0, maxAttemptsPerDefect: mission.budget?.maxAttemptsPerDefect ?? 5,
    turnsWithoutProgress: 0, maxTurnsWithoutProgress: 3,
  });
  if (safety) {
    await transitionMission({ missionId, to: "BLOCKED", reason: safety.detail, blockedReason: safety.reason, blockedDetail: safety.detail });
    return { scheduled: [], awaitingExecutor: [], blocked: safety };
  }

  const cycle = findDependencyCycle(packages);
  if (cycle) {
    const detail = `dependency cycle: ${cycle.join(" -> ")}`;
    await transitionMission({ missionId, to: "BLOCKED", reason: detail, blockedReason: "DEADLOCK", blockedDetail: detail });
    return { scheduled: [], awaitingExecutor: [], blocked: { reason: "DEADLOCK", detail } };
  }

  const eligible = selectSchedulable(packages, {
    maxWriters: mission.budget?.maxParallelWriters ?? 2,
    maxReaders: mission.budget?.maxParallelReaders ?? 4,
  });

  // split eligible work by whether an executor exists for the role
  const inPolicy = (id: string) => {
    const wp = mission.workPackages.find((w) => w.id === id)!;
    return ALLOWED_WORK_PACKAGE_CODES.size === 0 || ALLOWED_WORK_PACKAGE_CODES.has(wp.key);
  };
  const runnable = eligible.filter((e) => EXECUTABLE_ROLES.has(mission.workPackages.find((w) => w.id === e.id)!.role) && inPolicy(e.id));
  const awaitingExecutor = eligible
    .filter((e) => !EXECUTABLE_ROLES.has(mission.workPackages.find((w) => w.id === e.id)!.role) || !inPolicy(e.id))
    .map((e) => mission.workPackages.find((w) => w.id === e.id)!.key);

  if (runnable.length === 0) {
    // packages waiting only for an unimplemented executor are NOT a deadlock
    if (awaitingExecutor.length > 0) {
      return { scheduled: [], awaitingExecutor, note: `awaiting executor for: ${awaitingExecutor.join(", ")}` };
    }
    if (detectDeadlock(packages)) {
      const detail = "no work package is eligible and none is in flight";
      await transitionMission({ missionId, to: "BLOCKED", reason: detail, blockedReason: "DEADLOCK", blockedDetail: detail });
      return { scheduled: [], awaitingExecutor: [], blocked: { reason: "DEADLOCK", detail } };
    }
    return { scheduled: [], awaitingExecutor: [], note: "nothing eligible this turn" };
  }

  const scheduled: string[] = [];
  for (const wp of runnable) {
    const full = mission.workPackages.find((w) => w.id === wp.id)!;

    // create the AgentRun first so the queue job can point at durable state
    const run = await db.agentRun.create({
      data: { missionId, workPackageId: full.id, role: full.role, status: "PENDING", inputSummary: full.objective.slice(0, 500) },
    });
    await db.workPackage.update({ where: { id: full.id }, data: { status: "ASSIGNED", attemptCount: { increment: 1 }, startedAt: new Date() } });

    const { duplicate } = await enqueue({
      jobKey: jobKeys.agentExecute(run.id),
      queue: "AGENT_EXECUTION",
      payload: { missionId, missionKey: mission.key, workPackageId: full.id, workPackageKey: full.key, agentRunId: run.id, role: full.role },
      missionId, workPackageId: full.id, agentRunId: run.id,
      correlationId: `${mission.key}:${full.key}:${full.attemptCount + 1}`,
    });

    await emit(missionId, "work_package.started", { wp: full.key, role: full.role, agentRunId: run.id, duplicate });
    scheduled.push(full.key);
  }

  await db.mission.update({ where: { id: missionId }, data: { iteration: { increment: 1 } } });
  return { scheduled, awaitingExecutor };
}

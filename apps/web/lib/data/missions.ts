import "server-only";
import { db } from "@/lib/db";
import { requireUser, isSuperAdmin } from "@/lib/auth-helpers";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { canPerform, type DeliveryAction } from "@/lib/delivery/roles";
import type { DeliveryRole } from "@prisma/client";

/** Resolve the caller's delivery role. Super-admins are OWNER by definition. */
export async function currentDeliveryRole(): Promise<{ userId: string; role: DeliveryRole }> {
  const user = await requireUser();
  if (isSuperAdmin(user)) return { userId: user.id, role: "OWNER" };
  const m = await db.deliveryMember.findUnique({ where: { userId: user.id }, select: { role: true } });
  return { userId: user.id, role: m?.role ?? "VIEWER" };
}

export async function requireDelivery(action: DeliveryAction): Promise<{ userId: string; role: DeliveryRole }> {
  const ctx = await currentDeliveryRole();
  if (!canPerform(ctx.role, action)) throw new AuthorizationError(`ต้องมีสิทธิ์สูงกว่านี้สำหรับ: ${action}`);
  return ctx;
}

export async function listMissions() {
  await requireDelivery("mission.view");
  return db.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      budget: true,
      _count: { select: { requirements: true, workPackages: true, defects: true, agentRuns: true } },
    },
  });
}

export async function getMission(missionId: string) {
  await requireDelivery("mission.view");
  const mission = await db.mission.findFirst({
    where: { OR: [{ id: missionId }, { key: missionId }] },
    include: {
      budget: true,
      requirements: { include: { criteria: true }, orderBy: { key: "asc" } },
      workPackages: { include: { dependsOn: true }, orderBy: { key: "asc" } },
      agentRuns: { orderBy: { createdAt: "desc" }, take: 25 },
      gateResults: { orderBy: { evaluatedAt: "desc" }, take: 8 },
      artifacts: { orderBy: { createdAt: "desc" }, take: 25 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 25 },
      _count: { select: { checkpoints: true, defects: true } },
    },
  });
  if (!mission) throw new NotFoundError("ไม่พบ mission");

  const [criteriaTotal, criteriaPassed, tracesSatisfied, tracesTotal, workers, toolCount] = await Promise.all([
    db.acceptanceCriterion.count({ where: { requirement: { missionId: mission.id } } }),
    db.acceptanceCriterion.count({ where: { requirement: { missionId: mission.id }, status: "PASSED" } }),
    db.requirementTrace.count({ where: { criterion: { requirement: { missionId: mission.id } }, satisfied: true } }),
    db.requirementTrace.count({ where: { criterion: { requirement: { missionId: mission.id } } } }),
    db.workerHeartbeat.findMany({ where: { processName: { startsWith: "delivery-" } }, orderBy: { lastSeenAt: "desc" }, take: 5 }),
    db.agentToolExecution.count({ where: { missionId: mission.id } }),
  ]);

  // canonical baseline evidence (cycle 2) — separate statuses, never collapsed
  const attestation = await db.assetBaselineAttestation.findFirst({
    where: { baseline: { missionId: mission.id } }, orderBy: { createdAt: "desc" },
    include: { baseline: { include: { _count: { select: { entries: true } } } } },
  });
  let evidence = null;
  if (attestation) {
    const bId = attestation.baselineId;
    const [pinned, valPassed, approved, retests, openDefects] = await Promise.all([
      db.assetCanonicalEntry.count({ where: { baselineId: bId, NOT: { sha256: "" } } }),
      db.assetValidationResult.count({ where: { baselineId: bId, status: "PASSED" } }),
      db.assetReviewResult.count({ where: { verdict: "APPROVED", reviewRun: { baselineId: bId } } }),
      db.defectRetest.count({ where: { baselineId: bId } }),
      db.defect.count({ where: { missionId: mission.id, status: { notIn: ["RESOLVED", "ACCEPTED"] } } }),
    ]);
    evidence = {
      provenance: attestation.provenanceStatus,
      baselineIntegrity: attestation.baselineIntegrity,
      validationBinding: attestation.validationBinding,
      reviewBinding: attestation.reviewBinding,
      evidenceCompleteness: attestation.evidenceCompleteness,
      digest: attestation.baselineDigest,
      baselineVersion: attestation.baseline.baselineVersion,
      entries: attestation.baseline._count.entries,
      pinned, validationPassed: valPassed, reviewApproved: approved,
      defectsTotal: retests, defectsResolved: retests - openDefects, defectsOpen: openDefects,
      attestation: attestation.status,
      limitations: attestation.limitations,
    };
  }

  const now = Date.now();
  return {
    evidence,
    mission,
    stats: {
      criteriaTotal, criteriaPassed, tracesSatisfied, tracesTotal, toolCount,
      elapsedMin: mission.startedAt ? Math.round((now - mission.startedAt.getTime()) / 60000) : 0,
      wpByStatus: mission.workPackages.reduce<Record<string, number>>((acc, w) => {
        acc[w.status] = (acc[w.status] ?? 0) + 1; return acc;
      }, {}),
      activeRuns: mission.agentRuns.filter((r) => r.status === "RUNNING" || r.status === "PENDING").length,
      failedRuns: mission.agentRuns.filter((r) => r.status === "FAILED").length,
    },
    workers: workers.map((w) => ({
      id: w.id, name: w.processName, status: w.status,
      ageSeconds: Math.round((now - w.lastSeenAt.getTime()) / 1000),
      live: now - w.lastSeenAt.getTime() < 40_000 && w.status !== "offline",
      queueDepth: w.queueDepth,
    })),
  };
}

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { extendMissionDuration, REQUIRED_EXTENSION_REASON, DurationExtensionDenied } from "@/lib/delivery/mission-duration";
import { findDependencyCycle, detectDeadlock, selectSchedulable, type SchedulableWorkPackage } from "@/lib/delivery/work-package-state";

/**
 * Stage A: audited duration extension + creation of WP-002H with a
 * transactional dependency rewire WP-002 -> WP-002H -> WP-003.
 */
const MISSION = "VISUAL-2026-001";
const prisma = new PrismaClient();

(async () => {
  const owner = await prisma.user.findFirstOrThrow({ where: { globalRole: "SUPER_ADMIN" } });

  // --- non-owner rejection is proven, not assumed ---
  try {
    await extendMissionDuration({
      missionKey: MISSION, newDurationLimitMinutes: 1440, actorRole: "DELIVERY_MANAGER",
      actorUserId: owner.id, reason: REQUIRED_EXTENSION_REASON, correlationId: "stage-a-negative",
    });
    console.log("UNEXPECTED: non-owner extension succeeded");
    process.exit(1);
  } catch (e) {
    if (!(e instanceof DurationExtensionDenied)) throw e;
    console.log("non-owner extension : correctly DENIED");
  }

  // --- owner-authorised extension ---
  const rec = await extendMissionDuration({
    missionKey: MISSION, newDurationLimitMinutes: 1440, actorRole: "OWNER",
    actorUserId: owner.id, reason: REQUIRED_EXTENSION_REASON, correlationId: "stage-a-extend-1",
  });
  console.log(`duration extension  : ${rec.previousDurationLimitMinutes} -> ${rec.newDurationLimitMinutes} min`);
  console.log(`elapsed at approval : ${rec.elapsedMinutesAtApproval} min (not reset)`);
  console.log(`TIME_EXCEEDED       : ${rec.timeExceededCleared ? "cleared" : "not cleared"}`);

  // --- create WP-002H and rewire dependencies transactionally ---
  const mission = await prisma.mission.findUniqueOrThrow({ where: { key: MISSION } });
  const wp002 = await prisma.workPackage.findFirstOrThrow({ where: { missionId: mission.id, key: "WP-002" } });
  const wp003 = await prisma.workPackage.findFirstOrThrow({ where: { missionId: mission.id, key: "WP-003" } });

  await prisma.$transaction(async (tx) => {
    const h = await tx.workPackage.upsert({
      where: { missionId_key: { missionId: mission.id, key: "WP-002H" } },
      update: {},
      create: {
        missionId: mission.id, key: "WP-002H",
        title: "WP-002 Delivery Evidence Regression Hardening",
        objective: "Close verified implementation gaps after WP-002 without changing any approved asset bytes",
        scope: "cycle-2 regression tests + Mission UI evidence status components; canonical baseline digest must not change",
        role: "QA", status: "READY", riskLevel: "LOW", requiresTests: true, requiresEvidence: true,
      },
    });
    // WP-002H depends on WP-002
    await tx.workPackageDependency.upsert({
      where: { workPackageId_dependsOnId: { workPackageId: h.id, dependsOnId: wp002.id } },
      update: {}, create: { workPackageId: h.id, dependsOnId: wp002.id },
    });
    // WP-003 now additionally depends on WP-002H (existing WP-002 edge retained)
    await tx.workPackageDependency.upsert({
      where: { workPackageId_dependsOnId: { workPackageId: wp003.id, dependsOnId: h.id } },
      update: {}, create: { workPackageId: wp003.id, dependsOnId: h.id },
    });
    await tx.missionAuditLog.create({
      data: {
        missionId: mission.id, userId: owner.id, action: "work_package.created",
        entityType: "workPackage", entityId: h.id, toState: "READY",
        reason: "Stage A1: delivery hardening package inserted between WP-002 and WP-003",
      },
    });
  });

  // --- verify the graph ---
  const all = await prisma.workPackage.findMany({ where: { missionId: mission.id }, include: { dependsOn: true }, orderBy: { key: "asc" } });
  const byId = new Map(all.map((w) => [w.id, w.key]));
  const graph: SchedulableWorkPackage[] = all.map((w) => ({
    id: w.key, status: w.status, role: w.role,
    dependsOnIds: w.dependsOn.map((d) => byId.get(d.dependsOnId) ?? d.dependsOnId),
    attemptCount: w.attemptCount, maxAttempts: w.maxAttempts,
  }));
  const cycle = findDependencyCycle(graph);
  const eligible = selectSchedulable(graph, { maxWriters: 2, maxReaders: 4 }).map((e) => e.id);
  const wp3deps = graph.find((g) => g.id === "WP-003")!.dependsOnIds;

  console.log(`dependency cycle    : ${cycle ? cycle.join(" -> ") : "none"}`);
  console.log(`deadlock            : ${detectDeadlock(graph)}`);
  console.log(`WP-003 depends on   : ${wp3deps.join(", ")}`);
  console.log(`WP-003 eligible now : ${eligible.includes("WP-003")}`);
  console.log(`eligible packages   : ${eligible.join(", ") || "(none)"}`);
  await prisma.$disconnect();
})().catch(async (e) => { console.error("STAGE A ERROR:", e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });

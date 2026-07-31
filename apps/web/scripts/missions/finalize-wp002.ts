import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Record the truthful outcome of the WP-002 run: the independent review
 * returned BLOCKED, so the package is CHANGES_REQUESTED with defects, and the
 * mission is BLOCKED with a specific reason. Evidence is preserved.
 */
const prisma = new PrismaClient();
(async () => {
  const m = await prisma.mission.findUniqueOrThrow({ where: { key: "VISUAL-2026-001" } });
  const wp = await prisma.workPackage.findFirstOrThrow({ where: { missionId: m.id, key: "WP-002" } });

  await prisma.queueJob.updateMany({ where: { missionId: m.id, status: { in: ["QUEUED", "CLAIMED", "RUNNING"] } }, data: { status: "CANCELLED" } });
  await prisma.agentRun.updateMany({ where: { missionId: m.id, status: { in: ["PENDING", "RUNNING"] } }, data: { status: "CANCELLED", completedAt: new Date() } });
  await prisma.workPackage.update({ where: { id: wp.id }, data: { status: "CHANGES_REQUESTED" } });

  const detail = "BLOCKED_ASSET_REVIEW: independent review returned BLOCKED — 6 assets blocked, 6 changes requested (building phash similarity, cropped base, floor boundary tolerance)";
  await prisma.mission.update({
    where: { id: m.id },
    data: { status: "BLOCKED", blockedReason: "MANUAL_ESCALATION", blockedDetail: detail },
  });
  await prisma.missionAuditLog.create({
    data: {
      missionId: m.id, action: "work_package.changes_requested", entityType: "workPackage", entityId: wp.id,
      fromState: "IN_PROGRESS", toState: "CHANGES_REQUESTED", reason: detail,
    },
  });

  const defects = await prisma.defect.count({ where: { missionId: m.id } });
  const usage = await prisma.agentUsageRecord.aggregate({ where: { missionId: m.id }, _sum: { costUsd: true } });
  const budget = await prisma.missionBudget.findUniqueOrThrow({ where: { missionId: m.id } });
  console.log(`WP-002  : CHANGES_REQUESTED`);
  console.log(`mission : BLOCKED — ${detail.slice(0, 80)}...`);
  console.log(`defects : ${defects}`);
  console.log(`spent   : $${Number(budget.spentCostUsd).toFixed(4)} (usage records $${Number(usage._sum.costUsd ?? 0).toFixed(4)})`);
  await prisma.$disconnect();
})();

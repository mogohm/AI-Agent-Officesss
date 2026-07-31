import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Recovery helper (§15): return packages that failed for an infrastructure
 * reason (e.g. no executor for the role) to READY. Evidence is never deleted.
 */
const KEY = process.argv[2] ?? "VISUAL-2026-001";
const prisma = new PrismaClient();
(async () => {
  const m = await prisma.mission.findUniqueOrThrow({ where: { key: KEY } });
  const wp = await prisma.workPackage.updateMany({ where: { missionId: m.id, status: "FAILED" }, data: { status: "READY", attemptCount: 0 } });
  const jobs = await prisma.queueJob.updateMany({ where: { missionId: m.id, status: { in: ["DEAD", "FAILED"] } }, data: { status: "CANCELLED" } });
  const runs = await prisma.agentRun.updateMany({ where: { missionId: m.id, status: "FAILED" }, data: { status: "CANCELLED" } });
  console.log(`reset: workPackages=${wp.count} jobs=${jobs.count} agentRuns=${runs.count}`);
  await prisma.$disconnect();
})();

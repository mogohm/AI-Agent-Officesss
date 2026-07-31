import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/** Put the mission into EXECUTING with WP-002 eligible (WP-001 stays PASSED). */
const prisma = new PrismaClient();
(async () => {
  const m = await prisma.mission.findUniqueOrThrow({ where: { key: "VISUAL-2026-001" } });
  await prisma.repositoryWorkspace.deleteMany({ where: { missionId: m.id } });
  await prisma.queueJob.deleteMany({ where: { missionId: m.id } });
  await prisma.workPackage.updateMany({ where: { missionId: m.id, key: "WP-002" }, data: { status: "READY", attemptCount: 0, completedAt: null } });
  await prisma.mission.update({ where: { id: m.id }, data: { status: "EXECUTING", blockedReason: "NONE", blockedDetail: null } });
  const wp = await prisma.workPackage.findMany({ where: { missionId: m.id }, select: { key: true, status: true }, orderBy: { key: "asc" } });
  console.log("mission:", m.status, "->", "EXECUTING");
  console.log(wp.map((w) => `${w.key}=${w.status}`).join(" "));
  await prisma.$disconnect();
})();

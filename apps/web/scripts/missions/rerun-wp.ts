import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Re-run a single work package from a clean state (used to prove the loop is
 * reproducible). Evidence rows are kept; only status is rewound.
 */
const KEY = process.env.MISSION_KEY ?? "VISUAL-2026-001";
const WP = process.env.WP_KEY ?? "WP-001";
const prisma = new PrismaClient();
(async () => {
  const m = await prisma.mission.findUniqueOrThrow({ where: { key: KEY } });
  await prisma.workPackage.updateMany({ where: { missionId: m.id, key: WP }, data: { status: "READY", attemptCount: 0, completedAt: null } });
  await prisma.queueJob.deleteMany({ where: { missionId: m.id } });
  await prisma.mission.update({ where: { id: m.id }, data: { status: "DRAFT", iteration: 0, startedAt: null, blockedReason: "NONE", blockedDetail: null } });
  const wp = await prisma.workPackage.findMany({ where: { missionId: m.id }, select: { key: true, status: true }, orderBy: { key: "asc" } });
  console.log(`mission -> DRAFT, ${WP} -> READY`);
  console.log(wp.map((w) => `${w.key}=${w.status}`).join(" "));
  await prisma.$disconnect();
})();

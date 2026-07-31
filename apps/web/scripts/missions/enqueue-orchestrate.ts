import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Enqueue one orchestration turn (same durable job the web Start button
 * creates). Used to drive a controlled run from the CLI.
 */
const prisma = new PrismaClient();
(async () => {
  const m = await prisma.mission.findUniqueOrThrow({ where: { key: "VISUAL-2026-001" } });
  const jobKey = `mission:${m.id}:orchestrate:${m.iteration}`;
  const existing = await prisma.queueJob.findUnique({ where: { jobKey } });
  if (existing) {
    console.log("duplicate suppressed — job already exists:", existing.status);
  } else {
    await prisma.queueJob.create({
      data: {
        jobKey, queue: "MISSION_ORCHESTRATION", payload: { missionId: m.id },
        missionId: m.id, correlationId: `${m.key}:cli:${m.iteration}`,
      },
    });
    console.log("enqueued", jobKey);
  }
  await prisma.$disconnect();
})();

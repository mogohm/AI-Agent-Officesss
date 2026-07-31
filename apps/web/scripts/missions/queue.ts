import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/** Queue inspection + recovery (§15). Read-only unless --requeue-dead is given. */
const prisma = new PrismaClient();
(async () => {
  const requeue = process.argv.includes("--requeue-dead");
  if (requeue) {
    const r = await prisma.queueJob.updateMany({
      where: { status: "DEAD" },
      data: { status: "QUEUED", attempt: 0, runAfter: new Date(), leaseUntil: null, claimedBy: null },
    });
    console.log(`requeued ${r.count} dead jobs`);
  }
  const byStatus = await prisma.queueJob.groupBy({ by: ["queue", "status"], _count: { _all: true } });
  console.log("queue depth:");
  for (const r of byStatus) console.log(`  ${r.queue.padEnd(24)} ${r.status.padEnd(10)} ${r._count._all}`);
  const recent = await prisma.queueJob.findMany({ orderBy: { updatedAt: "desc" }, take: 10, select: { jobKey: true, status: true, attempt: true, lastError: true } });
  console.log("recent jobs:");
  for (const j of recent) console.log(`  ${j.status.padEnd(10)} a${j.attempt} ${j.jobKey}${j.lastError ? " — " + j.lastError.slice(0, 90) : ""}`);
  const workers = await prisma.workerHeartbeat.findMany({ where: { processName: { startsWith: "delivery-" } }, orderBy: { lastSeenAt: "desc" }, take: 5 });
  console.log("delivery workers:");
  for (const w of workers) console.log(`  ${w.processName} ${w.status} ${Math.round((Date.now() - w.lastSeenAt.getTime()) / 1000)}s ago`);
  await prisma.$disconnect();
})();

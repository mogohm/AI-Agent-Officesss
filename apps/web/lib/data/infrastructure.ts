import "server-only";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { accessibleCompanyIds } from "@/lib/rbac";
import { checkDatabase, checkRedis } from "@/lib/health";

export async function getInfrastructure() {
  await requireUser();
  const ids = await accessibleCompanyIds();
  const scope = ids === "all" ? {} : { companyId: { in: ids } };

  const [database, redis, workers, queueDepth, runningTasks, providers] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    db.workerHeartbeat.findMany({ orderBy: { lastSeenAt: "desc" }, take: 20 }),
    db.agentTask.count({ where: { status: "QUEUED" } }),
    db.agentTask.count({ where: { status: "RUNNING" } }),
    db.providerConnection.findMany({
      where: ids === "all" ? {} : { OR: [{ companyId: null }, scope] },
      select: { id: true, displayName: true, providerType: true, status: true, companyId: true, lastTestedAt: true, lastError: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const now = Date.now();
  const workerRows = workers.map((w) => ({
    id: w.id, processName: w.processName, status: w.status, queueDepth: w.queueDepth,
    ageSeconds: Math.round((now - w.lastSeenAt.getTime()) / 1000),
    live: now - w.lastSeenAt.getTime() < 40_000 && w.status !== "offline",
    lastJobAt: w.lastJobAt,
  }));

  return { database, redis, workers: workerRows, queueDepth, runningTasks, providers };
}

import "server-only";
import { db } from "@/lib/db";
import { accessibleCompanyIds } from "@/lib/rbac";

export function startOfMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

const ONLINE_RUNTIME = ["IDLE", "QUEUED", "THINKING", "WORKING", "WAITING_APPROVAL"] as const;
const ACTIVE_TASK = ["QUEUED", "RUNNING", "WAITING_APPROVAL"] as const;

export type DashboardMetrics = {
  companies: number;
  departments: number;
  workers: number;
  onlineWorkers: number;
  activeTasks: number;
  waitingApprovals: number;
  failedTasks: number;
  monthCost: number;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const ids = await accessibleCompanyIds();
  const companyWhere = ids === "all" ? {} : { id: { in: ids } };
  const scope = ids === "all" ? {} : { companyId: { in: ids } };

  const [companies, departments, workers, onlineWorkers, activeTasks, waitingApprovals, failedTasks, usage] =
    await Promise.all([
      db.company.count({ where: { ...companyWhere, archivedAt: null } }),
      db.department.count({ where: { ...scope, archivedAt: null } }),
      db.aIWorker.count({ where: { ...scope, archivedAt: null } }),
      db.aIWorker.count({ where: { ...scope, archivedAt: null, runtimeStatus: { in: [...ONLINE_RUNTIME] } } }),
      db.agentTask.count({ where: { ...scope, status: { in: [...ACTIVE_TASK] } } }),
      db.approval.count({ where: { ...scope, status: "PENDING" } }),
      db.agentTask.count({ where: { ...scope, status: "FAILED" } }),
      db.usageRecord.aggregate({ where: { ...scope, recordedAt: { gte: startOfMonth() } }, _sum: { totalCost: true } }),
    ]);

  return {
    companies,
    departments,
    workers,
    onlineWorkers,
    activeTasks,
    waitingApprovals,
    failedTasks,
    monthCost: Number(usage._sum.totalCost ?? 0),
  };
}

export async function getCompanyOverview() {
  const ids = await accessibleCompanyIds();
  const where = ids === "all" ? { archivedAt: null } : { archivedAt: null, id: { in: ids } };
  const companies = await db.company.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { departments: true, workers: true } },
    },
  });
  // active tasks per company
  const results = await Promise.all(
    companies.map(async (c) => {
      const [activeTasks, usage] = await Promise.all([
        db.agentTask.count({ where: { companyId: c.id, status: { in: [...ACTIVE_TASK] } } }),
        db.usageRecord.aggregate({ where: { companyId: c.id, recordedAt: { gte: startOfMonth() } }, _sum: { totalCost: true } }),
      ]);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        legalName: c.legalName,
        status: c.status,
        departments: c._count.departments,
        workers: c._count.workers,
        activeTasks,
        monthCost: Number(usage._sum.totalCost ?? 0),
      };
    }),
  );
  return results;
}

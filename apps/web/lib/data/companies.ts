import "server-only";
import { db } from "@/lib/db";
import { requireUser, isSuperAdmin } from "@/lib/auth-helpers";
import { requireCompanyAccess } from "@/lib/rbac";
import { testDataFilter } from "@/lib/test-data";

/** Same definition the dashboard uses, so the two pages cannot disagree. */
const ACTIVE_TASK = ["QUEUED", "RUNNING", "WAITING_APPROVAL"] as const;

/** Companies the current user may see (active only), for selectors/lists. */
export async function listAccessibleCompanies(opts?: { includeArchived?: boolean; showTestData?: boolean }) {
  const user = await requireUser();
  const base = isSuperAdmin(user) ? {} : { members: { some: { userId: user.id } } };
  const notTest = testDataFilter(opts?.showTestData);
  const where = opts?.includeArchived ? { ...base, ...notTest } : { ...base, ...notTest, archivedAt: null };
  const companies = await db.company.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { _count: { select: { departments: { where: { archivedAt: null } }, workers: { where: { archivedAt: null } }, projects: true } } },
  });
  // active task count must match the dashboard exactly - the same stat cell on two
  // pages showing different numbers for one company reads as a data bug
  return Promise.all(companies.map(async (c) => ({
    ...c,
    activeTasks: await db.agentTask.count({ where: { companyId: c.id, status: { in: [...ACTIVE_TASK] } } }),
  })));
}

/** Full company detail (RBAC-scoped) for the company workspace page. */
export async function getCompanyDetail(companyId: string) {
  const ctx = await requireCompanyAccess(companyId);
  const [departments, workers, projects, recentActivity] = await Promise.all([
    db.department.findMany({ where: { companyId, archivedAt: null }, orderBy: { floorOrder: "desc" }, include: { _count: { select: { workers: { where: { archivedAt: null } } } } } }),
    db.aIWorker.findMany({ where: { companyId, archivedAt: null }, orderBy: { name: "asc" }, include: { department: { select: { name: true } } } }),
    db.project.findMany({ where: { companyId, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 6 }),
    db.activityLog.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true, email: true } } } }),
  ]);
  return { company: ctx.company, role: ctx.role, departments, workers, projects, recentActivity };
}

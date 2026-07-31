import "server-only";
import { db } from "@/lib/db";
import { requireUser, isSuperAdmin } from "@/lib/auth-helpers";
import { requireCompanyAccess } from "@/lib/rbac";

/** Companies the current user may see (active only), for selectors/lists. */
export async function listAccessibleCompanies(opts?: { includeArchived?: boolean }) {
  const user = await requireUser();
  const base = isSuperAdmin(user) ? {} : { members: { some: { userId: user.id } } };
  const where = opts?.includeArchived ? base : { ...base, archivedAt: null };
  return db.company.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { _count: { select: { departments: { where: { archivedAt: null } }, workers: { where: { archivedAt: null } }, projects: true } } },
  });
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

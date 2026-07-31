import "server-only";
import { db } from "@/lib/db";
import { requireCompanyAccess } from "@/lib/rbac";

export async function listDepartments(companyId: string) {
  const ctx = await requireCompanyAccess(companyId);
  const departments = await db.department.findMany({
    where: { companyId, archivedAt: null },
    orderBy: { floorOrder: "desc" },
    include: { _count: { select: { workers: { where: { archivedAt: null } } } } },
  });
  return { company: ctx.company, role: ctx.role, departments };
}

export async function getDepartment(companyId: string, departmentId: string) {
  const ctx = await requireCompanyAccess(companyId);
  const department = await db.department.findFirst({
    where: { id: departmentId, companyId },
    include: {
      workers: { where: { archivedAt: null }, orderBy: { name: "asc" } },
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, status: true, priority: true, createdAt: true, worker: { select: { name: true, avatarKey: true, role: true, runtimeStatus: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });
  if (!department) return null;
  return { company: ctx.company, role: ctx.role, department };
}

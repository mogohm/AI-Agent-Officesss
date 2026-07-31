import "server-only";
import type { Prisma, ProjectStatus, ProjectPriority } from "@prisma/client";
import { db } from "@/lib/db";
import { requireCompanyAccess, accessibleCompanyIds } from "@/lib/rbac";

export async function listProjects(filter?: { companyId?: string; status?: ProjectStatus; priority?: ProjectPriority; q?: string }) {
  const ids = await accessibleCompanyIds();
  const scope = ids === "all" ? {} : { companyId: { in: ids as string[] } };
  const where: Prisma.ProjectWhereInput = {
    ...scope,
    ...(filter?.companyId ? { companyId: filter.companyId } : {}),
    ...(filter?.status ? { status: filter.status } : { archivedAt: null }),
    ...(filter?.priority ? { priority: filter.priority } : {}),
    ...(filter?.q ? { name: { contains: filter.q, mode: "insensitive" } } : {}),
  };
  return db.project.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      company: { select: { name: true } },
      departmentLinks: { take: 4, include: { department: { select: { id: true, name: true, themeColor: true } } } },
      workerLinks: { take: 6, include: { worker: { select: { id: true, name: true, avatarKey: true, role: true, runtimeStatus: true } } } },
      _count: { select: { tasks: true, departmentLinks: true, workerLinks: true } },
    },
    take: 100,
  });
}

export async function getProject(companyId: string, projectId: string) {
  const ctx = await requireCompanyAccess(companyId);
  const project = await db.project.findFirst({
    where: { id: projectId, companyId },
    include: {
      departmentLinks: { include: { department: { select: { id: true, name: true } } } },
      workerLinks: { include: { worker: { select: { id: true, name: true, role: true } } } },
      tasks: { orderBy: { createdAt: "desc" }, take: 20, include: { worker: { select: { name: true } } } },
    },
  });
  if (!project) return null;
  return { company: ctx.company, role: ctx.role, project };
}

export async function getProjectFormData(companyId: string) {
  await requireCompanyAccess(companyId);
  const [departments, workers] = await Promise.all([
    db.department.findMany({ where: { companyId, archivedAt: null }, orderBy: { floorOrder: "desc" }, select: { id: true, name: true } }),
    db.aIWorker.findMany({ where: { companyId, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
  ]);
  return { departments, workers };
}

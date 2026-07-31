import "server-only";
import type { Prisma, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireCompanyAccess, accessibleCompanyIds } from "@/lib/rbac";
import { NotFoundError } from "@/lib/errors";

export async function listTasks(filter?: { companyId?: string; status?: TaskStatus }) {
  const ids = await accessibleCompanyIds();
  const scope = ids === "all" ? {} : { companyId: { in: ids as string[] } };
  const where: Prisma.AgentTaskWhereInput = {
    ...scope,
    ...(filter?.companyId ? { companyId: filter.companyId } : {}),
    ...(filter?.status ? { status: filter.status } : {}),
  };
  return db.agentTask.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true } },
      project: { select: { name: true } },
      worker: { select: { name: true } },
    },
    take: 100,
  });
}

export async function getTask(taskId: string) {
  const task = await db.agentTask.findUnique({
    where: { id: taskId },
    include: {
      company: { select: { id: true, name: true, currency: true } },
      project: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      worker: { select: { id: true, name: true } },
      runs: { orderBy: { attemptNumber: "desc" } },
      approvals: { orderBy: { requestedAt: "desc" } },
    },
  });
  if (!task) throw new NotFoundError("ไม่พบงาน");
  const ctx = await requireCompanyAccess(task.companyId);
  return { task, role: ctx.role };
}

export async function getTaskFormData(companyId: string) {
  await requireCompanyAccess(companyId);
  const [projects, departments, workers] = await Promise.all([
    db.project.findMany({ where: { companyId, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.department.findMany({ where: { companyId, archivedAt: null }, orderBy: { floorOrder: "desc" }, select: { id: true, name: true } }),
    db.aIWorker.findMany({ where: { companyId, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { projects, departments, workers };
}

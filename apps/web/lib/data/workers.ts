import "server-only";
import { db } from "@/lib/db";
import { requireCompanyAccess, accessibleCompanyIds } from "@/lib/rbac";
import { NotFoundError } from "@/lib/errors";

export async function listWorkers(filter?: { companyId?: string }) {
  const ids = await accessibleCompanyIds();
  const scope = ids === "all" ? {} : { companyId: { in: ids } };
  const where = {
    archivedAt: null,
    ...scope,
    ...(filter?.companyId ? { companyId: filter.companyId } : {}),
  };
  return db.aIWorker.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      company: { select: { name: true, currency: true } },
      department: { select: { name: true } },
      providerConnection: { select: { providerType: true, displayName: true } },
      // most recent active task (for the "current task" line on worker cards)
      tasks: {
        where: { status: { in: ["QUEUED", "RUNNING", "WAITING_APPROVAL"] } },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, title: true, status: true },
      },
    },
  });
}

export async function getWorker(workerId: string) {
  const worker = await db.aIWorker.findUnique({
    where: { id: workerId },
    include: {
      company: { select: { id: true, name: true, currency: true } },
      department: { select: { id: true, name: true } },
      _count: { select: { tasks: true, taskRuns: true } },
    },
  });
  if (!worker) throw new NotFoundError("ไม่พบ worker");
  const ctx = await requireCompanyAccess(worker.companyId); // authz
  return { worker, role: ctx.role };
}

/** Departments + models to populate the worker create/edit form. */
export async function getWorkerFormData(companyId: string) {
  await requireCompanyAccess(companyId);
  const [departments, models] = await Promise.all([
    db.department.findMany({ where: { companyId, archivedAt: null }, orderBy: { floorOrder: "desc" }, select: { id: true, name: true } }),
    db.providerModel.findMany({ where: { isActive: true }, orderBy: [{ providerType: "asc" }, { displayName: "asc" }], select: { id: true, displayName: true, providerType: true, modelKey: true } }),
  ]);
  return { departments, models };
}

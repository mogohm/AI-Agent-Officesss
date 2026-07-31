import "server-only";
import { db } from "@/lib/db";
import { accessibleCompanyIds } from "@/lib/rbac";

export async function listActivity(filter?: { companyId?: string; entityType?: string }) {
  const ids = await accessibleCompanyIds();
  if (ids !== "all" && ids.length === 0) return [];
  const scope = ids === "all" ? {} : { companyId: { in: ids } };
  return db.activityLog.findMany({
    where: {
      ...scope,
      ...(filter?.companyId ? { companyId: filter.companyId } : {}),
      ...(filter?.entityType ? { entityType: filter.entityType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      company: { select: { name: true } },
      user: { select: { name: true } },
      worker: { select: { name: true, avatarKey: true, role: true, runtimeStatus: true } },
    },
  });
}

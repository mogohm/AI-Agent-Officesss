import "server-only";
import { db } from "@/lib/db";
import { accessibleCompanyIds } from "@/lib/rbac";

export async function listKnowledge(filter?: { companyId?: string }) {
  const ids = await accessibleCompanyIds();
  if (ids !== "all" && ids.length === 0) return [];
  const scope = ids === "all" ? {} : { companyId: { in: ids } };
  return db.knowledgeDocument.findMany({
    where: { ...scope, ...(filter?.companyId ? { companyId: filter.companyId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { company: { select: { name: true } }, department: { select: { name: true } } },
  });
}

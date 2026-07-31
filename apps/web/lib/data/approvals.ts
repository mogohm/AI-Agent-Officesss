import "server-only";
import { db } from "@/lib/db";
import { accessibleCompanyIds, requireCompanyAccess } from "@/lib/rbac";
import { NotFoundError } from "@/lib/errors";
import type { ApprovalStatus } from "@prisma/client";

export async function listApprovals(opts?: { status?: ApprovalStatus; companyId?: string }) {
  const ids = await accessibleCompanyIds();
  if (ids !== "all" && ids.length === 0) return [];
  const scope = ids === "all" ? {} : { companyId: { in: ids } };
  return db.approval.findMany({
    where: {
      ...scope,
      ...(opts?.companyId ? { companyId: opts.companyId } : {}),
      ...(opts?.status ? { status: opts.status } : {}),
    },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    take: 200,
    include: {
      company: { select: { id: true, name: true, currency: true } },
      task: { select: { id: true, title: true, status: true, createdById: true } },
      requestedByWorker: { select: { id: true, name: true } },
      decidedByUser: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function pendingApprovalCount() {
  const ids = await accessibleCompanyIds();
  if (ids !== "all" && ids.length === 0) return 0;
  const scope = ids === "all" ? {} : { companyId: { in: ids } };
  return db.approval.count({ where: { ...scope, status: "PENDING" } });
}

export async function getApproval(id: string) {
  const approval = await db.approval.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, currency: true } },
      task: { select: { id: true, title: true, status: true, instruction: true, outputJson: true, createdById: true } },
      taskRun: { select: { id: true, model: true, totalTokens: true, actualCost: true, responsePayload: true } },
      requestedByWorker: { select: { id: true, name: true } },
      decidedByUser: { select: { id: true, name: true, email: true } },
    },
  });
  if (!approval) throw new NotFoundError("ไม่พบคำขออนุมัติ");
  const { role } = await requireCompanyAccess(approval.companyId);
  return { approval, role };
}

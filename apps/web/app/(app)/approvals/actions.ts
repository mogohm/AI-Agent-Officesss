"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMinRole } from "@/lib/rbac";
import { getApproval } from "@/lib/data/approvals";
import { logActivity } from "@/lib/activity";
import { assertTransition } from "@/lib/task-state";
import { toSafeError, ConflictError, AuthorizationError, InvalidStateTransitionError } from "@/lib/errors";
import { ok, fail, type ApiResult } from "@/lib/result";

/**
 * Shared decision guard: approver must have REVIEWER+ in the company, the
 * approval must still be PENDING, and — the key control — the approver may NOT
 * be the same person who created the task (no self-approval).
 */
async function loadDecidable(approvalId: string) {
  const { approval } = await getApproval(approvalId);
  const { user } = await requireMinRole(approval.companyId, "REVIEWER");
  if (approval.status !== "PENDING") throw new ConflictError("คำขอนี้ถูกตัดสินไปแล้ว");
  if (approval.task.createdById && approval.task.createdById === user.id) {
    throw new AuthorizationError("ไม่สามารถอนุมัติงานที่ตนเองสร้าง (no self-approval)");
  }
  return { approval, user };
}

function safeTransition(from: Parameters<typeof assertTransition>[0], to: Parameters<typeof assertTransition>[1]) {
  try { assertTransition(from, to); }
  catch { throw new InvalidStateTransitionError(`เปลี่ยนสถานะงานจาก ${from} → ${to} ไม่ได้`); }
}

export async function approveApproval(approvalId: string, note?: string): Promise<ApiResult<null>> {
  try {
    const { approval, user } = await loadDecidable(approvalId);
    safeTransition(approval.task.status, "APPROVED");
    await db.$transaction(async (tx) => {
      await tx.approval.update({ where: { id: approvalId }, data: { status: "APPROVED", decidedByUserId: user.id, decidedAt: new Date(), decisionNote: note?.slice(0, 2000) || null } });
      await tx.agentTask.update({ where: { id: approval.taskId }, data: { status: "APPROVED" } });
      await tx.agentTask.update({ where: { id: approval.taskId }, data: { status: "COMPLETED", completedAt: new Date() } });
      if (approval.requestedByWorker) await tx.aIWorker.update({ where: { id: approval.requestedByWorker.id }, data: { runtimeStatus: "IDLE" } });
    });
    await logActivity({ companyId: approval.companyId, userId: user.id, entityType: "approval", entityId: approvalId, action: "approval.approved", message: `อนุมัติ: ${approval.summary}` });
    revalidatePath("/approvals"); revalidatePath(`/approvals/${approvalId}`); revalidatePath(`/tasks/${approval.taskId}`);
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

export async function rejectApproval(approvalId: string, note?: string): Promise<ApiResult<null>> {
  try {
    const { approval, user } = await loadDecidable(approvalId);
    safeTransition(approval.task.status, "CANCELLED");
    await db.$transaction(async (tx) => {
      await tx.approval.update({ where: { id: approvalId }, data: { status: "REJECTED", decidedByUserId: user.id, decidedAt: new Date(), decisionNote: note?.slice(0, 2000) || null } });
      await tx.agentTask.update({ where: { id: approval.taskId }, data: { status: "CANCELLED" } });
      if (approval.requestedByWorker) await tx.aIWorker.update({ where: { id: approval.requestedByWorker.id }, data: { runtimeStatus: "IDLE" } });
    });
    await logActivity({ companyId: approval.companyId, userId: user.id, entityType: "approval", entityId: approvalId, action: "approval.rejected", message: `ปฏิเสธ: ${approval.summary}` });
    revalidatePath("/approvals"); revalidatePath(`/approvals/${approvalId}`); revalidatePath(`/tasks/${approval.taskId}`);
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

export async function requestRevision(approvalId: string, note: string): Promise<ApiResult<null>> {
  try {
    if (!note?.trim()) return fail("VALIDATION", "กรุณาระบุสิ่งที่ต้องแก้ไข");
    const { approval, user } = await loadDecidable(approvalId);
    safeTransition(approval.task.status, "REVISION_REQUIRED");
    await db.$transaction(async (tx) => {
      await tx.approval.update({ where: { id: approvalId }, data: { status: "CANCELLED", decidedByUserId: user.id, decidedAt: new Date(), decisionNote: note.slice(0, 2000) } });
      await tx.agentTask.update({ where: { id: approval.taskId }, data: { status: "REVISION_REQUIRED" } });
      if (approval.requestedByWorker) await tx.aIWorker.update({ where: { id: approval.requestedByWorker.id }, data: { runtimeStatus: "IDLE" } });
    });
    await logActivity({ companyId: approval.companyId, userId: user.id, entityType: "approval", entityId: approvalId, action: "approval.revision_requested", message: `ขอแก้ไข: ${approval.summary}` });
    revalidatePath("/approvals"); revalidatePath(`/approvals/${approvalId}`); revalidatePath(`/tasks/${approval.taskId}`);
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

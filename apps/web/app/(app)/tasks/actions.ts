"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMinRole } from "@/lib/rbac";
import { getTask } from "@/lib/data/tasks";
import { taskCreateSchema } from "@/lib/validation/task";
import { logActivity } from "@/lib/activity";
import { toSafeError, ValidationError, InvalidStateTransitionError } from "@/lib/errors";
import { assertTransition } from "@/lib/task-state";
import { enqueueTask } from "@/lib/queue";
import { ok, fail, type ApiResult } from "@/lib/result";
import type { TaskStatus } from "@prisma/client";

export async function createTask(input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const parsed = taskCreateSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const { user } = await requireMinRole(d.companyId, "OPERATOR");

    // Validate related entities belong to the company.
    if (d.projectId && !(await db.project.findFirst({ where: { id: d.projectId, companyId: d.companyId }, select: { id: true } }))) throw new ValidationError("โปรเจกต์ไม่อยู่ในบริษัทนี้");
    if (d.departmentId && !(await db.department.findFirst({ where: { id: d.departmentId, companyId: d.companyId }, select: { id: true } }))) throw new ValidationError("แผนกไม่อยู่ในบริษัทนี้");
    let requiresApproval = d.requiresApproval;
    if (d.workerId) {
      const w = await db.aIWorker.findFirst({ where: { id: d.workerId, companyId: d.companyId }, select: { id: true, requiresDefaultApproval: true } });
      if (!w) throw new ValidationError("worker ไม่อยู่ในบริษัทนี้");
      requiresApproval = requiresApproval || w.requiresDefaultApproval;
    }

    const task = await db.agentTask.create({
      data: {
        companyId: d.companyId, projectId: d.projectId || null, departmentId: d.departmentId || null, workerId: d.workerId || null,
        title: d.title, instruction: d.instruction, priority: d.priority, requiresApproval,
        maxRetries: d.maxRetries, timeoutSeconds: d.timeoutSeconds, createdById: user.id, status: "DRAFT",
      },
    });
    await logActivity({ companyId: d.companyId, userId: user.id, entityType: "task", entityId: task.id, action: "task.created", message: `สร้างงาน ${task.title}` });
    revalidatePath("/tasks");
    return ok({ id: task.id });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

async function transition(taskId: string, to: TaskStatus, action: string, msg: string, extra?: Record<string, unknown>) {
  const { task } = await getTask(taskId);
  const { user } = await requireMinRole(task.companyId, "OPERATOR");
  try { assertTransition(task.status, to); }
  catch { throw new InvalidStateTransitionError(`เปลี่ยนสถานะจาก ${task.status} → ${to} ไม่ได้`); }
  await db.agentTask.update({ where: { id: taskId }, data: { status: to, ...(extra ?? {}) } });
  await logActivity({ companyId: task.companyId, userId: user.id, entityType: "task", entityId: taskId, action, message: msg });
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

// Queue a DRAFT / REVISION_REQUIRED task — the worker polls QUEUED tasks.
export async function queueTask(taskId: string): Promise<ApiResult<null>> {
  try { await transition(taskId, "QUEUED", "task.queued", "เข้าคิวงาน", { scheduledAt: new Date() }); await enqueueTask(taskId); return ok(null); }
  catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}
export async function cancelTask(taskId: string): Promise<ApiResult<null>> {
  try { await transition(taskId, "CANCELLED", "task.cancelled", "ยกเลิกงาน"); return ok(null); }
  catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}
export async function retryTask(taskId: string): Promise<ApiResult<null>> {
  try { await transition(taskId, "QUEUED", "task.retried", "ลองใหม่", { scheduledAt: new Date() }); await enqueueTask(taskId); return ok(null); }
  catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

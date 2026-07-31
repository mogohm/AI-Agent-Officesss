"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCompanyRole } from "@/lib/rbac";
import { getWorker } from "@/lib/data/workers";
import { workerCreateSchema, workerUpdateSchema } from "@/lib/validation/worker";
import { uniqueSlug } from "@/lib/slug";
import { logActivity } from "@/lib/activity";
import { toSafeError, ValidationError } from "@/lib/errors";
import { requiresApproval } from "@/lib/tools";
import { ok, fail, type ApiResult } from "@/lib/result";
import type { WorkerStatus } from "@prisma/client";

function hasHighRisk(tools: string[]): boolean {
  return tools.some((t) => requiresApproval(t));
}

export async function createWorker(input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const parsed = workerCreateSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const { user } = await requireCompanyRole(d.companyId, ["OWNER", "ADMIN"]);

    if (d.departmentId) {
      const dept = await db.department.findFirst({ where: { id: d.departmentId, companyId: d.companyId }, select: { id: true } });
      if (!dept) throw new ValidationError("แผนกไม่อยู่ในบริษัทนี้");
    }
    const slug = await uniqueSlug(d.name, async (s) => !!(await db.aIWorker.findFirst({ where: { companyId: d.companyId, slug: s }, select: { id: true } })));

    const worker = await db.aIWorker.create({
      data: {
        companyId: d.companyId,
        departmentId: d.departmentId || null,
        name: d.name, slug, role: d.role, description: d.description || null,
        avatarKey: d.avatarKey, modelId: d.modelId || null, providerConnectionId: d.providerConnectionId || null,
        systemPrompt: d.systemPrompt || null, skills: d.skills, toolPermissions: d.toolPermissions,
        monthlyBudget: d.monthlyBudget != null ? d.monthlyBudget : null,
        requiresDefaultApproval: d.requiresDefaultApproval || hasHighRisk(d.toolPermissions),
        temperature: d.temperature, maxOutputTokens: d.maxOutputTokens,
        runtimeStatus: "OFFLINE",
      },
    });
    await logActivity({ companyId: d.companyId, userId: user.id, entityType: "worker", entityId: worker.id, action: "worker.created", message: `สร้าง AI worker ${worker.name}` });
    revalidatePath("/workers");
    revalidatePath(`/companies/${d.companyId}`);
    return ok({ id: worker.id });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

export async function updateWorker(workerId: string, input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const { worker } = await getWorker(workerId);
    const { user } = await requireCompanyRole(worker.companyId, ["OWNER", "ADMIN"]);
    const parsed = workerUpdateSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    if (d.departmentId) {
      const dept = await db.department.findFirst({ where: { id: d.departmentId, companyId: worker.companyId }, select: { id: true } });
      if (!dept) throw new ValidationError("แผนกไม่อยู่ในบริษัทนี้");
    }
    await db.aIWorker.update({
      where: { id: workerId },
      data: {
        ...(d.name != null ? { name: d.name } : {}),
        ...(d.role != null ? { role: d.role } : {}),
        ...(d.description !== undefined ? { description: d.description || null } : {}),
        ...(d.departmentId !== undefined ? { departmentId: d.departmentId || null } : {}),
        ...(d.avatarKey != null ? { avatarKey: d.avatarKey } : {}),
        ...(d.modelId !== undefined ? { modelId: d.modelId || null } : {}),
        ...(d.systemPrompt !== undefined ? { systemPrompt: d.systemPrompt || null } : {}),
        ...(d.skills != null ? { skills: d.skills } : {}),
        ...(d.toolPermissions != null ? { toolPermissions: d.toolPermissions, requiresDefaultApproval: (d.requiresDefaultApproval ?? worker.requiresDefaultApproval) || hasHighRisk(d.toolPermissions) } : {}),
        ...(d.monthlyBudget !== undefined ? { monthlyBudget: d.monthlyBudget ?? null } : {}),
        ...(d.temperature != null ? { temperature: d.temperature } : {}),
        ...(d.maxOutputTokens != null ? { maxOutputTokens: d.maxOutputTokens } : {}),
      },
    });
    await logActivity({ companyId: worker.companyId, userId: user.id, entityType: "worker", entityId: workerId, action: "worker.updated", message: `แก้ไข worker ${worker.name}` });
    revalidatePath(`/workers/${workerId}`);
    revalidatePath("/workers");
    return ok({ id: workerId });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

async function setBusinessStatus(workerId: string, status: WorkerStatus, action: string, msg: string, archive = false) {
  const { worker } = await getWorker(workerId);
  const { user } = await requireCompanyRole(worker.companyId, ["OWNER", "ADMIN"]);
  await db.aIWorker.update({
    where: { id: workerId },
    data: { status, archivedAt: archive ? new Date() : null, ...(archive ? { runtimeStatus: "OFFLINE" } : {}) },
  });
  await logActivity({ companyId: worker.companyId, userId: user.id, entityType: "worker", entityId: workerId, action, message: msg });
  revalidatePath("/workers");
  revalidatePath(`/companies/${worker.companyId}`);
}

export async function pauseWorker(workerId: string): Promise<ApiResult<null>> {
  try { await setBusinessStatus(workerId, "PAUSED", "worker.paused", "พัก worker"); return ok(null); }
  catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}
export async function resumeWorker(workerId: string): Promise<ApiResult<null>> {
  try { await setBusinessStatus(workerId, "ACTIVE", "worker.resumed", "เปิด worker"); return ok(null); }
  catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}
export async function archiveWorker(workerId: string): Promise<ApiResult<null>> {
  try { await setBusinessStatus(workerId, "ARCHIVED", "worker.archived", "เก็บ worker เข้าคลัง", true); return ok(null); }
  catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

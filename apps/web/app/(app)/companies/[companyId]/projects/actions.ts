"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCompanyRole } from "@/lib/rbac";
import { projectCreateSchema, projectUpdateSchema } from "@/lib/validation/project";
import { uniqueSlug } from "@/lib/slug";
import { logActivity } from "@/lib/activity";
import { toSafeError, ValidationError } from "@/lib/errors";
import { ok, fail, type ApiResult } from "@/lib/result";
import type { ProjectStatus } from "@prisma/client";

const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

async function validateLinks(companyId: string, departmentIds: string[], workerIds: string[]) {
  if (departmentIds.length) {
    const n = await db.department.count({ where: { companyId, id: { in: departmentIds } } });
    if (n !== departmentIds.length) throw new ValidationError("มีแผนกที่ไม่อยู่ในบริษัทนี้");
  }
  if (workerIds.length) {
    const n = await db.aIWorker.count({ where: { companyId, id: { in: workerIds } } });
    if (n !== workerIds.length) throw new ValidationError("มี worker ที่ไม่อยู่ในบริษัทนี้");
  }
}

export async function createProject(companyId: string, input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const { user } = await requireCompanyRole(companyId, [...MANAGE_ROLES]);
    const parsed = projectCreateSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    await validateLinks(companyId, d.departmentIds, d.workerIds);
    const slug = await uniqueSlug(d.name, async (s) => !!(await db.project.findFirst({ where: { companyId, slug: s }, select: { id: true } })));
    const project = await db.project.create({
      data: {
        companyId, name: d.name, slug, description: d.description || null, priority: d.priority,
        targetDate: d.targetDate ? new Date(d.targetDate) : null,
        monthlyBudget: d.monthlyBudget != null ? d.monthlyBudget : null,
        createdById: user.id,
        departmentLinks: { create: d.departmentIds.map((id) => ({ departmentId: id })) },
        workerLinks: { create: d.workerIds.map((id) => ({ workerId: id })) },
      },
    });
    await logActivity({ companyId, userId: user.id, entityType: "project", entityId: project.id, action: "project.created", message: `สร้างโปรเจกต์ ${project.name}` });
    revalidatePath(`/companies/${companyId}/projects`);
    revalidatePath(`/companies/${companyId}`);
    return ok({ id: project.id });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

export async function updateProject(companyId: string, projectId: string, input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const { user } = await requireCompanyRole(companyId, [...MANAGE_ROLES]);
    const proj = await db.project.findFirst({ where: { id: projectId, companyId }, select: { id: true } });
    if (!proj) throw new ValidationError("ไม่พบโปรเจกต์");
    const parsed = projectUpdateSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    if (d.departmentIds || d.workerIds) await validateLinks(companyId, d.departmentIds ?? [], d.workerIds ?? []);
    await db.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          ...(d.name != null ? { name: d.name } : {}),
          ...(d.description !== undefined ? { description: d.description || null } : {}),
          ...(d.priority != null ? { priority: d.priority } : {}),
          ...(d.targetDate !== undefined ? { targetDate: d.targetDate ? new Date(d.targetDate) : null } : {}),
          ...(d.monthlyBudget !== undefined ? { monthlyBudget: d.monthlyBudget ?? null } : {}),
        },
      });
      if (d.departmentIds) {
        await tx.projectDepartment.deleteMany({ where: { projectId } });
        if (d.departmentIds.length) await tx.projectDepartment.createMany({ data: d.departmentIds.map((id) => ({ projectId, departmentId: id })) });
      }
      if (d.workerIds) {
        await tx.projectWorker.deleteMany({ where: { projectId } });
        if (d.workerIds.length) await tx.projectWorker.createMany({ data: d.workerIds.map((id) => ({ projectId, workerId: id })) });
      }
    });
    await logActivity({ companyId, userId: user.id, entityType: "project", entityId: projectId, action: "project.updated", message: `แก้ไขโปรเจกต์` });
    revalidatePath(`/companies/${companyId}/projects/${projectId}`);
    return ok({ id: projectId });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

export async function setProjectStatus(companyId: string, projectId: string, status: ProjectStatus): Promise<ApiResult<null>> {
  try {
    const { user } = await requireCompanyRole(companyId, [...MANAGE_ROLES]);
    const proj = await db.project.findFirst({ where: { id: projectId, companyId }, select: { name: true } });
    if (!proj) throw new ValidationError("ไม่พบโปรเจกต์");
    await db.project.update({
      where: { id: projectId },
      data: {
        status,
        ...(status === "COMPLETED" ? { completedAt: new Date(), progress: 100 } : {}),
        ...(status === "ARCHIVED" ? { archivedAt: new Date() } : { archivedAt: null }),
      },
    });
    await logActivity({ companyId, userId: user.id, entityType: "project", entityId: projectId, action: `project.${status.toLowerCase()}`, message: `${proj.name} → ${status.toLowerCase()}` });
    revalidatePath(`/companies/${companyId}/projects`);
    revalidatePath(`/companies/${companyId}/projects/${projectId}`);
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCompanyRole } from "@/lib/rbac";
import { departmentCreateSchema, departmentUpdateSchema } from "@/lib/validation/department";
import { uniqueSlug } from "@/lib/slug";
import { logActivity } from "@/lib/activity";
import { toSafeError, ValidationError, ConflictError } from "@/lib/errors";
import { ok, fail, type ApiResult } from "@/lib/result";

export async function createDepartment(companyId: string, input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const { user } = await requireCompanyRole(companyId, ["OWNER", "ADMIN"]);
    const parsed = departmentCreateSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;

    const count = await db.department.count({ where: { companyId, archivedAt: null } });
    if (count >= 15) throw new ConflictError("สูงสุด 15 แผนก/ชั้นต่อบริษัท");

    const slug = await uniqueSlug(d.name, async (s) => !!(await db.department.findFirst({ where: { companyId, slug: s }, select: { id: true } })));
    const top = await db.department.aggregate({ where: { companyId }, _max: { floorOrder: true } });
    const floorOrder = (top._max.floorOrder ?? 0) + 1;

    const dept = await db.department.create({
      data: {
        companyId, name: d.name, slug, floorOrder, floorType: d.floorType, themeColor: d.themeColor,
        description: d.description || null,
        monthlyBudget: d.monthlyBudget != null ? d.monthlyBudget : null,
        systemInstruction: d.systemInstruction || null,
      },
    });
    await logActivity({ companyId, userId: user.id, entityType: "department", entityId: dept.id, action: "department.created", message: `สร้างแผนก ${dept.name} (ชั้น ${floorOrder})` });
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/departments`);
    return ok({ id: dept.id });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

export async function updateDepartment(companyId: string, departmentId: string, input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const { user } = await requireCompanyRole(companyId, ["OWNER", "ADMIN"]);
    const dept = await db.department.findFirst({ where: { id: departmentId, companyId } });
    if (!dept) throw new ValidationError("ไม่พบแผนก");
    const parsed = departmentUpdateSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    await db.department.update({
      where: { id: departmentId },
      data: {
        ...(d.name != null ? { name: d.name } : {}),
        ...(d.description !== undefined ? { description: d.description || null } : {}),
        ...(d.floorType != null ? { floorType: d.floorType } : {}),
        ...(d.themeColor != null ? { themeColor: d.themeColor } : {}),
        ...(d.monthlyBudget !== undefined ? { monthlyBudget: d.monthlyBudget ?? null } : {}),
        ...(d.systemInstruction !== undefined ? { systemInstruction: d.systemInstruction || null } : {}),
      },
    });
    await logActivity({ companyId, userId: user.id, entityType: "department", entityId: departmentId, action: "department.updated", message: `แก้ไขแผนก ${dept.name}` });
    revalidatePath(`/companies/${companyId}/departments/${departmentId}`);
    revalidatePath(`/companies/${companyId}`);
    return ok({ id: departmentId });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

export async function archiveDepartment(companyId: string, departmentId: string): Promise<ApiResult<null>> {
  try {
    const { user } = await requireCompanyRole(companyId, ["OWNER", "ADMIN"]);
    const dept = await db.department.findFirst({ where: { id: departmentId, companyId } });
    if (!dept) throw new ValidationError("ไม่พบแผนก");
    // Free the floorOrder slot (move far negative) so it leaves the active tower.
    await db.department.update({ where: { id: departmentId }, data: { status: "ARCHIVED", archivedAt: new Date(), floorOrder: -Date.now() % 1000000 } });
    await logActivity({ companyId, userId: user.id, entityType: "department", entityId: departmentId, action: "department.archived", message: `เก็บแผนก ${dept.name} เข้าคลัง` });
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/departments`);
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

/**
 * Atomically reorder floors. `orderedIds` is TOP → BOTTOM (index 0 = top floor,
 * highest floorOrder). Uses temp-negative values to avoid the unique
 * [companyId, floorOrder] collision during reassignment. Logs old → new.
 */
export async function reorderDepartments(companyId: string, orderedIds: string[]): Promise<ApiResult<null>> {
  try {
    const { user } = await requireCompanyRole(companyId, ["OWNER", "ADMIN"]);
    const active = await db.department.findMany({ where: { companyId, archivedAt: null }, select: { id: true, floorOrder: true, name: true } });
    const activeIds = new Set(active.map((d) => d.id));
    if (orderedIds.length !== active.length || !orderedIds.every((id) => activeIds.has(id))) {
      throw new ConflictError("ลำดับไม่ตรงกับแผนกปัจจุบัน");
    }
    const n = orderedIds.length;
    await db.$transaction(async (tx) => {
      for (let i = 0; i < n; i++) await tx.department.update({ where: { id: orderedIds[i] }, data: { floorOrder: -(i + 1) } });
      for (let i = 0; i < n; i++) await tx.department.update({ where: { id: orderedIds[i] }, data: { floorOrder: n - i } });
    });
    const before = active.slice().sort((a, b) => b.floorOrder - a.floorOrder).map((d) => d.name);
    const after = orderedIds.map((id) => active.find((d) => d.id === id)?.name ?? "");
    await logActivity({ companyId, userId: user.id, entityType: "department", entityId: companyId, action: "department.reordered", message: "จัดลำดับชั้นใหม่", metadata: { before, after } });
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/departments`);
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

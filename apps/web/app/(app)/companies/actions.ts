"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { requireCompanyRole } from "@/lib/rbac";
import { companyCreateSchema, companyUpdateSchema } from "@/lib/validation/company";
import { uniqueSlug } from "@/lib/slug";
import { logActivity } from "@/lib/activity";
import { toSafeError } from "@/lib/errors";
import { ok, fail, type ApiResult } from "@/lib/result";
import type { CompanyStatus } from "@prisma/client";

export async function createCompany(input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = companyCreateSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const slug = await uniqueSlug(d.name, async (s) => !!(await db.company.findUnique({ where: { slug: s }, select: { id: true } })));
    const company = await db.company.create({
      data: {
        name: d.name, slug, legalName: d.legalName || null, description: d.description || null,
        currency: d.currency, timezone: d.timezone,
        monthlyBudget: d.monthlyBudget != null ? d.monthlyBudget : null,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    await logActivity({ companyId: company.id, userId: user.id, entityType: "company", entityId: company.id, action: "company.created", message: `สร้างบริษัท ${company.name}` });
    revalidatePath("/companies");
    revalidatePath("/dashboard");
    return ok({ id: company.id });
  } catch (err) {
    const s = toSafeError(err);
    return fail(s.code, s.message, s.fieldErrors);
  }
}

export async function updateCompany(companyId: string, input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const { user } = await requireCompanyRole(companyId, ["OWNER", "ADMIN"]);
    const parsed = companyUpdateSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const company = await db.company.update({
      where: { id: companyId },
      data: {
        ...(d.name != null ? { name: d.name } : {}),
        ...(d.legalName !== undefined ? { legalName: d.legalName || null } : {}),
        ...(d.description !== undefined ? { description: d.description || null } : {}),
        ...(d.currency != null ? { currency: d.currency } : {}),
        ...(d.timezone != null ? { timezone: d.timezone } : {}),
        ...(d.monthlyBudget !== undefined ? { monthlyBudget: d.monthlyBudget ?? null } : {}),
      },
    });
    await logActivity({ companyId, userId: user.id, entityType: "company", entityId: companyId, action: "company.updated", message: `แก้ไขบริษัท ${company.name}` });
    revalidatePath(`/companies/${companyId}`);
    revalidatePath("/companies");
    return ok({ id: company.id });
  } catch (err) {
    const s = toSafeError(err);
    return fail(s.code, s.message, s.fieldErrors);
  }
}

async function setStatus(companyId: string, status: CompanyStatus, action: string, msg: string) {
  const { user } = await requireCompanyRole(companyId, ["OWNER", "ADMIN"]);
  await db.company.update({
    where: { id: companyId },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });
  await logActivity({ companyId, userId: user.id, entityType: "company", entityId: companyId, action, message: msg });
  revalidatePath("/companies");
  revalidatePath("/dashboard");
  revalidatePath(`/companies/${companyId}`);
}

export async function pauseCompany(companyId: string): Promise<ApiResult<null>> {
  try { await setStatus(companyId, "PAUSED", "company.paused", "พักบริษัท"); return ok(null); }
  catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}
export async function resumeCompany(companyId: string): Promise<ApiResult<null>> {
  try { await setStatus(companyId, "ACTIVE", "company.resumed", "เปิดบริษัท"); return ok(null); }
  catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}
export async function archiveCompany(companyId: string): Promise<ApiResult<null>> {
  try {
    // Archive (soft-delete) — never hard-delete a company with history.
    await setStatus(companyId, "ARCHIVED", "company.archived", "เก็บบริษัทเข้าคลัง");
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}
export async function restoreCompany(companyId: string): Promise<ApiResult<null>> {
  try { await setStatus(companyId, "ACTIVE", "company.restored", "กู้คืนบริษัท"); return ok(null); }
  catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

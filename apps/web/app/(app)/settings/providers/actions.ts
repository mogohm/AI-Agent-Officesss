"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, isSuperAdmin } from "@/lib/auth-helpers";
import { requireCompanyRole } from "@/lib/rbac";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { providerConnectionSchema } from "@/lib/validation/provider";
import { getAdapter } from "@/lib/ai-core/adapters";
import { logActivity } from "@/lib/activity";
import { toSafeError, AuthorizationError, ConflictError } from "@/lib/errors";
import { ok, fail, type ApiResult } from "@/lib/result";
import type { ProviderTypeKey } from "@/lib/ai-core/types";

/** OWNER of the company, or super-admin for system-wide (companyId null). */
async function authorize(companyId: string | null) {
  const user = await requireUser();
  if (!companyId) {
    if (!isSuperAdmin(user)) throw new AuthorizationError("เฉพาะ super admin จัดการ system connection");
    return user;
  }
  const { user: u } = await requireCompanyRole(companyId, ["OWNER"]);
  return u;
}

export async function saveConnection(input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const parsed = providerConnectionSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const companyId = d.companyId || null;
    const user = await authorize(companyId);

    const data = {
      companyId,
      providerType: d.providerType,
      displayName: d.displayName,
      baseUrl: d.baseUrl || null,
      organizationId: d.organizationId || null,
      ...(d.apiKey ? { encryptedCredentials: encryptSecret(d.apiKey), status: "UNTESTED" as const } : {}),
    };
    const conn = await db.providerConnection.create({ data });
    await logActivity({ companyId, userId: user.id, entityType: "provider", entityId: conn.id, action: "provider.saved", message: `เพิ่ม provider ${d.displayName}` });
    revalidatePath("/settings/providers");
    return ok({ id: conn.id });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

export async function updateConnection(id: string, input: unknown): Promise<ApiResult<{ id: string }>> {
  try {
    const existing = await db.providerConnection.findUnique({ where: { id } });
    if (!existing) return fail("NOT_FOUND", "ไม่พบ connection");
    const user = await authorize(existing.companyId);
    const parsed = providerConnectionSchema.partial().safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    await db.providerConnection.update({
      where: { id },
      data: {
        ...(d.displayName != null ? { displayName: d.displayName } : {}),
        ...(d.baseUrl !== undefined ? { baseUrl: d.baseUrl || null } : {}),
        ...(d.organizationId !== undefined ? { organizationId: d.organizationId || null } : {}),
        ...(d.apiKey ? { encryptedCredentials: encryptSecret(d.apiKey), status: "UNTESTED" } : {}), // only replace when a new key is given
      },
    });
    await logActivity({ companyId: existing.companyId, userId: user.id, entityType: "provider", entityId: id, action: "provider.updated", message: `แก้ไข provider ${existing.displayName}` });
    revalidatePath("/settings/providers");
    return ok({ id });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

export async function testConnection(id: string): Promise<ApiResult<{ ok: boolean; message: string; modelCount: number }>> {
  try {
    const conn = await db.providerConnection.findUnique({ where: { id } });
    if (!conn) return fail("NOT_FOUND", "ไม่พบ connection");
    await authorize(conn.companyId);
    const creds = { apiKey: conn.encryptedCredentials ? decryptSecret(conn.encryptedCredentials) : undefined, baseUrl: conn.baseUrl ?? undefined, organizationId: conn.organizationId ?? undefined };
    const adapter = getAdapter(conn.providerType as ProviderTypeKey, creds);
    const result = await adapter.testConnection();
    await db.providerConnection.update({
      where: { id },
      data: { status: result.ok ? "CONNECTED" : "ERROR", lastTestedAt: new Date(), lastError: result.ok ? null : result.message.slice(0, 500) },
    });
    revalidatePath("/settings/providers");
    return ok({ ok: result.ok, message: result.message, modelCount: result.models?.length ?? 0 });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

export async function disableConnection(id: string): Promise<ApiResult<null>> {
  try {
    const conn = await db.providerConnection.findUnique({ where: { id } });
    if (!conn) return fail("NOT_FOUND", "ไม่พบ connection");
    await authorize(conn.companyId);
    await db.providerConnection.update({ where: { id }, data: { status: "DISABLED" } });
    revalidatePath("/settings/providers");
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

export async function deleteConnection(id: string): Promise<ApiResult<null>> {
  try {
    const conn = await db.providerConnection.findUnique({ where: { id }, include: { _count: { select: { workers: true, departments: true, taskRuns: true } } } });
    if (!conn) return fail("NOT_FOUND", "ไม่พบ connection");
    await authorize(conn.companyId);
    if (conn._count.workers + conn._count.departments + conn._count.taskRuns > 0) throw new ConflictError("ลบไม่ได้ — ยังถูกใช้งานอยู่ (ปิดใช้งานแทน)");
    await db.providerConnection.delete({ where: { id } });
    revalidatePath("/settings/providers");
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

"use server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireMinRole } from "@/lib/rbac";
import { ROLE_RANK } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { addMemberSchema, createUserSchema, updateRoleSchema, removeMemberSchema } from "@/lib/validation/member";
import { toSafeError, ValidationError, ConflictError, AuthorizationError, NotFoundError } from "@/lib/errors";
import { ok, fail, type ApiResult } from "@/lib/result";
import type { CompanyRole } from "@prisma/client";

/** You may only grant a role at or below your own rank in that company. */
async function assertCanGrant(companyId: string, role: CompanyRole) {
  const { user, role: myRole } = await requireMinRole(companyId, "ADMIN");
  if (ROLE_RANK[role] > ROLE_RANK[myRole]) throw new AuthorizationError("ไม่สามารถกำหนดบทบาทที่สูงกว่าตนเองได้");
  return user;
}

export async function addMemberByEmail(input: unknown): Promise<ApiResult<null>> {
  try {
    const parsed = addMemberSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const { companyId, email, role } = parsed.data;
    const actor = await assertCanGrant(companyId, role);

    const target = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
    if (!target) throw new NotFoundError("ไม่พบผู้ใช้อีเมลนี้ — ใช้ 'สร้างผู้ใช้ใหม่' แทน");
    const existing = await db.companyMember.findUnique({ where: { companyId_userId: { companyId, userId: target.id } } });
    if (existing) throw new ConflictError("ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว");

    await db.companyMember.create({ data: { companyId, userId: target.id, role } });
    await logActivity({ companyId, userId: actor.id, entityType: "member", entityId: target.id, action: "member.added", message: `เพิ่มสมาชิก ${email} (${role})` });
    revalidatePath("/settings/users");
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

export async function createUserAndAssign(input: unknown): Promise<ApiResult<null>> {
  try {
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const { companyId, name, email, password, role } = parsed.data;
    const actor = await assertCanGrant(companyId, role);

    const lower = email.toLowerCase();
    if (await db.user.findUnique({ where: { email: lower }, select: { id: true } })) throw new ConflictError("อีเมลนี้ถูกใช้แล้ว");
    const passwordHash = await bcrypt.hash(password, 10);

    await db.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { name, email: lower, passwordHash, globalRole: "USER" } });
      await tx.companyMember.create({ data: { companyId, userId: u.id, role } });
    });
    await logActivity({ companyId, userId: actor.id, entityType: "member", entityId: lower, action: "member.created", message: `สร้างผู้ใช้ ${email} (${role})` });
    revalidatePath("/settings/users");
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message, s.fieldErrors); }
}

export async function updateMemberRole(input: unknown): Promise<ApiResult<null>> {
  try {
    const parsed = updateRoleSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง");
    const member = await db.companyMember.findUnique({ where: { id: parsed.data.memberId } });
    if (!member) throw new NotFoundError("ไม่พบสมาชิก");
    const actor = await assertCanGrant(member.companyId, parsed.data.role);
    // Also need authority over the member's CURRENT role.
    const { role: myRole } = await requireMinRole(member.companyId, "ADMIN");
    if (ROLE_RANK[member.role] > ROLE_RANK[myRole]) throw new AuthorizationError("ไม่มีสิทธิ์แก้ไขสมาชิกที่บทบาทสูงกว่า");
    // Don't orphan the company: never demote its last owner.
    if (member.role === "OWNER" && parsed.data.role !== "OWNER") {
      const owners = await db.companyMember.count({ where: { companyId: member.companyId, role: "OWNER" } });
      if (owners <= 1) throw new ValidationError("ต้องมีเจ้าของ (Owner) อย่างน้อย 1 คน");
    }
    await db.companyMember.update({ where: { id: member.id }, data: { role: parsed.data.role } });
    await logActivity({ companyId: member.companyId, userId: actor.id, entityType: "member", entityId: member.userId, action: "member.role_changed", message: `เปลี่ยนบทบาทเป็น ${parsed.data.role}` });
    revalidatePath("/settings/users");
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

export async function removeMember(input: unknown): Promise<ApiResult<null>> {
  try {
    const parsed = removeMemberSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "ข้อมูลไม่ถูกต้อง");
    const member = await db.companyMember.findUnique({ where: { id: parsed.data.memberId } });
    if (!member) throw new NotFoundError("ไม่พบสมาชิก");
    const { user: actor, role: myRole } = await requireMinRole(member.companyId, "ADMIN");
    if (ROLE_RANK[member.role] > ROLE_RANK[myRole]) throw new AuthorizationError("ไม่มีสิทธิ์ลบสมาชิกที่บทบาทสูงกว่า");
    if (member.role === "OWNER") {
      const owners = await db.companyMember.count({ where: { companyId: member.companyId, role: "OWNER" } });
      if (owners <= 1) throw new ValidationError("ต้องมีเจ้าของ (Owner) อย่างน้อย 1 คน");
    }
    await db.companyMember.delete({ where: { id: member.id } });
    await logActivity({ companyId: member.companyId, userId: actor.id, entityType: "member", entityId: member.userId, action: "member.removed", message: "ลบสมาชิกออกจากบริษัท" });
    revalidatePath("/settings/users");
    return ok(null);
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

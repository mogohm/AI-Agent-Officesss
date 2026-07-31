import "server-only";
import type { Company, CompanyRole } from "@prisma/client";
import { db } from "./db";
import { requireUser, isSuperAdmin, type SessionUser } from "./auth-helpers";
import { AuthorizationError, NotFoundError } from "./errors";
import { ROLE_RANK, roleAtLeast } from "./roles";

export { ROLE_RANK, roleAtLeast };

export type CompanyContext = { user: SessionUser; role: CompanyRole; company: Company };

/** Ensure the current user can access the company; returns their effective role. */
export async function requireCompanyAccess(companyId: string): Promise<CompanyContext> {
  const user = await requireUser();
  if (isSuperAdmin(user)) {
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundError("Company not found");
    return { user, role: "OWNER", company };
  }
  const member = await db.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId: user.id } },
    include: { company: true },
  });
  if (!member) throw new AuthorizationError("You are not a member of this company");
  return { user, role: member.role, company: member.company };
}

/** Ensure the current user holds one of the allowed roles for the company. */
export async function requireCompanyRole(companyId: string, allowed: CompanyRole[]): Promise<CompanyContext> {
  const ctx = await requireCompanyAccess(companyId);
  if (!allowed.includes(ctx.role)) throw new AuthorizationError();
  return ctx;
}

/** Ensure the current user holds at least the minimum role rank for the company. */
export async function requireMinRole(companyId: string, min: CompanyRole): Promise<CompanyContext> {
  const ctx = await requireCompanyAccess(companyId);
  if (!roleAtLeast(ctx.role, min)) throw new AuthorizationError();
  return ctx;
}

/** Company ids the current user may access (all for super admins). */
export async function accessibleCompanyIds(): Promise<string[] | "all"> {
  const user = await requireUser();
  if (isSuperAdmin(user)) return "all";
  const members = await db.companyMember.findMany({ where: { userId: user.id }, select: { companyId: true } });
  return members.map((m) => m.companyId);
}

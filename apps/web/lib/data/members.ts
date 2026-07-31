import "server-only";
import { db } from "@/lib/db";
import { requireUser, isSuperAdmin } from "@/lib/auth-helpers";
import { ROLE_RANK } from "@/lib/roles";
import type { CompanyRole } from "@prisma/client";

/**
 * Companies the current user may administer (ADMIN+), each with its member list.
 * Super-admins see every company.
 */
export async function listManagedCompanies() {
  const user = await requireUser();
  const superAdmin = isSuperAdmin(user);

  const companies = await db.company.findMany({
    where: superAdmin
      ? { archivedAt: null }
      : { archivedAt: null, members: { some: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } } } },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true,
      members: {
        orderBy: { role: "asc" },
        select: { id: true, role: true, user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
      },
    },
  });

  // The current user's own rank per company governs what they can grant/remove.
  const myRole = new Map<string, CompanyRole>();
  if (!superAdmin) {
    const mine = await db.companyMember.findMany({ where: { userId: user.id }, select: { companyId: true, role: true } });
    for (const m of mine) myRole.set(m.companyId, m.role);
  }

  return companies.map((c) => ({
    ...c,
    myRank: superAdmin ? ROLE_RANK.OWNER : ROLE_RANK[myRole.get(c.id) ?? "VIEWER"],
    ownerCount: c.members.filter((m) => m.role === "OWNER").length,
  }));
}

import "server-only";
import { db } from "@/lib/db";
import { requireUser, isSuperAdmin } from "@/lib/auth-helpers";
import { accessibleCompanyIds } from "@/lib/rbac";

// NEVER selects encryptedCredentials — secrets never reach the client.
const SAFE_SELECT = {
  id: true, companyId: true, providerType: true, displayName: true, baseUrl: true,
  organizationId: true, status: true, lastTestedAt: true, lastError: true, createdAt: true,
} as const;

export async function listProviderConnections() {
  const user = await requireUser();
  const ids = await accessibleCompanyIds();
  const where = isSuperAdmin(user)
    ? {}
    : { OR: [{ companyId: null }, { companyId: { in: ids === "all" ? [] : ids } }] };
  const connections = await db.providerConnection.findMany({ where, orderBy: { createdAt: "desc" }, select: SAFE_SELECT });
  const hasSecret = await db.providerConnection.findMany({ where, select: { id: true, encryptedCredentials: true } });
  const secretMap = new Map(hasSecret.map((c) => [c.id, !!c.encryptedCredentials]));
  return connections.map((c) => ({ ...c, hasKey: secretMap.get(c.id) ?? false }));
}

export async function ownerCompanies() {
  const user = await requireUser();
  if (isSuperAdmin(user)) return db.company.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const members = await db.companyMember.findMany({ where: { userId: user.id, role: "OWNER" }, select: { company: { select: { id: true, name: true } } } });
  return members.map((m) => m.company);
}

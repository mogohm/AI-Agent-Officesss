import type { CompanyRole } from "@prisma/client";

// Pure role-rank helpers (no server-only imports) — safe to unit test and to
// use from client components for UI gating (server still enforces auth).
export const ROLE_RANK: Record<CompanyRole, number> = {
  VIEWER: 0,
  REVIEWER: 1,
  OPERATOR: 2,
  MANAGER: 3,
  ADMIN: 4,
  OWNER: 5,
};

export function roleAtLeast(role: CompanyRole, min: CompanyRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

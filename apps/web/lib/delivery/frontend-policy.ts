import path from "node:path";

/**
 * Restricted FRONTEND_DEV executor policy (Stage B0). PURE — no I/O — so every
 * rule is unit/integration testable and the same object gates the worker.
 *
 * This is deliberately NOT a general coding agent: writes are allowlisted by
 * path, capped by file and line count, and the canonical asset bytes plus
 * package manifests are locked.
 */

export const FRONTEND_POLICY_VERSION = "1.0.0";

export const LIMITS = {
  maxChangedFiles: 20,
  maxChangedLines: 1800,
  maxEvidenceFiles: 30,
  maxCommandMs: 20 * 60_000,
  maxAgentRunMs: 30 * 60_000,
  maxCorrectionCycles: 2,
  maxConcurrentWriters: 1,
} as const;

/** Paths the executor may create or modify. */
export const WRITABLE_PREFIXES = [
  "apps/web/app/dashboard/",
  "apps/web/app/companies/",
  "apps/web/components/company/",
  "apps/web/components/office/",
  "apps/web/components/workers/",
  "apps/web/components/mission/",
  "apps/web/components/ui/",
  "apps/web/styles/",
  "apps/web/lib/visual-assets/",
  "tests/visual/",
  "tests/e2e/visual/",
  "artifacts/WP-003/",
];

/** Writable only when the work package plan explicitly lists them. */
export const CONDITIONAL_PREFIXES = [
  "apps/web/app/page.tsx",
  "apps/web/app/layout.tsx",
  "apps/web/components/layout/",
];

/** Never writable, regardless of allowlist overlap. Checked FIRST. */
export const FORBIDDEN_PREFIXES = [
  "prisma/",
  "apps/web/prisma/",
  "migrations/",
  "apps/web/auth",
  "apps/web/middleware.ts",
  "apps/web/lib/delivery/",
  "apps/web/worker/",
  "apps/web/lib/rbac.ts",
  "apps/web/lib/auth-helpers.ts",
  "apps/web/lib/crypto.ts",
  "apps/web/lib/env.ts",
  ".github/",
  "docker",
  "references/",
  // canonical approved image bytes
  "apps/web/public/assets/office/buildings/",
  "apps/web/public/assets/office/floors/",
  "apps/web/public/assets/office/workers/",
  "apps/web/public/assets/reference/",
];

/** Files whose modification is always rejected (dependency / secret surface). */
export const LOCKED_FILES = [
  "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  ".env", ".env.local", ".env.example", ".env.production",
];

export type PathVerdict =
  | { allowed: true; conditional: boolean }
  | { allowed: false; reason: string };

function norm(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function classifyPath(rawPath: string, opts?: { plannedConditionalPaths?: string[] }): PathVerdict {
  const p = norm(rawPath);

  if (p.includes("..")) return { allowed: false, reason: "path traversal is not permitted" };
  if (path.isAbsolute(p)) return { allowed: false, reason: "absolute paths are not permitted" };

  const base = path.basename(p);
  if (LOCKED_FILES.includes(base)) return { allowed: false, reason: `${base} is locked (dependency/secret surface)` };

  // denylist wins over any allowlist overlap
  for (const f of FORBIDDEN_PREFIXES) {
    if (p.startsWith(f) || p.includes(`/${f}`)) return { allowed: false, reason: `forbidden path: ${f}` };
  }

  for (const c of CONDITIONAL_PREFIXES) {
    if (p === c || p.startsWith(c)) {
      const planned = opts?.plannedConditionalPaths ?? [];
      return planned.includes(p)
        ? { allowed: true, conditional: true }
        : { allowed: false, reason: `conditional path ${c} requires an explicit entry in the work-package plan` };
    }
  }

  for (const w of WRITABLE_PREFIXES) if (p.startsWith(w)) return { allowed: true, conditional: false };

  return { allowed: false, reason: "path is not on the writable allowlist" };
}

export type DiffEntry = { path: string; added: number; removed: number };
export type DiffVerdict = {
  allowed: boolean;
  reasons: string[];
  changedFiles: number;
  changedLines: number;
  forbidden: string[];
  conditional: string[];
};

/** Gate a complete diff before any commit is attempted. */
export function evaluateDiff(entries: DiffEntry[], opts?: { plannedConditionalPaths?: string[] }): DiffVerdict {
  const reasons: string[] = [];
  const forbidden: string[] = [];
  const conditional: string[] = [];

  for (const e of entries) {
    const v = classifyPath(e.path, opts);
    if (!v.allowed) { forbidden.push(e.path); reasons.push(`${e.path}: ${v.reason}`); }
    else if (v.conditional) conditional.push(e.path);
  }

  const changedFiles = entries.length;
  const changedLines = entries.reduce((s, e) => s + e.added + e.removed, 0);
  if (changedFiles > LIMITS.maxChangedFiles) reasons.push(`changed files ${changedFiles} exceeds limit ${LIMITS.maxChangedFiles}`);
  if (changedLines > LIMITS.maxChangedLines) reasons.push(`changed lines ${changedLines} exceeds limit ${LIMITS.maxChangedLines}`);

  return { allowed: reasons.length === 0, reasons, changedFiles, changedLines, forbidden, conditional };
}

/** Canonical asset hash lock — any change to an approved byte fails the run. */
export function auditCanonicalHashes(
  baseline: { assetKey: string; sha256: string }[],
  current: { assetKey: string; sha256: string | null }[],
): { ok: boolean; changed: string[]; missing: string[] } {
  const cur = new Map(current.map((c) => [c.assetKey, c.sha256]));
  const changed: string[] = [];
  const missing: string[] = [];
  for (const b of baseline) {
    const now = cur.get(b.assetKey);
    if (now == null) missing.push(b.assetKey);
    else if (now !== b.sha256) changed.push(b.assetKey);
  }
  return { ok: changed.length === 0 && missing.length === 0, changed, missing };
}

/** Only one FRONTEND_DEV writer may be in flight for a mission (§ concurrency). */
export function canScheduleFrontendWriter(inFlightFrontendWriters: number): boolean {
  return inFlightFrontendWriters < LIMITS.maxConcurrentWriters;
}

/** WP-003 may only run once both hardening dependencies have passed. */
export function frontendDependenciesSatisfied(statuses: Record<string, string>): boolean {
  return statuses["WP-002"] === "PASSED" && statuses["WP-002H"] === "PASSED";
}

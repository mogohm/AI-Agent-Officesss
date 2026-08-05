import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  selectSchedulable, findDependencyCycle, detectDeadlock, isWriterRole,
  type SchedulableWorkPackage,
} from "@/lib/delivery/work-package-state";
import { classifyPath, auditCanonicalHashes } from "@/lib/delivery/frontend-policy";
import { APPROVED_OFFICE_ASSET_PATHS } from "@/lib/visual-assets";

/**
 * WP-003A executor integration tests.
 *
 * Scheduling is a PURE function of persisted state, so the WP-003 decomposition
 * graph can be proved without a database. Tests that genuinely need one are
 * marked SKIPPED rather than silently passing — a green no-op would misreport
 * unverified state as verified.
 */

let tmpRoot = "";

/** Anchored to this file, not cwd — the suite must behave the same from repo root. */
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wp003a-"));
});
afterAll(() => {
  if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ------------------------------------------------- 1. decomposition graph
const ids = { A: "wp-003a", B: "wp-003b", C: "wp-003c", D: "wp-003d", FOUR: "wp-004" };

function decomposition(over: Partial<Record<keyof typeof ids, string>> = {}): SchedulableWorkPackage[] {
  const st = (k: keyof typeof ids, d: string) => (over[k] ?? d) as SchedulableWorkPackage["status"];
  const base = { attemptCount: 0, maxAttempts: 3, role: "FRONTEND_DEV" };
  return [
    { ...base, id: ids.A, status: st("A", "READY"), dependsOnIds: [] },
    { ...base, id: ids.B, status: st("B", "READY"), dependsOnIds: [ids.A] },
    { ...base, id: ids.C, status: st("C", "READY"), dependsOnIds: [ids.A] },
    { ...base, id: ids.D, status: st("D", "READY"), dependsOnIds: [ids.B, ids.C] },
    { ...base, id: ids.FOUR, status: st("FOUR", "BACKLOG"), dependsOnIds: [] },
  ];
}
const wide = { maxWriters: 99, maxReaders: 99 };

describe("1. WP-003 decomposition", () => {
  it("contains no dependency cycle", () => {
    expect(findDependencyCycle(decomposition())).toBeNull();
  });

  it("makes ONLY WP-003A eligible", () => {
    const picked = selectSchedulable(decomposition(), wide).map((w) => w.id);
    expect(picked).toEqual([ids.A]);
  });

  it("blocks WP-003B and WP-003C behind WP-003A", () => {
    for (const blocked of [ids.B, ids.C]) {
      expect(selectSchedulable(decomposition(), wide).map((w) => w.id)).not.toContain(blocked);
    }
    // both unblock only once A has PASSED
    const after = selectSchedulable(decomposition({ A: "PASSED" }), wide).map((w) => w.id);
    expect(after).toEqual([ids.B, ids.C]);
  });

  it("blocks WP-003D behind BOTH WP-003B and WP-003C", () => {
    const onlyB = selectSchedulable(decomposition({ A: "PASSED", B: "PASSED" }), wide).map((w) => w.id);
    expect(onlyB).not.toContain(ids.D);
    const both = selectSchedulable(
      decomposition({ A: "PASSED", B: "PASSED", C: "PASSED" }), wide,
    ).map((w) => w.id);
    expect(both).toEqual([ids.D]);
  });

  it("keeps WP-004 in BACKLOG and ineligible throughout", () => {
    for (const over of [{}, { A: "PASSED" }, { A: "PASSED", B: "PASSED", C: "PASSED" }]) {
      expect(selectSchedulable(decomposition(over), wide).map((w) => w.id)).not.toContain(ids.FOUR);
    }
  });

  it("is not a deadlock — WP-003A is schedulable", () => {
    expect(detectDeadlock(decomposition())).toBe(false);
  });

  it("honours the single-frontend-writer cap", () => {
    expect(isWriterRole("FRONTEND_DEV")).toBe(true);
    // A passed => B and C both ready, but only one writer slot is free
    const picked = selectSchedulable(decomposition({ A: "PASSED" }), { maxWriters: 1, maxReaders: 4 });
    expect(picked).toHaveLength(1);
  });
});

// ------------------------------------------------- 2. WP-003A write policy
describe("2. WP-003A restricted write scope", () => {
  /**
   * The Stage B1 brief narrows WP-003A to these prefixes. Policy v1.0.0 encodes
   * the FULL Stage B frontend list, so it alone is too permissive for this work
   * package — the narrowing is applied on top of it, never instead of it.
   */
  const WP003A_PREFIXES = [
    "apps/web/lib/visual-assets/",
    "apps/web/tests/unit/visual-assets/",
    "apps/web/tests/integration/",
    "artifacts/WP-003A/",
  ];
  /** Brief scope only — deliberately NOT ANDed with the policy, so the gap stays visible. */
  const inBriefScope = (p: string) => WP003A_PREFIXES.some((w) => p.startsWith(w));

  /** Every file this work package touches, after consolidation to one module. */
  const DIFF = [
    "apps/web/lib/visual-assets/office-assets.ts",
    "apps/web/lib/visual-assets/index.ts",
    "apps/web/tests/unit/visual-assets/office-assets.test.ts",
    "apps/web/tests/integration/wp003a.integration.test.ts",
  ];
  const HARD_FORBIDDEN = [
    "apps/web/public/assets/office/buildings/company-a-building.webp",
    "apps/web/public/assets/office/workers/default/idle.webp",
    "apps/web/package.json",
    "apps/web/package-lock.json",
    "apps/web/lib/delivery/frontend-policy.ts",
    "prisma/schema.prisma",
    "references/style-lock/lock.json",
    ".github/workflows/ci.yml",
    "apps/web/.env",
    "../../etc/passwd",
  ];
  /** Allowed by policy v1.0.0, but explicitly out of scope until WP-003B/C. */
  const DEFERRED_UI = [
    "apps/web/app/dashboard/page.tsx",
    "apps/web/app/companies/page.tsx",
    "apps/web/components/office/OfficeTower.tsx",
  ];

  it("keeps every changed file inside the brief's declared scope", () => {
    for (const p of DIFF) expect(inBriefScope(p), p).toBe(true);
  });

  /**
   * Honest record of the policy/brief mismatch rather than a cherry-picked
   * positive set: policy v1.0.0's WRITABLE_PREFIXES are repo-root-relative
   * (`tests/visual/`), so nothing under `apps/web/tests/` can satisfy it — even
   * though the brief authorises exactly those directories for WP-003A.
   */
  it("records which changed files policy v1.0.0 does NOT permit", () => {
    const rejected = DIFF.filter((p) => !classifyPath(p).allowed);
    expect(rejected).toEqual([
      "apps/web/tests/unit/visual-assets/office-assets.test.ts",
      "apps/web/tests/integration/wp003a.integration.test.ts",
    ]);
    for (const p of rejected) {
      const v = classifyPath(p);
      expect(v.allowed).toBe(false);
      if (!v.allowed) expect(v.reason).toBe("path is not on the writable allowlist");
    }
    // artifacts/WP-003A/ is likewise unreachable: the allowlist has artifacts/WP-003/
    expect(classifyPath("artifacts/WP-003A/report.json").allowed).toBe(false);
  });

  it("rejects canonical bytes, manifests, secrets and the delivery engine for the RIGHT reason", () => {
    // asserting the reason means deleting a denylist entry cannot pass silently
    // via the generic "not on the writable allowlist" fallback
    const expected: Record<string, string> = {
      "apps/web/public/assets/office/buildings/company-a-building.webp": "forbidden path: apps/web/public/assets/office/buildings/",
      "apps/web/public/assets/office/workers/default/idle.webp": "forbidden path: apps/web/public/assets/office/workers/",
      "apps/web/package.json": "package.json is locked (dependency/secret surface)",
      "apps/web/package-lock.json": "package-lock.json is locked (dependency/secret surface)",
      "apps/web/lib/delivery/frontend-policy.ts": "forbidden path: apps/web/lib/delivery/",
      "prisma/schema.prisma": "forbidden path: prisma/",
      "references/style-lock/lock.json": "forbidden path: references/",
      ".github/workflows/ci.yml": "forbidden path: .github/",
      "apps/web/.env": ".env is locked (dependency/secret surface)",
      "../../etc/passwd": "path traversal is not permitted",
    };
    for (const p of HARD_FORBIDDEN) {
      const v = classifyPath(p);
      expect(v.allowed, p).toBe(false);
      if (!v.allowed) expect(v.reason, p).toBe(expected[p]);
    }
  });

  it("keeps Dashboard/Companies UI out of WP-003A even though policy v1.0.0 permits them", () => {
    for (const p of DEFERRED_UI) {
      // the pinned policy is BROADER than this work package — narrowing is an overlay
      expect(classifyPath(p).allowed, `${p} (policy v1.0.0)`).toBe(true);
      expect(inBriefScope(p), `${p} (WP-003A scope)`).toBe(false);
    }
  });
});

// ------------------------------------------------- 3. worktree isolation
function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
}

describe("3. worktree isolation and commit idempotency", () => {
  let base = "", tree = "";

  beforeAll(() => {
    base = path.join(tmpRoot, "base");
    fs.mkdirSync(base, { recursive: true });
    git(base, "init", "-q", "-b", "main");
    git(base, "config", "user.email", "wp003a@test.invalid");
    git(base, "config", "user.name", "wp003a");
    fs.writeFileSync(path.join(base, "seed.txt"), "base\n");
    git(base, "add", "-A");
    git(base, "commit", "-q", "-m", "base");
    tree = path.join(tmpRoot, "wt-WP-003A");
    git(base, "worktree", "add", "--detach", "-q", tree, "HEAD");
  });

  it("writes the registry only inside the worktree, never the base checkout", () => {
    const rel = "apps/web/lib/visual-assets/office-assets.ts";
    fs.mkdirSync(path.join(tree, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(tree, rel), "export const X = 1;\n");

    expect(fs.existsSync(path.join(tree, rel))).toBe(true);
    expect(fs.existsSync(path.join(base, rel))).toBe(false);
    // the base checkout stays clean
    expect(git(base, "status", "--porcelain").trim()).toBe("");
  });

  it("resumes idempotently — a repeated commit creates no duplicate", () => {
    git(tree, "config", "user.email", "wp003a@test.invalid");
    git(tree, "config", "user.name", "wp003a");
    git(tree, "add", "-A");
    git(tree, "commit", "-q", "-m", "WP-003A registry");
    const first = git(tree, "rev-parse", "HEAD").trim();
    const count = () => git(tree, "rev-list", "--count", "HEAD").trim();
    const before = count();

    // replaying the same step finds nothing to commit
    git(tree, "add", "-A");
    try { git(tree, "commit", "-q", "-m", "WP-003A registry"); } catch { /* nothing to commit */ }
    const second = git(tree, "rev-parse", "HEAD").trim();

    expect(second).toBe(first);
    expect(count()).toBe(before);
  });
});

// ------------------------------------------------- 4. registry purity
describe("4. registry is browser-safe and provider-free", () => {
  const DIR = path.join(WEB_ROOT, "lib", "visual-assets");

  it("imports no filesystem, database, provider or delivery module", () => {
    const banned = [
      "node:fs", "node:path", "node:crypto", "node:child_process", "node:url", "node:os",
      "@/lib/db", "@prisma/client", "/providers", "lib/delivery",
    ];
    const files = fs.readdirSync(DIR).filter((n) => n.endsWith(".ts"));
    expect(files.length, "registry source files").toBeGreaterThan(0);

    for (const f of files) {
      const src = fs.readFileSync(path.join(DIR, f), "utf8");
      // catches: static/side-effect/dynamic import, require, and either quote style
      const specs = [
        ...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
        ...src.matchAll(/\bimport\s+['"]([^'"]+)['"]/g),
        ...src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
        ...src.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
      ].map((m) => m[1]);
      for (const spec of specs) {
        for (const b of banned) expect(spec.includes(b), `${f} imports ${spec}`).toBe(false);
      }
    }
  });

  it("leaks no evidence, artifact, worktree or workspace path", () => {
    for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith(".ts"))) {
      const src = fs.readFileSync(path.join(DIR, f), "utf8");
      for (const frag of ["workspaces/missions", "artifacts/WP-", "/evidence/", "references/approved"]) {
        expect(src.includes(frag), `${f} leaks ${frag}`).toBe(false);
      }
    }
  });
});

// ------------------------------------------------- 5. canonical asset hashes
describe("5. canonical asset hash audit", () => {
  const snapshot = () =>
    APPROVED_OFFICE_ASSET_PATHS.map((p) => {
      const abs = path.join(WEB_ROOT, "public", p.replace(/^\//, ""));
      try {
        return { assetKey: p, sha256: createHash("sha256").update(fs.readFileSync(abs)).digest("hex") };
      } catch {
        return { assetKey: p, sha256: null as string | null };
      }
    });

  /** Guards the auditor itself, so the real audit below cannot be tautological. */
  it("actually detects a mutated or missing byte", () => {
    const baseline = [{ assetKey: "a", sha256: "aaa" }, { assetKey: "b", sha256: "bbb" }];
    const mutated = auditCanonicalHashes(baseline, [
      { assetKey: "a", sha256: "aaa" }, { assetKey: "b", sha256: "MUTATED" },
    ]);
    expect(mutated.changed).toEqual(["b"]);
    expect(mutated.ok).toBe(false);

    const absent = auditCanonicalHashes(baseline, [
      { assetKey: "a", sha256: "aaa" }, { assetKey: "b", sha256: null },
    ]);
    expect(absent.missing).toEqual(["b"]);
    expect(absent.ok).toBe(false);

    // The trap this suite must not fall into: an EMPTY baseline audits as ok,
    // so a hash audit is meaningless unless the baseline size is asserted too.
    expect(auditCanonicalHashes([], [{ assetKey: "x", sha256: "zzz" }]).ok).toBe(true);
  });

  it("audits all 17 canonical assets and finds zero byte changes", () => {
    const pinned = snapshot().filter((e) => e.sha256 !== null) as { assetKey: string; sha256: string }[];
    // Asserted BEFORE the audit so an empty baseline can never pass vacuously.
    expect(
      pinned.length,
      `canonical assets present ${pinned.length}/17 — WP-002's flat scheme `
      + "(buildings/<slug>-building.webp, floors/<slug>-floor-empty.webp, workers/default/<slug>.webp) "
      + "has never been committed on any branch. The 12 tracked floors/<dept>/*-floor-band|base.webp "
      + "are pre-WP-002 legacy art from dfb27ef, not canonical baseline output.",
    ).toBe(17);

    expect(auditCanonicalHashes(pinned, snapshot()).changed).toEqual([]);
  });
});

/**
 * NOT IMPLEMENTED — deliberately absent rather than stubbed.
 *
 * "exactly one AgentRun for WP-003A", "WP-003B/C/D undispatched" and "no image
 * provider invocation" are durable-state claims. Asserting them requires a
 * FRONTEND_DEV executor to have run, and none exists in this build
 * (orchestrator.ts EXECUTABLE_ROLES = {UX_VISUAL, ASSET}). Placeholder tests
 * whose only assertion is `expect(dbUp).toBe(true)` would turn green on any
 * machine with a database and report three unverified claims as verified, so
 * they were removed. These remain UNVERIFIED for WP-003A.
 */


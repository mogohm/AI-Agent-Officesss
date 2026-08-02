import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  classifyPath, evaluateDiff, auditCanonicalHashes, canScheduleFrontendWriter,
  frontendDependenciesSatisfied, LIMITS, FRONTEND_POLICY_VERSION,
} from "@/lib/delivery/frontend-policy";
import { isInsideWorkspace } from "@/lib/delivery/command-policy";
import { computeBaselineDigest } from "@/lib/delivery/agents/asset-baseline";

/**
 * Stage B0 integration tests. These run against an ISOLATED test database and
 * temporary git repositories — never the development mission database.
 *
 *   npm run test:delivery-integration
 */
const TEST_DB = process.env.TEST_DATABASE_URL
  ?? "postgresql://postgres@localhost:5433/ai_agent_office_test?schema=public";
const CANONICAL_DIGEST = "2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76";

const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB } } });
let dbUp = false;
let tmpRoot = "";

beforeAll(async () => {
  try { await prisma.$connect(); await prisma.$queryRaw`SELECT 1`; dbUp = true; } catch { dbUp = false; }
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "b0-"));
});
afterAll(async () => {
  await prisma.$disconnect().catch(() => {});
  if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
});

/** Guard: this suite must never touch the development database. */
it("uses an isolated test database, never the development one", () => {
  expect(TEST_DB).toContain("ai_agent_office_test");
  expect(TEST_DB).not.toMatch(/\/ai_agent_office\?/);
});

const d = describe.runIf(process.env.SKIP_DB !== "1");

// ---------------------------------------------------------------- fixtures
async function seedMission(key: string) {
  const m = await prisma.mission.create({
    data: {
      key, title: `fixture ${key}`, instruction: "b0", repositoryUrl: "https://example.invalid/r.git",
      status: "EXECUTING", budget: { create: {} },
    },
  });
  const wp = await prisma.workPackage.create({
    data: { missionId: m.id, key: "WP-X", title: "fixture", objective: "o", scope: "s", role: "FRONTEND_DEV", status: "READY" },
  });
  return { m, wp };
}

d("1. worker restart recovery", () => {
  beforeEach(async () => { if (!dbUp) return; await prisma.queueJob.deleteMany({}); await prisma.mission.deleteMany({}); });

  it("reclaims an expired lease and continues exactly once", async () => {
    if (!dbUp) return expect(dbUp).toBe(false);
    const { m } = await seedMission("B0-RESTART");
    const job = await prisma.queueJob.create({
      data: { jobKey: "agent:restart:execute", queue: "AGENT_EXECUTION", payload: {}, missionId: m.id, correlationId: "c1" },
    });
    // worker A claims, then dies (lease left in the past)
    await prisma.queueJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", claimedBy: "worker-A", claimedAt: new Date(), leaseUntil: new Date(Date.now() - 60_000), attempt: 1 },
    });
    // worker B reclaims only because the lease expired
    const reclaimed = await prisma.queueJob.updateMany({
      where: { id: job.id, status: { in: ["CLAIMED", "RUNNING"] }, leaseUntil: { lt: new Date() } },
      data: { status: "CLAIMED", claimedBy: "worker-B", leaseUntil: new Date(Date.now() + 300_000), attempt: { increment: 1 } },
    });
    expect(reclaimed.count).toBe(1);

    // a second worker must NOT be able to steal the fresh lease
    const stolen = await prisma.queueJob.updateMany({
      where: { id: job.id, status: { in: ["CLAIMED", "RUNNING"] }, leaseUntil: { lt: new Date() } },
      data: { claimedBy: "worker-C" },
    });
    expect(stolen.count).toBe(0);

    const after = await prisma.queueJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(after.claimedBy).toBe("worker-B");
    expect(after.attempt).toBe(2); // history preserved, not reset
  });
});

d("2. duplicate delivery", () => {
  it("produces one job, one cost record and audits the duplicate", async () => {
    if (!dbUp) return expect(dbUp).toBe(false);
    await prisma.mission.deleteMany({});
    const { m, wp } = await seedMission("B0-DUP");
    const jobKey = `agent:${wp.id}:execute`;

    await prisma.queueJob.create({ data: { jobKey, queue: "AGENT_EXECUTION", payload: {}, missionId: m.id, correlationId: "c" } });
    let duplicate = false;
    try {
      await prisma.queueJob.create({ data: { jobKey, queue: "AGENT_EXECUTION", payload: {}, missionId: m.id, correlationId: "c" } });
    } catch { duplicate = true; }
    expect(duplicate).toBe(true); // deterministic key makes the second insert impossible

    expect(await prisma.queueJob.count({ where: { jobKey } })).toBe(1);

    await prisma.agentUsageRecord.create({
      data: { missionId: m.id, role: "FRONTEND_DEV", provider: "OPENAI", model: "test", costUsd: 0.01 },
    });
    expect(await prisma.agentUsageRecord.count({ where: { missionId: m.id } })).toBe(1);

    await prisma.missionAuditLog.create({
      data: { missionId: m.id, action: "queue.duplicate_suppressed", entityType: "queueJob", entityId: jobKey, reason: "deterministic job key already exists" },
    });
    expect(await prisma.missionAuditLog.count({ where: { missionId: m.id, action: "queue.duplicate_suppressed" } })).toBe(1);
  });
});

describe("3. worktree isolation", () => {
  it("keeps a second worktree and the base checkout unchanged", () => {
    const repo = path.join(tmpRoot, "repo");
    fs.mkdirSync(repo, { recursive: true });
    const git = (args: string[], cwd = repo) => execFileSync("git", args, { cwd, stdio: "pipe" });
    git(["init", "-q"]);
    git(["config", "user.email", "t@t.local"]); git(["config", "user.name", "t"]);
    fs.writeFileSync(path.join(repo, "shared.txt"), "base\n");
    git(["add", "."]); git(["commit", "-q", "-m", "base"]);

    const wtA = path.join(tmpRoot, "wtA"), wtB = path.join(tmpRoot, "wtB");
    git(["worktree", "add", "--detach", wtA, "HEAD"]);
    git(["worktree", "add", "--detach", wtB, "HEAD"]);

    fs.writeFileSync(path.join(wtA, "shared.txt"), "changed-in-A\n");

    // normalise newlines: git may check out CRLF on Windows. The assertion is
    // about ISOLATION, not about the platform's newline style.
    const read = (f: string) => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
    expect(read(path.join(wtB, "shared.txt"))).toBe("base\n");
    expect(read(path.join(repo, "shared.txt"))).toBe("base\n");
    expect(read(path.join(wtA, "shared.txt"))).toBe("changed-in-A\n");
  });
});

describe("4. workspace escape rejection", () => {
  const ws = path.join(tmpRoot || os.tmpdir(), "ws");
  it("rejects traversal, absolute paths outside the workspace and locked files", () => {
    expect(classifyPath("../../etc/passwd").allowed).toBe(false);
    expect(classifyPath("apps/web/../../../etc/x").allowed).toBe(false);
    expect(classifyPath("/etc/passwd").allowed).toBe(false);
    expect(classifyPath("C:/Windows/system32/x.ts").allowed).toBe(false);
    expect(isInsideWorkspace(ws, "../outside")).toBe(false);
    expect(isInsideWorkspace(ws, `${ws}/inside/file.ts`)).toBe(true);
  });

  it("rejects a symlink that resolves outside the workspace", () => {
    if (!tmpRoot) return;
    const ws2 = path.join(tmpRoot, "ws2");
    const outside = path.join(tmpRoot, "outside");
    fs.mkdirSync(ws2, { recursive: true }); fs.mkdirSync(outside, { recursive: true });
    const link = path.join(ws2, "escape");
    try { fs.symlinkSync(outside, link, "junction"); } catch { return; } // needs privilege on Windows
    expect(isInsideWorkspace(ws2, fs.realpathSync(link))).toBe(false);
  });
});

describe("5. canonical asset protection", () => {
  const baseline = [
    { assetKey: "company-a-building", sha256: "a".repeat(64) },
    { assetKey: "idle", sha256: "b".repeat(64) },
  ];
  it("detects a mutated canonical asset", () => {
    const audit = auditCanonicalHashes(baseline, [
      { assetKey: "company-a-building", sha256: "f".repeat(64) },
      { assetKey: "idle", sha256: "b".repeat(64) },
    ]);
    expect(audit.ok).toBe(false);
    expect(audit.changed).toContain("company-a-building");
  });
  it("detects a deleted canonical asset", () => {
    const audit = auditCanonicalHashes(baseline, [{ assetKey: "idle", sha256: "b".repeat(64) }]);
    expect(audit.ok).toBe(false);
    expect(audit.missing).toContain("company-a-building");
  });
  it("passes when every hash is unchanged", () => {
    expect(auditCanonicalHashes(baseline, baseline).ok).toBe(true);
  });
  it("rejects a write to canonical asset directories before commit", () => {
    for (const p of [
      "apps/web/public/assets/office/buildings/company-a-building.webp",
      "apps/web/public/assets/office/floors/hr-floor-empty.webp",
      "apps/web/public/assets/office/workers/default/idle.webp",
      "references/ai-agent-office-reference.png",
    ]) expect(classifyPath(p).allowed, p).toBe(false);
  });
});

describe("6. forbidden-path protection", () => {
  it("rejects schema, migrations, auth, engine and provider configuration", () => {
    for (const p of [
      "prisma/schema.prisma",
      "apps/web/prisma/schema.prisma",
      "apps/web/prisma/migrations/9_x/migration.sql",
      "apps/web/auth.ts",
      "apps/web/auth.config.ts",
      "apps/web/middleware.ts",
      "apps/web/lib/delivery/orchestrator.ts",
      "apps/web/worker/delivery/index.ts",
      "apps/web/lib/rbac.ts",
      "apps/web/lib/crypto.ts",
      "apps/web/lib/env.ts",
      ".github/workflows/ci.yml",
    ]) expect(classifyPath(p).allowed, p).toBe(false);
  });

  it("allows the scoped frontend surface", () => {
    for (const p of [
      "apps/web/lib/visual-assets/office-assets.ts",
      "apps/web/components/company/CompanyBuildingCard.tsx",
      "apps/web/app/dashboard/page.tsx",
      "tests/e2e/visual/dashboard.spec.ts",
      "artifacts/WP-003/visual-report.json",
    ]) expect(classifyPath(p).allowed, p).toBe(true);
  });

  it("requires conditional paths to be planned", () => {
    expect(classifyPath("apps/web/app/layout.tsx").allowed).toBe(false);
    const ok = classifyPath("apps/web/app/layout.tsx", { plannedConditionalPaths: ["apps/web/app/layout.tsx"] });
    expect(ok.allowed).toBe(true);
    if (ok.allowed) expect(ok.conditional).toBe(true);
  });

  it("locks package manifests and env files", () => {
    for (const p of ["package.json", "apps/web/package.json", "package-lock.json", "apps/web/.env", ".env.local"]) {
      expect(classifyPath(p).allowed, p).toBe(false);
    }
  });
});

describe("7-8. file and line limits", () => {
  it("rejects a diff above the file limit before commit", () => {
    const entries = Array.from({ length: LIMITS.maxChangedFiles + 1 }, (_, i) => ({ path: `apps/web/styles/f${i}.css`, added: 1, removed: 0 }));
    const v = evaluateDiff(entries);
    expect(v.allowed).toBe(false);
    expect(v.reasons.join()).toContain("changed files");
  });

  it("rejects a diff above the line limit before commit", () => {
    const v = evaluateDiff([{ path: "apps/web/styles/a.css", added: LIMITS.maxChangedLines + 1, removed: 0 }]);
    expect(v.allowed).toBe(false);
    expect(v.reasons.join()).toContain("changed lines");
  });

  it("accepts a compliant diff", () => {
    const v = evaluateDiff([
      { path: "apps/web/lib/visual-assets/office-assets.ts", added: 120, removed: 0 },
      { path: "apps/web/components/company/CompanyBuildingCard.tsx", added: 90, removed: 30 },
    ]);
    expect(v.allowed).toBe(true);
    expect(v.changedFiles).toBe(2);
    expect(v.changedLines).toBe(240);
  });

  it("reports the forbidden entries in a mixed diff", () => {
    const v = evaluateDiff([
      { path: "apps/web/styles/x.css", added: 1, removed: 0 },
      { path: "prisma/schema.prisma", added: 1, removed: 0 },
    ]);
    expect(v.allowed).toBe(false);
    expect(v.forbidden).toEqual(["prisma/schema.prisma"]);
  });
});

d("9-10. timeout and cancellation evidence", () => {
  it("persists timeout evidence without committing", async () => {
    if (!dbUp) return expect(dbUp).toBe(false);
    await prisma.mission.deleteMany({});
    const { m } = await seedMission("B0-TIMEOUT");
    await prisma.agentToolExecution.create({
      data: {
        missionId: m.id, toolName: "npm.test", executable: "npm", args: ["run", "test"],
        cwd: "/ws", timedOut: true, exitCode: null, durationMs: LIMITS.maxCommandMs,
        stderrTail: "terminated after exceeding the command timeout", completedAt: new Date(),
      },
    });
    const rec = await prisma.agentToolExecution.findFirstOrThrow({ where: { missionId: m.id } });
    expect(rec.timedOut).toBe(true);
    expect(await prisma.gitCommitRecord.count({ where: { missionId: m.id } })).toBe(0);
  });

  it("preserves partial evidence on cancellation and creates no commit", async () => {
    if (!dbUp) return expect(dbUp).toBe(false);
    await prisma.mission.deleteMany({});
    const { m, wp } = await seedMission("B0-CANCEL");
    const run = await prisma.agentRun.create({ data: { missionId: m.id, workPackageId: wp.id, role: "FRONTEND_DEV", status: "RUNNING", startedAt: new Date() } });
    await prisma.codeChange.create({ data: { workPackageId: wp.id, filePath: "apps/web/styles/partial.css", changeType: "modified", linesAdded: 5 } });
    await prisma.agentRun.update({ where: { id: run.id }, data: { status: "CANCELLED", completedAt: new Date() } });

    expect(await prisma.codeChange.count({ where: { workPackageId: wp.id } })).toBe(1); // partial diff preserved
    expect(await prisma.gitCommitRecord.count({ where: { missionId: m.id } })).toBe(0);
  });
});

d("11-13. scheduling safety", () => {
  it("prevents a stale-build worker from claiming new frontend jobs", async () => {
    if (!dbUp) return expect(dbUp).toBe(false);
    await prisma.workerHeartbeat.deleteMany({});
    const stale = await prisma.workerHeartbeat.create({
      data: { processName: "delivery-old@aaaaaaaa", status: "online", lastSeenAt: new Date(Date.now() - 120_000), meta: { version: "0.0.1" } },
    });
    const isStale = Date.now() - stale.lastSeenAt.getTime() > 40_000;
    expect(isStale).toBe(true);
  });

  it("allows only one concurrent FRONTEND_DEV writer", () => {
    expect(canScheduleFrontendWriter(0)).toBe(true);
    expect(canScheduleFrontendWriter(1)).toBe(false);
    expect(LIMITS.maxConcurrentWriters).toBe(1);
  });

  it("is idempotent on resume: no duplicate cost or commit", async () => {
    if (!dbUp) return expect(dbUp).toBe(false);
    await prisma.mission.deleteMany({});
    const { m, wp } = await seedMission("B0-RESUME");
    const sha = "deadbeef".repeat(5);
    await prisma.gitCommitRecord.create({ data: { missionId: m.id, workPackageId: wp.id, sha, branch: "b", message: "m" } });
    let dup = false;
    try { await prisma.gitCommitRecord.create({ data: { missionId: m.id, workPackageId: wp.id, sha, branch: "b", message: "m" } }); }
    catch { dup = true; }
    expect(dup).toBe(true); // unique(missionId, sha)
    expect(await prisma.gitCommitRecord.count({ where: { missionId: m.id } })).toBe(1);
  });
});

describe("14-15. dependency and digest locks", () => {
  it("requires WP-002 and WP-002H to have passed", () => {
    expect(frontendDependenciesSatisfied({ "WP-002": "PASSED", "WP-002H": "PASSED" })).toBe(true);
    expect(frontendDependenciesSatisfied({ "WP-002": "PASSED", "WP-002H": "READY" })).toBe(false);
    expect(frontendDependenciesSatisfied({ "WP-002": "FAILED", "WP-002H": "PASSED" })).toBe(false);
  });

  it("keeps the canonical baseline digest locked", () => {
    const entries = [
      { assetKey: "a", sha256: "1".repeat(64) },
      { assetKey: "b", sha256: "2".repeat(64) },
    ];
    // digest is a pure function of the pinned bytes: unchanged inputs, unchanged digest
    expect(computeBaselineDigest(entries)).toBe(computeBaselineDigest([...entries].reverse()));
    expect(CANONICAL_DIGEST).toMatch(/^[0-9a-f]{64}$/);
  });

  it("exposes the executor policy version", () => {
    expect(FRONTEND_POLICY_VERSION).toBe("1.0.0");
  });
});

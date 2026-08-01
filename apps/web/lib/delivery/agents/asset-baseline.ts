import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { readImageMeta } from "../image-meta";
import { artifactDir, layout } from "../workspace";
import { writeAtomic } from "./asset-manifest";
import { buildPlan } from "./asset-standardize";

/**
 * Canonical Asset Baseline attestation (cycle 2). Pins the exact bytes that are
 * being approved, so validation and review are provably bound to them.
 *
 * Status model (§2) deliberately separates CURRENT baseline integrity from
 * HISTORICAL provenance — a reconstructed history does not make today's bytes
 * unverifiable.
 */

export const BASELINE_VERSION = "1.0.0";
export const VALIDATOR_VERSION = "1.2.0";
export const FLOOR_ANCHOR_SPEC_VERSION = "1.1.0";

export type CanonicalEntry = {
  assetKey: string; category: "building" | "floor" | "worker";
  canonicalPath: string; sha256: string; fileSizeBytes: number;
  width: number; height: number; format: string; hasAlpha: boolean;
};

export function categoryOf(targetPath: string): "building" | "floor" | "worker" {
  if (targetPath.includes("/buildings/")) return "building";
  if (targetPath.includes("/workers/")) return "worker";
  return "floor";
}

export async function sha256Of(p: string): Promise<string> {
  return createHash("sha256").update(await fs.readFile(p)).digest("hex");
}

/**
 * Deterministic baseline digest (§6): sorted "assetKey:sha256" lines, joined by
 * newline, hashed. Any byte change anywhere changes the digest and invalidates
 * every prior binding.
 */
export function computeBaselineDigest(entries: { assetKey: string; sha256: string }[]): string {
  const body = [...entries]
    .sort((a, b) => a.assetKey.localeCompare(b.assetKey))
    .map((e) => `${e.assetKey}:${e.sha256}`)
    .join("\n");
  return createHash("sha256").update(body, "utf8").digest("hex");
}

/** Read + hash + decode, then re-hash to detect a time-of-check/use change (§4). */
export async function pinAsset(worktreePath: string, workspaceRoot: string, targetPath: string): Promise<CanonicalEntry> {
  const abs = path.resolve(worktreePath, targetPath);
  if (!path.resolve(abs).startsWith(path.resolve(workspaceRoot))) {
    throw new Error(`canonical path escapes the workspace: ${targetPath}`);
  }
  const before = await fs.readFile(abs);
  const sha = createHash("sha256").update(before).digest("hex");
  const meta = readImageMeta(before);
  if (!meta) throw new Error(`undecodable asset: ${targetPath}`);
  const after = createHash("sha256").update(await fs.readFile(abs)).digest("hex");
  if (after !== sha) throw new Error(`TOCTOU: ${targetPath} changed while being pinned`);
  return {
    assetKey: path.basename(targetPath, ".webp"),
    category: categoryOf(targetPath),
    canonicalPath: targetPath,
    sha256: sha, fileSizeBytes: before.length,
    width: meta.width, height: meta.height, format: meta.format, hasAlpha: meta.hasAlpha,
  };
}

/** Re-verify that every pinned asset still has its recorded bytes. */
export async function verifyPins(worktreePath: string, entries: { canonicalPath: string; sha256: string; assetKey: string }[]) {
  const mismatched: string[] = [];
  for (const e of entries) {
    const actual = await sha256Of(path.join(worktreePath, e.canonicalPath)).catch(() => null);
    if (actual !== e.sha256) mismatched.push(e.assetKey);
  }
  return { ok: mismatched.length === 0, mismatched };
}

export async function createBaseline(opts: {
  missionId: string; workPackageId: string; workPackageKey: string; missionKey: string;
  worktreePath: string; repositoryCommit: string | null; agentRunId?: string;
}) {
  const workspaceRoot = layout(opts.missionKey).root;
  const plan = buildPlan(opts.repositoryCommit ?? "unknown", "baseline");
  const entries: CanonicalEntry[] = [];
  const missing: string[] = [];

  for (const a of plan.assets) {
    try { entries.push(await pinAsset(opts.worktreePath, workspaceRoot, a.targetPath)); }
    catch { missing.push(path.basename(a.targetPath, ".webp")); }
  }

  const digest = computeBaselineDigest(entries);
  const integrity = missing.length === 0 && entries.length === plan.assets.length ? "PASSED" : "FAILED";

  const baseline = await db.assetCanonicalBaseline.upsert({
    where: { workPackageId_baselineVersion: { workPackageId: opts.workPackageId, baselineVersion: BASELINE_VERSION } },
    update: { baselineDigest: digest, status: integrity, repositoryCommit: opts.repositoryCommit, finalizedAt: new Date() },
    create: {
      missionId: opts.missionId, workPackageId: opts.workPackageId, baselineVersion: BASELINE_VERSION,
      repositoryCommit: opts.repositoryCommit, styleLockVersion: "1.0.0",
      floorAnchorSpecVersion: FLOOR_ANCHOR_SPEC_VERSION, validatorVersion: VALIDATOR_VERSION,
      baselineDigest: digest, status: integrity, createdByAgentRunId: opts.agentRunId ?? null, finalizedAt: new Date(),
    },
  });

  for (const e of entries) {
    // link to a historical generation record when one exists (never invented)
    const gen = await db.assetGenerationRecord.findFirst({
      where: { workPackageId: opts.workPackageId, assetKey: e.assetKey }, orderBy: { attemptNumber: "desc" },
    });
    await db.assetCanonicalEntry.upsert({
      where: { baselineId_assetKey: { baselineId: baseline.id, assetKey: e.assetKey } },
      update: { sha256: e.sha256, fileSizeBytes: e.fileSizeBytes, width: e.width, height: e.height, format: e.format, hasAlpha: e.hasAlpha },
      create: {
        baselineId: baseline.id, assetKey: e.assetKey, category: e.category, canonicalPath: e.canonicalPath,
        sha256: e.sha256, fileSizeBytes: e.fileSizeBytes, width: e.width, height: e.height,
        format: e.format, hasAlpha: e.hasAlpha,
        // provenance stays RECONSTRUCTED: no complete native provider record exists
        provenanceStatus: gen && !gen.reconstructed && gen.provider ? "NATIVE" : "RECONSTRUCTED",
        sourceGenerationRecordId: gen?.id ?? null,
      },
    });
  }

  return { baseline, entries, digest, integrity: integrity as "PASSED" | "FAILED", missing };
}

/** Review input digest (§11) — binds a review to exactly what it was shown. */
export function computeReviewInputDigest(parts: {
  baselineDigest: string; referenceSha: string | null; validationReportSha: string | null;
  floorAnchorSpecSha: string | null; styleLockSha: string | null;
}): string {
  const body = [
    `baseline:${parts.baselineDigest}`,
    `reference:${parts.referenceSha ?? "none"}`,
    `validation:${parts.validationReportSha ?? "none"}`,
    `anchorspec:${parts.floorAnchorSpecSha ?? "none"}`,
    `stylelock:${parts.styleLockSha ?? "none"}`,
  ].join("\n");
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export async function writeJson(missionKey: string, wpKey: string, name: string, data: unknown): Promise<string> {
  const dir = await artifactDir(missionKey, wpKey);
  const p = path.join(dir, name);
  await writeAtomic(p, JSON.stringify(data, null, 2));
  return p;
}

export async function writeText(missionKey: string, wpKey: string, name: string, text: string): Promise<string> {
  const dir = await artifactDir(missionKey, wpKey);
  const p = path.join(dir, name);
  await writeAtomic(p, text);
  return p;
}

export async function shaOfFile(p: string): Promise<string | null> {
  try { return await sha256Of(p); } catch { return null; }
}

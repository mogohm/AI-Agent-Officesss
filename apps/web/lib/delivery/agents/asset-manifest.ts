import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { readImageMeta } from "../image-meta";
import { layout, artifactDir } from "../workspace";
import { buildPlan } from "./asset-standardize";

/**
 * Manifest integrity (§2/§3). The manifest is a PROJECTION of durable
 * AssetGenerationRecord rows plus filesystem verification — never a fragile
 * incremental file write.
 *
 * Reconstruction never invents data: a field that cannot be proven is null and
 * the entry is flagged `reconstructed` with an explicit integrity warning.
 */

export const integritySummarySchema = z.object({
  requiredAssets: z.number(),
  manifestEntries: z.number(),
  filesystemAssets: z.number(),
  missingEntries: z.array(z.string()),
  missingFiles: z.array(z.string()),
  orphanFiles: z.array(z.string()),
  reconstructedEntries: z.number(),
  integrityStatus: z.enum(["PASSED", "DEGRADED", "FAILED"]),
});
export type IntegritySummary = z.infer<typeof integritySummarySchema>;

export const manifestSchema = z.object({
  workPackageKey: z.string(),
  repositoryCommit: z.string().nullable(),
  generatedAt: z.string(),
  integrity: integritySummarySchema,
  assets: z.array(z.object({
    assetKey: z.string(),
    targetPath: z.string(),
    action: z.string(),
    sourcePath: z.string().nullable(),
    outputSha256: z.string().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    format: z.string().nullable(),
    hasAlpha: z.boolean().nullable(),
    provider: z.string().nullable(),
    model: z.string().nullable(),
    promptTemplate: z.string().nullable(),
    promptVersion: z.string().nullable(),
    renderedPromptHash: z.string().nullable(),
    attempts: z.number(),
    cost: z.number(),
    validation: z.string(),
    review: z.string(),
    reconstructed: z.boolean(),
    integrityWarning: z.string().nullable(),
  })),
});
export type GenerationManifest = z.infer<typeof manifestSchema>;

export const assetKeyOf = (targetPath: string) => path.basename(targetPath, ".webp");

/** Atomic report write (§3): temp file in the same directory, then rename. */
export async function writeAtomic(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  const fh = await fs.open(tmp, "w");
  try {
    await fh.writeFile(content, "utf8");
    await fh.sync();           // flush to disk before the rename
  } finally {
    await fh.close();
  }
  await fs.rename(tmp, filePath); // atomic replacement of the canonical file
}

/** Upsert one durable per-asset record, committed before the next asset starts. */
export async function recordAssetAttempt(input: {
  missionId: string; workPackageId: string; agentRunId?: string;
  assetKey: string; targetPath: string; sourcePath?: string | null;
  action: "RETAIN" | "NORMALIZE" | "EDIT" | "REGENERATE"; attemptNumber: number;
  provider?: string | null; model?: string | null;
  promptTemplate?: string | null; promptVersion?: string | null; renderedPromptHash?: string | null;
  rawOutputPath?: string | null; normalizedOutputPath?: string | null;
  width?: number | null; height?: number | null; format?: string | null; hasAlpha?: boolean | null; sha256?: string | null;
  estimatedCost?: number; actualCost?: number;
  validationStatus?: "PENDING" | "PASSED" | "FAILED" | "NEEDS_REVIEW";
  reviewStatus?: "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "BLOCKED";
  correlationId?: string | null; error?: string | null; completed?: boolean;
}) {
  const data = {
    missionId: input.missionId, workPackageId: input.workPackageId, agentRunId: input.agentRunId ?? null,
    assetKey: input.assetKey, targetPath: input.targetPath, sourcePath: input.sourcePath ?? null,
    action: input.action, attemptNumber: input.attemptNumber,
    provider: input.provider ?? null, model: input.model ?? null,
    promptTemplate: input.promptTemplate ?? null, promptVersion: input.promptVersion ?? null,
    renderedPromptHash: input.renderedPromptHash ?? null,
    rawOutputPath: input.rawOutputPath ?? null, normalizedOutputPath: input.normalizedOutputPath ?? null,
    width: input.width ?? null, height: input.height ?? null, format: input.format ?? null,
    hasAlpha: input.hasAlpha ?? null, sha256: input.sha256 ?? null,
    estimatedCost: input.estimatedCost ?? 0, actualCost: input.actualCost ?? 0,
    validationStatus: input.validationStatus ?? "PENDING",
    reviewStatus: input.reviewStatus ?? "PENDING",
    correlationId: input.correlationId ?? null, error: input.error ?? null,
    completedAt: input.completed ? new Date() : null,
  };
  return db.assetGenerationRecord.upsert({
    where: { workPackageId_assetKey_attemptNumber: { workPackageId: input.workPackageId, assetKey: input.assetKey, attemptNumber: input.attemptNumber } },
    update: data,
    create: data,
  });
}

/** Has this asset already been produced and validated? (restart resume, §3) */
export async function alreadyCompleted(workPackageId: string, assetKey: string, worktreePath: string, targetPath: string): Promise<boolean> {
  const rec = await db.assetGenerationRecord.findFirst({
    where: { workPackageId, assetKey, validationStatus: "PASSED" },
    orderBy: { attemptNumber: "desc" },
  });
  if (!rec) return false;
  try { await fs.access(path.join(worktreePath, targetPath)); return true; } catch { return false; }
}

async function sha256File(p: string): Promise<string | null> {
  try { return createHash("sha256").update(await fs.readFile(p)).digest("hex"); } catch { return null; }
}

/**
 * Rebuild the manifest from durable rows + filesystem verification. Entries with
 * no DB row are reconstructed from disk and flagged — provider ids, prompts,
 * costs and timestamps are left null rather than invented.
 */
export async function rebuildManifest(opts: {
  missionId: string; missionKey: string; workPackageId: string; workPackageKey: string;
  worktreePath: string; repositoryCommit: string | null;
}): Promise<{ manifest: GenerationManifest; jsonPath: string }> {
  const plan = buildPlan(opts.repositoryCommit ?? "unknown", "reconstruction");
  const required = plan.assets.map((a) => ({ targetPath: a.targetPath, assetKey: assetKeyOf(a.targetPath), action: a.action }));

  const rows = await db.assetGenerationRecord.findMany({
    where: { workPackageId: opts.workPackageId }, orderBy: { attemptNumber: "desc" },
  });
  const bestByKey = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const prev = bestByKey.get(r.assetKey);
    // prefer a PASSED row, else the highest attempt
    if (!prev || (r.validationStatus === "PASSED" && prev.validationStatus !== "PASSED")) bestByKey.set(r.assetKey, r);
  }

  const rawDir = path.join(await artifactDir(opts.missionKey, opts.workPackageKey), "provider");
  const rawFiles = await fs.readdir(rawDir).catch(() => [] as string[]);

  const missingEntries: string[] = [];
  const missingFiles: string[] = [];
  let reconstructedEntries = 0;
  const assets: GenerationManifest["assets"] = [];

  for (const req of required) {
    const abs = path.join(opts.worktreePath, req.targetPath);
    let meta: { width: number; height: number; hasAlpha: boolean; format: string } | null = null;
    let sha: string | null = null;
    try {
      const buf = await fs.readFile(abs);
      meta = readImageMeta(buf);
      sha = createHash("sha256").update(buf).digest("hex");
    } catch { missingFiles.push(req.targetPath); }

    const row = bestByKey.get(req.assetKey);
    if (!row) {
      missingEntries.push(req.assetKey);
      reconstructedEntries++;
      // the raw provider output proves generation happened, even without a row
      const raw = rawFiles.find((f) => f.startsWith(`${req.assetKey}-a`)) ?? null;
      assets.push({
        assetKey: req.assetKey, targetPath: req.targetPath, action: req.action, sourcePath: raw ? path.join(rawDir, raw) : null,
        outputSha256: sha, width: meta?.width ?? null, height: meta?.height ?? null,
        format: meta?.format ?? null, hasAlpha: meta?.hasAlpha ?? null,
        provider: null, model: null, promptTemplate: null, promptVersion: null, renderedPromptHash: null,
        attempts: raw ? 1 : 0, cost: 0,
        validation: meta ? "PASSED" : "FAILED", review: "PENDING",
        reconstructed: true,
        integrityWarning: "reconstructed from filesystem — no durable record existed; provider, prompt, cost and timestamps could not be proven and are null",
      });
      continue;
    }

    assets.push({
      assetKey: row.assetKey, targetPath: row.targetPath, action: row.action, sourcePath: row.sourcePath ?? row.rawOutputPath,
      outputSha256: sha ?? row.sha256, width: meta?.width ?? row.width, height: meta?.height ?? row.height,
      format: meta?.format ?? row.format, hasAlpha: meta?.hasAlpha ?? row.hasAlpha,
      provider: row.provider, model: row.model, promptTemplate: row.promptTemplate,
      promptVersion: row.promptVersion, renderedPromptHash: row.renderedPromptHash,
      attempts: row.attemptNumber, cost: Number(row.actualCost),
      validation: meta ? row.validationStatus : "FAILED", review: row.reviewStatus,
      reconstructed: row.reconstructed, integrityWarning: row.integrityWarning,
    });
  }

  // orphan outputs: files under the office asset dirs that the plan never asked for
  const orphanFiles: string[] = [];
  for (const dir of ["buildings", "floors", "workers/default"]) {
    const abs = path.join(opts.worktreePath, "apps/web/public/assets/office", dir);
    for (const f of await fs.readdir(abs).catch(() => [] as string[])) {
      const rel = `apps/web/public/assets/office/${dir}/${f}`;
      if (f.endsWith(".webp") && !required.some((r) => r.targetPath === rel)) orphanFiles.push(rel);
    }
  }

  const integrity: IntegritySummary = {
    requiredAssets: required.length,
    manifestEntries: assets.length,
    filesystemAssets: required.length - missingFiles.length,
    missingEntries, missingFiles, orphanFiles, reconstructedEntries,
    integrityStatus:
      missingFiles.length > 0 || assets.length !== required.length ? "FAILED"
      : reconstructedEntries > 0 ? "DEGRADED"
      : "PASSED",
  };

  const manifest: GenerationManifest = {
    workPackageKey: opts.workPackageKey,
    repositoryCommit: opts.repositoryCommit,
    generatedAt: new Date().toISOString(),
    integrity, assets,
  };
  manifestSchema.parse(manifest);

  const dir = await artifactDir(opts.missionKey, opts.workPackageKey);
  const jsonPath = path.join(dir, "generation-manifest.json");
  await writeAtomic(jsonPath, JSON.stringify(manifest, null, 2));
  return { manifest, jsonPath };
}

/** Evidence index (§12): every required item with sha256, size and status. */
export const REQUIRED_EVIDENCE = [
  "asset-plan.json", "asset-plan.md", "generation-manifest.json",
  "validation-report.json", "validation-report.md",
  "review-report.json", "review-report.md",
  "validator-calibration.json", "validator-calibration.md",
  "correction-plan-cycle-1.json", "correction-plan-cycle-1.md",
  "contact-sheets/buildings.webp", "contact-sheets/floors.webp", "contact-sheets/workers.webp",
];

export async function buildEvidenceIndex(missionKey: string, workPackageKey: string) {
  const dir = await artifactDir(missionKey, workPackageKey);
  const items = [];
  for (const rel of REQUIRED_EVIDENCE) {
    const abs = path.join(dir, rel);
    let size: number | null = null, sha: string | null = null;
    try { size = (await fs.stat(abs)).size; sha = await sha256File(abs); } catch { /* missing */ }
    items.push({ path: rel, exists: size !== null, sizeBytes: size, sha256: sha, status: size !== null ? "PRESENT" : "MISSING" });
  }
  const complete = items.every((i) => i.exists);
  const index = { workPackageKey, generatedAt: new Date().toISOString(), complete, items };
  await writeAtomic(path.join(dir, "evidence-index.json"), JSON.stringify(index, null, 2));
  return index;
}

export function missionRootFor(missionKey: string) { return layout(missionKey).root; }

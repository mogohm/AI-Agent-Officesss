import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "@/lib/db";
import { runCommand } from "../command-runner";
import { createWorktree, writeArtifact, artifactDir, layout } from "../workspace";
import { resolveImageAdapter, estimateImageCost } from "../providers/image";
import { renderAssetPrompt, STYLE_LOCK_VERSION, ASSET_PROMPT_VERSION, FLOOR_SPECS, BUILDING_SPECS, WORKER_STATES } from "../prompts/asset-prompts";
import { MissingCredentialsError } from "../providers";
import { emit } from "../events";

/**
 * WP-002 — Asset Standardization executor (§4). Plans, generates, deterministically
 * validates and records evidence for every required asset. Generation happens
 * only for assets listed in the approved plan.
 *
 * The generating run NEVER approves its own output — review is a separate
 * AgentRun (see asset-review.ts).
 */

export const FLOOR_W = 1600, FLOOR_H = 600;
export const BUILDING_W = 1024, BUILDING_H = 768; // 4:3
export const SPRITE_W = 512, SPRITE_H = 768;

export const assetPlanSchema = z.object({
  repositoryCommit: z.string().min(1),
  sourceAuditEvidenceId: z.string(),
  styleLockVersion: z.string(),
  assets: z.array(z.object({
    targetPath: z.string(),
    category: z.enum(["building", "floor", "worker"]),
    sourcePath: z.string().nullable(),
    action: z.enum(["retain", "normalize", "edit", "regenerate"]),
    reason: z.string(),
    requiredWidth: z.number(),
    requiredHeight: z.number(),
    requiredFormat: z.literal("webp"),
    requiresAlpha: z.boolean(),
    mustContainNoPeople: z.boolean(),
    dependencies: z.array(z.string()),
  })),
});
export type AssetPlan = z.infer<typeof assetPlanSchema>;

export const manifestEntrySchema = z.object({
  targetPath: z.string(),
  action: z.enum(["retain", "normalize", "edit", "regenerate"]),
  sourcePath: z.string().nullable(),
  outputSha256: z.string(),
  width: z.number(), height: z.number(),
  format: z.string(), hasAlpha: z.boolean(),
  provider: z.string().nullable(), model: z.string().nullable(),
  promptTemplate: z.string().nullable(), promptVersion: z.string().nullable(),
  attempts: z.number(), cost: z.number(),
  validation: z.enum(["PASSED", "FAILED", "NEEDS_REVIEW"]),
  review: z.enum(["APPROVED", "CHANGES_REQUESTED", "BLOCKED", "PENDING"]),
});
export type ManifestEntry = z.infer<typeof manifestEntrySchema>;

export class BlockedAssetGeneration extends Error {
  constructor(msg: string) { super(msg); this.name = "BlockedAssetGeneration"; }
}
export class BlockedBudget extends Error {
  constructor(msg: string) { super(msg); this.name = "BlockedBudget"; }
}

const WP002_BUDGET_USD = 12;
const MAX_ATTEMPTS = 3;
const TOOL = "tools/asset_pipeline/imagetool.py";

/** Build the deterministic asset plan from the WP-001 audit. */
export function buildPlan(commit: string, auditEvidenceId: string): AssetPlan {
  const assets: AssetPlan["assets"] = [];

  for (const b of BUILDING_SPECS) {
    assets.push({
      targetPath: `apps/web/public/assets/office/buildings/${b.slug}-building.webp`,
      category: "building", sourcePath: null, action: "regenerate",
      reason: "required distinct full-building preview; existing company art is shared/duplicated per WP-001",
      requiredWidth: BUILDING_W, requiredHeight: BUILDING_H, requiredFormat: "webp",
      requiresAlpha: false, mustContainNoPeople: true, dependencies: [],
    });
  }
  for (const f of FLOOR_SPECS) {
    assets.push({
      targetPath: `apps/web/public/assets/office/floors/${f.slug}-floor-empty.webp`,
      category: "floor", sourcePath: null, action: "regenerate",
      reason: "WP-001 flagged existing floor art as suspectedBakedCharacters (confidence 0.7); a people-free 1600x600 standard is required",
      requiredWidth: FLOOR_W, requiredHeight: FLOOR_H, requiredFormat: "webp",
      requiresAlpha: false, mustContainNoPeople: true, dependencies: [],
    });
  }
  assets.push({
    targetPath: "apps/web/public/assets/office/floors/server-floor-empty.webp",
    category: "floor", sourcePath: null, action: "regenerate",
    reason: "no standardized server floor asset exists",
    requiredWidth: FLOOR_W, requiredHeight: FLOOR_H, requiredFormat: "webp",
    requiresAlpha: false, mustContainNoPeople: true, dependencies: [],
  });
  for (const w of WORKER_STATES) {
    assets.push({
      targetPath: `apps/web/public/assets/office/workers/default/${w.slug}.webp`,
      category: "worker", sourcePath: null, action: "regenerate",
      reason: "no default fallback sprite exists for this runtime state",
      requiredWidth: SPRITE_W, requiredHeight: SPRITE_H, requiredFormat: "webp",
      requiresAlpha: true, mustContainNoPeople: true, dependencies: [],
    });
  }

  return { repositoryCommit: commit, sourceAuditEvidenceId: auditEvidenceId, styleLockVersion: STYLE_LOCK_VERSION, assets };
}

function promptFor(a: AssetPlan["assets"][number]): { key: Parameters<typeof renderAssetPrompt>[0]; vars: Record<string, string>; orientation: "landscape" | "portrait" | "square"; transparent: boolean } {
  if (a.category === "building") {
    const spec = BUILDING_SPECS.find((b) => a.targetPath.includes(b.slug))!;
    return { key: "company-building", vars: { identity: spec.identity, detail: spec.detail }, orientation: "square", transparent: false };
  }
  if (a.category === "worker") {
    const spec = WORKER_STATES.find((w) => a.targetPath.endsWith(`${w.slug}.webp`))!;
    return { key: "worker-fallback-state", vars: { state: spec.state, treatment: spec.treatment }, orientation: "portrait", transparent: true };
  }
  if (a.targetPath.includes("server-floor")) {
    return { key: "server-floor-empty", vars: {}, orientation: "landscape", transparent: false };
  }
  const spec = FLOOR_SPECS.find((f) => a.targetPath.includes(`${f.slug}-floor-empty`))!;
  return { key: "department-floor-empty", vars: { department: spec.department, furniture: spec.furniture, accent: spec.accent }, orientation: "landscape", transparent: false };
}

type ToolJson = Record<string, unknown>;
async function imageTool(args: string[], ctx: { cwd: string; root: string; missionId: string; agentRunId: string }): Promise<ToolJson> {
  const r = await runCommand({
    executable: "python", args: [TOOL, ...args], cwd: ctx.cwd, workspaceRoot: ctx.root,
    missionId: ctx.missionId, agentRunId: ctx.agentRunId, toolName: `imagetool.${args[0]}`, timeoutMs: 180_000,
  });
  if (r.blocked) throw new Error(`imagetool blocked by policy: ${r.blocked}`);
  const line = r.stdout.trim().split("\n").filter(Boolean).pop() ?? "{}";
  try { return JSON.parse(line) as ToolJson; }
  catch { return { ok: false, error: `unparseable imagetool output: ${r.stderr.slice(0, 200) || line.slice(0, 200)}` }; }
}

export async function runAssetStandardization(opts: {
  missionId: string; missionKey: string; workPackageId: string; workPackageKey: string; agentRunId: string;
}): Promise<{ manifest: ManifestEntry[]; plan: AssetPlan; cost: number; artifactPaths: string[]; worktreePath: string }> {
  const root = layout(opts.missionKey).root;

  // ---- isolated worktree on a dedicated branch (§16) ----
  const branch = `work/${opts.missionKey}/${opts.workPackageKey}`;
  const wt = await createWorktree({ missionId: opts.missionId, missionKey: opts.missionKey, workPackageKey: opts.workPackageKey });
  if (!wt.headSha) throw new Error("could not resolve worktree HEAD sha");
  await db.workPackage.update({ where: { id: opts.workPackageId }, data: { branch, worktreePath: wt.path } });
  const ctx = { cwd: wt.path, root, missionId: opts.missionId, agentRunId: opts.agentRunId };

  // ---- WP-001 evidence is the required input (§2) ----
  const auditArtifact = await db.browserArtifact.findFirst({
    where: { missionId: opts.missionId, label: "asset-audit.json" }, orderBy: { createdAt: "desc" },
  });
  if (!auditArtifact) throw new Error("WP-001 evidence (asset-audit.json) not found — WP-002 requires it as input");
  const audit = JSON.parse(await fs.readFile(auditArtifact.storageKey, "utf8")) as { assets: { path: string; suspectedBakedCharacters: boolean }[] };
  const suspected = audit.assets.filter((a) => a.suspectedBakedCharacters).length;
  await emit(opts.missionId, "agent.tool.completed", { tool: "wp001.evidence", assets: audit.assets.length, suspected });

  // ---- plan ----
  const plan = buildPlan(wt.headSha, auditArtifact.id);
  assetPlanSchema.parse(plan);
  const planMd = [
    "# WP-002 — Asset Plan", "",
    `- Repository commit: \`${plan.repositoryCommit}\``,
    `- Source audit evidence: \`${plan.sourceAuditEvidenceId}\` (${audit.assets.length} assets, ${suspected} suspected baked characters)`,
    `- Style lock: ${plan.styleLockVersion} · prompts ${ASSET_PROMPT_VERSION}`,
    `- Branch: \`${branch}\``, "",
    "| target | category | action | dimensions | alpha |", "|---|---|---|---|---|",
    ...plan.assets.map((a) => `| \`${a.targetPath}\` | ${a.category} | ${a.action} | ${a.requiredWidth}×${a.requiredHeight} | ${a.requiresAlpha} |`),
  ].join("\n");
  const planJsonPath = await writeArtifact(opts.missionKey, opts.workPackageKey, "asset-plan.json", JSON.stringify(plan, null, 2));
  const planMdPath = await writeArtifact(opts.missionKey, opts.workPackageKey, "asset-plan.md", planMd);
  await emit(opts.missionId, "evidence.created", { wp: opts.workPackageKey, artifacts: ["asset-plan.json", "asset-plan.md"] });

  // ---- credentials before spending anything ----
  const adapter = resolveImageAdapter();
  const validation = await adapter.validateConfiguration();
  if (!validation.ok) throw new MissingCredentialsError(validation.missingEnv);
  const model = validation.model;

  const artDir = await artifactDir(opts.missionKey, opts.workPackageKey);
  const rawDir = path.join(artDir, "provider");
  await fs.mkdir(rawDir, { recursive: true });

  // ---- generate + deterministically validate ----
  const manifest: ManifestEntry[] = [];
  let spent = 0;
  const quality = (process.env.DELIVERY_IMAGE_QUALITY ?? "low") as "low" | "medium" | "high";

  for (const asset of plan.assets) {
    const p = promptFor(asset);
    let attempts = 0, entryCost = 0, lastError = "";
    let ok = false;
    let meta: ToolJson = {};
    const outAbs = path.join(wt.path, asset.targetPath);

    while (attempts < MAX_ATTEMPTS && !ok) {
      const estimate = estimateImageCost(model, quality);
      if (spent + estimate > WP002_BUDGET_USD) {
        throw new BlockedBudget(`WP-002 cap $${WP002_BUDGET_USD} would be exceeded (spent $${spent.toFixed(4)}, next $${estimate.toFixed(4)})`);
      }
      attempts++;
      // a repeated attempt must not reuse an identical prompt (§12)
      const vars = attempts === 1 ? p.vars : { ...p.vars, detail: `${p.vars.detail ?? p.vars.treatment ?? ""} (attempt ${attempts}: strictly no living beings, keep entire subject inside frame)` };
      const rendered = renderAssetPrompt(p.key, vars);

      await emit(opts.missionId, "agent.tool.started", { tool: "image.generate", target: asset.targetPath, attempt: attempts });
      const raw = path.join(rawDir, `${path.basename(asset.targetPath, ".webp")}-a${attempts}.png`);
      const gen = await adapter.generate({
        prompt: rendered.prompt, orientation: p.orientation, transparent: p.transparent,
        quality, outputPath: raw, timeoutMs: 300_000,
      });
      spent += gen.actualCost; entryCost += gen.actualCost;

      if (gen.status !== "SUCCEEDED") { lastError = gen.error ?? gen.status; continue; }

      // deterministic normalization to the exact required canvas
      const norm = await imageTool([
        "normalize", "--src", path.relative(wt.path, raw).replace(/\\/g, "/"),
        "--out", asset.targetPath, "--width", String(asset.requiredWidth), "--height", String(asset.requiredHeight),
        "--fit", asset.category === "building" || asset.requiresAlpha ? "contain" : "cover",
        ...(asset.requiresAlpha ? ["--alpha"] : []),
      ], ctx);
      if (!norm.ok) { lastError = String(norm.error ?? "normalize failed"); continue; }

      const val = await imageTool([
        "validate", "--path", asset.targetPath, "--width", String(asset.requiredWidth),
        "--height", String(asset.requiredHeight), ...(asset.requiresAlpha ? ["--alpha"] : []),
      ], ctx);
      if (!val.ok) { lastError = JSON.stringify(val.issues ?? val.error); continue; }

      meta = val; ok = true;
      await emit(opts.missionId, "agent.tool.completed", { tool: "image.generate", target: asset.targetPath, attempt: attempts, cost: gen.actualCost });
    }

    if (!ok) {
      manifest.push({
        targetPath: asset.targetPath, action: asset.action, sourcePath: asset.sourcePath,
        outputSha256: "", width: 0, height: 0, format: "", hasAlpha: false,
        provider: adapter instanceof Object ? "OPENAI" : null, model, promptTemplate: p.key, promptVersion: ASSET_PROMPT_VERSION,
        attempts, cost: entryCost, validation: "FAILED", review: "PENDING",
      });
      throw new BlockedAssetGeneration(`asset ${asset.targetPath} failed after ${attempts} attempts: ${lastError.slice(0, 300)}`);
    }

    const phash = await imageTool(["phash", "--path", asset.targetPath], ctx);
    manifest.push({
      targetPath: asset.targetPath, action: asset.action, sourcePath: asset.sourcePath,
      outputSha256: String(meta.sha256 ?? phash.sha256 ?? ""),
      width: Number(meta.width ?? 0), height: Number(meta.height ?? 0),
      format: String(meta.format ?? "webp"), hasAlpha: Boolean(meta.hasAlpha),
      provider: "OPENAI", model, promptTemplate: p.key, promptVersion: ASSET_PROMPT_VERSION,
      attempts, cost: entryCost, validation: "PASSED", review: "PENDING",
    });
    await fs.writeFile(path.join(artDir, "generation-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  }

  // ---- contact sheets ----
  const byCat = (c: string) => manifest.filter((m) => m.targetPath.includes(c)).map((m) => m.targetPath);
  await fs.mkdir(path.join(artDir, "contact-sheets"), { recursive: true });
  for (const [cat, dirFrag, cols] of [["buildings", "/buildings/", 2], ["floors", "/floors/", 1], ["workers", "/workers/", 3]] as const) {
    const paths = byCat(dirFrag);
    if (!paths.length) continue;
    await imageTool(["contact", "--out", path.relative(wt.path, path.join(artDir, "contact-sheets", `${cat}.webp`)).replace(/\\/g, "/"),
      "--tile-w", "400", "--tile-h", "300", "--cols", String(cols), "--paths", ...paths], ctx);
  }

  const manifestPath = await writeArtifact(opts.missionKey, opts.workPackageKey, "generation-manifest.json", JSON.stringify(manifest, null, 2));
  return { manifest, plan, cost: spent, artifactPaths: [planJsonPath, planMdPath, manifestPath], worktreePath: wt.path };
}

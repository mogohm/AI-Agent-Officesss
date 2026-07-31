import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "@/lib/db";
import { runCommand } from "../command-runner";
import { createWorktree, writeArtifact, layout } from "../workspace";
import { readImageMeta, aspectRatio } from "../image-meta";
import { getTemplate, render } from "../prompts/registry";
import { resolveProvider } from "../providers/openai";
import { MissingCredentialsError } from "../providers";
import { emit } from "../events";

/**
 * WP-001 — Asset Audit agent. READ-ONLY: it inspects the real repository inside
 * an isolated worktree and writes evidence artifacts. It never edits source or
 * assets.
 *
 * Dimensions/alpha are measured deterministically; only the qualitative parts
 * (suspected baked-in characters, style compatibility) come from the model, and
 * those carry an explicit confidence.
 */

export const assetAuditSchema = z.object({
  repositoryCommit: z.string().min(1),
  reference: z.object({
    path: z.string(), exists: z.boolean(), width: z.number(), height: z.number(),
  }),
  assets: z.array(z.object({
    path: z.string(),
    category: z.enum(["building", "floor", "worker", "reference", "other"]),
    exists: z.boolean(),
    width: z.number(),
    height: z.number(),
    aspectRatio: z.number(),
    hasAlpha: z.boolean(),
    suspectedBakedCharacters: z.boolean(),
    confidence: z.number().min(0).max(1).optional(),
    styleCompatible: z.boolean(),
    issues: z.array(z.string()),
    recommendedAction: z.enum(["retain", "replace", "regenerate", "inspect"]),
  })),
  summary: z.object({
    total: z.number(), retain: z.number(), replace: z.number(),
    regenerate: z.number(), manualInspection: z.number(),
  }),
});
export type AssetAudit = z.infer<typeof assetAuditSchema>;

const REFERENCE_PATH = "apps/web/public/assets/reference/reference.png";

function categorise(p: string): "building" | "floor" | "worker" | "reference" | "other" {
  const l = p.toLowerCase();
  if (l.includes("/reference/")) return "reference";
  if (l.includes("/characters/") || l.includes("sprite")) return "worker";
  if (l.includes("building") || l.includes("/companies/") || l.includes("tower")) return "building";
  if (l.includes("floor") || l.includes("/rooms/") || l.includes("module")) return "floor";
  return "other";
}

export async function runAssetAudit(opts: {
  missionId: string;
  missionKey: string;
  workPackageId: string;
  workPackageKey: string;
  agentRunId: string;
}): Promise<{ artifactPaths: string[]; audit: AssetAudit; usage: { prompt: number; completion: number; cost: number } }> {
  const root = layout(opts.missionKey).root;

  // 1. isolated read-only worktree
  await emit(opts.missionId, "agent.tool.started", { tool: "workspace.worktree", wp: opts.workPackageKey });
  const wt = await createWorktree({ missionId: opts.missionId, missionKey: opts.missionKey, workPackageKey: opts.workPackageKey });
  if (!wt.headSha) throw new Error("could not resolve worktree HEAD sha");
  await emit(opts.missionId, "agent.tool.completed", { tool: "workspace.worktree", sha: wt.headSha });

  // 2. enumerate tracked asset files with git (allowlisted, inside the jail)
  const ls = await runCommand({
    executable: "git", args: ["ls-files", "apps/web/public/assets"],
    cwd: wt.path, workspaceRoot: root, missionId: opts.missionId, agentRunId: opts.agentRunId, toolName: "git.ls-files",
  });
  if (!ls.ok) throw new Error(`git ls-files failed: ${ls.blocked ?? ls.stderr.slice(0, 200)}`);
  const files = ls.stdout.split("\n").map((s) => s.trim()).filter((s) => /\.(webp|png|jpe?g)$/i.test(s));

  // 3. deterministic measurement
  const measured: {
    path: string; category: ReturnType<typeof categorise>; exists: boolean;
    width: number; height: number; aspectRatio: number; hasAlpha: boolean; bytes: number;
  }[] = [];
  for (const rel of files) {
    const abs = path.join(wt.path, rel);
    try {
      const buf = await fs.readFile(abs);
      const meta = readImageMeta(buf);
      measured.push({
        path: rel, category: categorise(rel), exists: true,
        width: meta?.width ?? 0, height: meta?.height ?? 0,
        aspectRatio: meta ? aspectRatio(meta.width, meta.height) : 0,
        hasAlpha: meta?.hasAlpha ?? false, bytes: buf.length,
      });
    } catch {
      measured.push({ path: rel, category: categorise(rel), exists: false, width: 0, height: 0, aspectRatio: 0, hasAlpha: false, bytes: 0 });
    }
  }
  await emit(opts.missionId, "agent.tool.completed", { tool: "asset.measure", count: measured.length });

  const ref = measured.find((m) => m.path === REFERENCE_PATH)
    ?? { path: REFERENCE_PATH, exists: false, width: 0, height: 0 };

  // 4. qualitative assessment — only for assets that can appear as room art
  const candidates = measured.filter((m) => m.category === "floor" || m.category === "building");
  const template = getTemplate("asset-audit");
  const { system, user, hash } = render(template, {
    reference: `${ref.path} (${ref.width}x${ref.height})`,
    assets: JSON.stringify(candidates.slice(0, 60), null, 0),
  });

  const provider = resolveProvider();
  const validation = await provider.validateConfiguration();
  if (!validation.ok) throw new MissingCredentialsError(validation.missingEnv);

  await db.agentRun.update({
    where: { id: opts.agentRunId },
    data: { promptTemplateId: template.key, promptVersion: template.version, promptHash: hash, provider: provider.name },
  });
  await emit(opts.missionId, "agent.tool.started", { tool: "provider.execute", provider: provider.name });

  const result = await provider.execute({ system, user, modelClass: "visual", expectJson: true, maxTokens: 8000, timeoutMs: 180_000 });
  if (result.status !== "SUCCEEDED") throw new Error(`agent provider ${result.status}: ${result.error ?? "unknown"}`);
  await emit(opts.missionId, "agent.tool.completed", { tool: "provider.execute", tokens: result.totalTokens, cost: result.costUsd });

  const assessed = new Map<string, { suspectedBakedCharacters: boolean; confidence?: number; styleCompatible: boolean; issues: string[]; recommendedAction: string }>();
  const parsed = z.object({
    assets: z.array(z.object({
      path: z.string(), suspectedBakedCharacters: z.boolean(), confidence: z.number().min(0).max(1).optional(),
      styleCompatible: z.boolean(), issues: z.array(z.string()).default([]),
      recommendedAction: z.enum(["retain", "replace", "regenerate", "inspect"]),
    })),
  }).safeParse(result.structuredOutput);
  if (parsed.success) for (const a of parsed.data.assets) assessed.set(a.path, a);

  // 5. compose the audit — measured facts win, model fills qualitative gaps
  const assets: AssetAudit["assets"] = measured.map((m) => {
    const a = assessed.get(m.path);
    const issues: string[] = [...(a?.issues ?? [])];
    if (m.exists && m.width === 0) issues.push("could not decode image header");
    if (m.category === "floor" && m.width > 0 && Math.abs(m.aspectRatio - 8 / 3) > 0.3) {
      issues.push(`aspect ${m.aspectRatio} deviates from the 8:3 floor standard`);
    }
    const isWorker = m.category === "worker";
    return {
      path: m.path, category: m.category, exists: m.exists,
      width: m.width, height: m.height, aspectRatio: m.aspectRatio, hasAlpha: m.hasAlpha,
      // characters are expected in sprite assets — never a defect there
      suspectedBakedCharacters: isWorker ? false : (a?.suspectedBakedCharacters ?? false),
      confidence: isWorker ? 1 : a?.confidence,
      styleCompatible: a?.styleCompatible ?? true,
      issues,
      recommendedAction: (a?.recommendedAction as AssetAudit["assets"][number]["recommendedAction"]) ?? (issues.length ? "inspect" : "retain"),
    };
  });

  const summary = {
    total: assets.length,
    retain: assets.filter((a) => a.recommendedAction === "retain").length,
    replace: assets.filter((a) => a.recommendedAction === "replace").length,
    regenerate: assets.filter((a) => a.recommendedAction === "regenerate").length,
    manualInspection: assets.filter((a) => a.recommendedAction === "inspect").length,
  };

  const audit: AssetAudit = {
    repositoryCommit: wt.headSha,
    reference: { path: ref.path, exists: ref.exists, width: ref.width, height: ref.height },
    assets, summary,
  };
  assetAuditSchema.parse(audit); // fail loudly if the contract is broken

  // 6. evidence artifacts
  const suspected = assets.filter((a) => a.suspectedBakedCharacters);
  const md = [
    `# WP-001 — Asset Audit`, "",
    `- Mission: ${opts.missionKey}`,
    `- Repository commit: \`${audit.repositoryCommit}\``,
    `- Reference: \`${audit.reference.path}\` (${audit.reference.width}×${audit.reference.height}, exists: ${audit.reference.exists})`,
    `- Provider: ${result.provider} / ${result.model} · prompt \`${template.key}@${template.version}\``,
    "", `## Summary`, "",
    `| metric | value |`, `|---|---|`,
    `| total assets | ${summary.total} |`, `| retain | ${summary.retain} |`,
    `| replace | ${summary.replace} |`, `| regenerate | ${summary.regenerate} |`,
    `| manual inspection | ${summary.manualInspection} |`,
    "", `## Suspected baked-in characters (${suspected.length})`, "",
    suspected.length ? "| asset | confidence | action |\n|---|---|---|" : "_none flagged_",
    ...suspected.slice(0, 40).map((a) => `| \`${a.path}\` | ${a.confidence ?? "n/a"} | ${a.recommendedAction} |`),
    "", `## By category`, "",
    "| category | count |", "|---|---|",
    ...["building", "floor", "worker", "reference", "other"].map((c) => `| ${c} | ${assets.filter((a) => a.category === c).length} |`),
    "", `> Dimensions and alpha are measured deterministically from file headers.`,
    `> Baked-character and style judgements are model assessments with confidence — not certainties.`,
  ].join("\n");

  const jsonPath = await writeArtifact(opts.missionKey, opts.workPackageKey, "asset-audit.json", JSON.stringify(audit, null, 2));
  const mdPath = await writeArtifact(opts.missionKey, opts.workPackageKey, "asset-audit.md", md);

  for (const [p, kind] of [[jsonPath, "TEST_REPORT"], [mdPath, "LOG"]] as const) {
    await db.browserArtifact.create({
      data: { missionId: opts.missionId, kind, storageKey: p, label: path.basename(p), sizeBytes: (await fs.stat(p)).size },
    });
  }
  await emit(opts.missionId, "evidence.created", { wp: opts.workPackageKey, artifacts: [path.basename(jsonPath), path.basename(mdPath)] });

  return {
    artifactPaths: [jsonPath, mdPath],
    audit,
    usage: { prompt: result.promptTokens, completion: result.completionTokens, cost: result.costUsd },
  };
}

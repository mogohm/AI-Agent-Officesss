import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "@/lib/db";
import { runCommand } from "../command-runner";
import { writeArtifact, artifactDir, layout } from "../workspace";
import { resolveProvider } from "../providers/openai";
import { MissingCredentialsError } from "../providers";
import { emit } from "../events";
import { FLOOR_W, FLOOR_H, type ManifestEntry } from "./asset-standardize";

/**
 * Independent ASSET_REVIEW step (§14). Runs as its OWN AgentRun with a different
 * role, so the run that generated an asset can never approve it.
 *
 * Review is layered evidence (§11): deterministic geometry/duplication checks
 * first, then a visual model opinion WITH confidence — never certainty.
 */

export type ReviewVerdict = "APPROVED" | "CHANGES_REQUESTED" | "BLOCKED";

export const reviewReportSchema = z.object({
  reviewerAgentRunId: z.string(),
  generatorAgentRunId: z.string(),
  verdict: z.enum(["APPROVED", "CHANGES_REQUESTED", "BLOCKED"]),
  assets: z.array(z.object({
    targetPath: z.string(),
    verdict: z.enum(["APPROVED", "CHANGES_REQUESTED", "BLOCKED"]),
    suspectedBakedCharacters: z.boolean(),
    confidence: z.number().min(0).max(1),
    evidenceMethod: z.string(),
    findings: z.array(z.string()),
  })),
  summary: z.object({ approved: z.number(), changesRequested: z.number(), blocked: z.number() }),
});
export type ReviewReport = z.infer<typeof reviewReportSchema>;

const TOOL = "tools/asset_pipeline/imagetool.py";

async function tool(args: string[], ctx: { cwd: string; root: string; missionId: string; agentRunId: string }) {
  const r = await runCommand({
    executable: "python", args: [TOOL, ...args], cwd: ctx.cwd, workspaceRoot: ctx.root,
    missionId: ctx.missionId, agentRunId: ctx.agentRunId, toolName: `review.${args[0]}`, timeoutMs: 120_000,
  });
  const line = r.stdout.trim().split("\n").filter(Boolean).pop() ?? "{}";
  try { return JSON.parse(line) as Record<string, unknown>; } catch { return { ok: false } as Record<string, unknown>; }
}

/** Hamming distance between two 64-bit hex perceptual hashes. */
export function phashDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

export async function runAssetReview(opts: {
  missionId: string; missionKey: string; workPackageId: string; workPackageKey: string;
  reviewerAgentRunId: string; generatorAgentRunId: string; worktreePath: string; manifest: ManifestEntry[];
}): Promise<{ report: ReviewReport; artifactPaths: string[]; usage: { prompt: number; completion: number; cost: number } }> {
  const root = layout(opts.missionKey).root;
  const ctx = { cwd: opts.worktreePath, root, missionId: opts.missionId, agentRunId: opts.reviewerAgentRunId };

  if (opts.reviewerAgentRunId === opts.generatorAgentRunId) {
    throw new Error("asset review must run as a separate AgentRun — self-approval is not permitted");
  }

  // ---------- deterministic checks ----------
  const geom = new Map<string, { bbox: Record<string, unknown>; phash: string }>();
  for (const m of opts.manifest) {
    const bb = await tool(["bbox", "--path", m.targetPath], ctx);
    const ph = await tool(["phash", "--path", m.targetPath], ctx);
    geom.set(m.targetPath, { bbox: bb, phash: String(ph.phash ?? "") });
  }

  const findingsByAsset = new Map<string, string[]>();
  const add = (p: string, f: string) => findingsByAsset.set(p, [...(findingsByAsset.get(p) ?? []), f]);

  // duplicate detection across the whole set (identical binaries are rejected)
  const bySha = new Map<string, string[]>();
  for (const m of opts.manifest) bySha.set(m.outputSha256, [...(bySha.get(m.outputSha256) ?? []), m.targetPath]);
  for (const [sha, paths] of bySha) if (sha && paths.length > 1) for (const p of paths) add(p, `duplicate binary (sha256 shared with ${paths.filter((x) => x !== p).join(", ")})`);

  // buildings: distinct perceptual hashes + base not cropped
  const buildings = opts.manifest.filter((m) => m.targetPath.includes("/buildings/"));
  for (let i = 0; i < buildings.length; i++) {
    for (let j = i + 1; j < buildings.length; j++) {
      const d = phashDistance(geom.get(buildings[i].targetPath)?.phash ?? "", geom.get(buildings[j].targetPath)?.phash ?? "");
      if (d < 8) add(buildings[j].targetPath, `too visually similar to ${path.basename(buildings[i].targetPath)} (phash distance ${d} < 8)`);
    }
  }
  for (const b of buildings) {
    const bb = geom.get(b.targetPath)?.bbox as { bottomGapPct?: number } | undefined;
    if (bb && typeof bb.bottomGapPct === "number" && bb.bottomGapPct < 1.5) {
      add(b.targetPath, `building base may be cropped (bottom gap ${bb.bottomGapPct}% < 1.5%)`);
    }
  }

  // floors: identical canvas + consistent structural boundaries within tolerance
  const floors = opts.manifest.filter((m) => m.targetPath.includes("/floors/"));
  for (const f of floors) {
    if (f.width !== FLOOR_W || f.height !== FLOOR_H) add(f.targetPath, `floor canvas ${f.width}x${f.height} != ${FLOOR_W}x${FLOOR_H}`);
    const bb = geom.get(f.targetPath)?.bbox as { leftGapPx?: number; rightGapPx?: number } | undefined;
    if (bb) {
      if ((bb.leftGapPx ?? 0) > 2) add(f.targetPath, `left boundary gap ${bb.leftGapPx}px > 2px tolerance`);
      if ((bb.rightGapPx ?? 0) > 2) add(f.targetPath, `right boundary gap ${bb.rightGapPx}px > 2px tolerance`);
    }
  }

  // sprites: alpha required, states must not be identical
  for (const w of opts.manifest.filter((m) => m.targetPath.includes("/workers/"))) {
    if (!w.hasAlpha) add(w.targetPath, "worker sprite has no alpha channel");
  }

  // ---------- visual model opinion (supplementary, with confidence) ----------
  const provider = resolveProvider();
  const v = await provider.validateConfiguration();
  if (!v.ok) throw new MissingCredentialsError(v.missingEnv);

  const summaryForModel = opts.manifest.map((m) => ({
    path: m.targetPath, category: m.targetPath.includes("/buildings/") ? "building" : m.targetPath.includes("/workers/") ? "worker" : "floor",
    width: m.width, height: m.height, hasAlpha: m.hasAlpha, attempts: m.attempts,
    deterministicFindings: findingsByAsset.get(m.targetPath) ?? [],
  }));

  await emit(opts.missionId, "agent.tool.started", { tool: "review.assess", assets: summaryForModel.length });
  const result = await provider.execute({
    modelClass: "visual", expectJson: true, maxTokens: 6000, timeoutMs: 180_000,
    system: "You are an independent visual asset reviewer. You did NOT create these assets. You receive deterministic measurements and findings produced by the system. Judge only what the evidence supports; where you cannot verify something (such as whether human figures are drawn into an image you cannot see), say so with a low confidence rather than asserting. Respond only with JSON.",
    user: [
      "Assets generated for an isometric office management UI. The generation prompts explicitly prohibited any people, text or logos.",
      "Deterministic measurements and findings:",
      JSON.stringify(summaryForModel),
      "",
      'Return JSON: {"assets":[{"path":string,"verdict":"APPROVED"|"CHANGES_REQUESTED"|"BLOCKED","suspectedBakedCharacters":boolean,"confidence":number,"reasoning":string}]}',
      "Rules: any asset with deterministic findings must be CHANGES_REQUESTED or BLOCKED. An asset with no findings and correct dimensions should be APPROVED.",
      "You cannot see the pixels, so suspectedBakedCharacters must have confidence <= 0.5 unless a deterministic finding supports it.",
    ].join("\n"),
  });
  if (result.status !== "SUCCEEDED") throw new Error(`review provider ${result.status}: ${result.error ?? "unknown"}`);
  await emit(opts.missionId, "agent.tool.completed", { tool: "review.assess", tokens: result.totalTokens });

  const parsed = z.object({
    assets: z.array(z.object({
      path: z.string(), verdict: z.enum(["APPROVED", "CHANGES_REQUESTED", "BLOCKED"]),
      suspectedBakedCharacters: z.boolean(), confidence: z.number().min(0).max(1), reasoning: z.string().default(""),
    })),
  }).safeParse(result.structuredOutput);
  const opinion = new Map((parsed.success ? parsed.data.assets : []).map((a) => [a.path, a]));

  // ---------- combine: deterministic findings are authoritative ----------
  const assets: ReviewReport["assets"] = opts.manifest.map((m) => {
    const findings = findingsByAsset.get(m.targetPath) ?? [];
    const op = opinion.get(m.targetPath);
    const conf = Math.min(op?.confidence ?? 0.2, findings.length ? 1 : 0.5);
    let verdict: ReviewVerdict = findings.length > 0 ? "CHANGES_REQUESTED" : (op?.verdict ?? "APPROVED");
    // §11: high-confidence people detection blocks the asset outright
    if ((op?.suspectedBakedCharacters ?? false) && conf >= 0.8) verdict = "BLOCKED";
    return {
      targetPath: m.targetPath, verdict,
      suspectedBakedCharacters: op?.suspectedBakedCharacters ?? false,
      confidence: conf,
      evidenceMethod: findings.length ? "deterministic+model" : "model-only (pixels not inspected)",
      findings,
    };
  });

  const report: ReviewReport = {
    reviewerAgentRunId: opts.reviewerAgentRunId, generatorAgentRunId: opts.generatorAgentRunId,
    verdict: assets.some((a) => a.verdict === "BLOCKED") ? "BLOCKED"
      : assets.some((a) => a.verdict === "CHANGES_REQUESTED") ? "CHANGES_REQUESTED" : "APPROVED",
    assets,
    summary: {
      approved: assets.filter((a) => a.verdict === "APPROVED").length,
      changesRequested: assets.filter((a) => a.verdict === "CHANGES_REQUESTED").length,
      blocked: assets.filter((a) => a.verdict === "BLOCKED").length,
    },
  };
  reviewReportSchema.parse(report);

  const md = [
    "# WP-002 — Asset Review", "",
    `- Reviewer AgentRun: \`${report.reviewerAgentRunId}\` (independent of generator \`${report.generatorAgentRunId}\`)`,
    `- Verdict: **${report.verdict}**`,
    `- Approved ${report.summary.approved} · changes requested ${report.summary.changesRequested} · blocked ${report.summary.blocked}`,
    "", "| asset | verdict | suspected people | confidence | findings |", "|---|---|---|---|---|",
    ...report.assets.map((a) => `| \`${path.basename(a.targetPath)}\` | ${a.verdict} | ${a.suspectedBakedCharacters} | ${a.confidence} | ${a.findings.join("; ") || "—"} |`),
    "", "> Deterministic geometry, duplication and format checks are authoritative.",
    "> The model reviewer cannot see pixels; its people-detection confidence is capped accordingly (§11).",
  ].join("\n");

  const jsonPath = await writeArtifact(opts.missionKey, opts.workPackageKey, "review-report.json", JSON.stringify(report, null, 2));
  const mdPath = await writeArtifact(opts.missionKey, opts.workPackageKey, "review-report.md", md);

  const dir = await artifactDir(opts.missionKey, opts.workPackageKey);
  await fs.writeFile(path.join(dir, "validation-report.json"), JSON.stringify({
    assets: opts.manifest.map((m) => ({ targetPath: m.targetPath, validation: m.validation, width: m.width, height: m.height, format: m.format, hasAlpha: m.hasAlpha, sha256: m.outputSha256 })),
  }, null, 2), "utf8");
  await fs.writeFile(path.join(dir, "validation-report.md"), [
    "# WP-002 — Validation Report", "",
    "| asset | validation | dimensions | format | alpha |", "|---|---|---|---|---|",
    ...opts.manifest.map((m) => `| \`${path.basename(m.targetPath)}\` | ${m.validation} | ${m.width}×${m.height} | ${m.format} | ${m.hasAlpha} |`),
  ].join("\n"), "utf8");

  return {
    report, artifactPaths: [jsonPath, mdPath],
    usage: { prompt: result.promptTokens, completion: result.completionTokens, cost: result.costUsd },
  };
}

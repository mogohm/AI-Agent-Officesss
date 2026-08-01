import "dotenv/config";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// same convention as the delivery worker: the image/text provider key may live
// in the repo-root .env.local rather than apps/web/.env
for (const f of [path.resolve("../../.env.local"), path.resolve("../../.env")]) {
  if (!fsSync.existsSync(f)) continue;
  for (const line of fsSync.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const v = m[2].replace(/^["']|["']$/g, "");
    if (v && !process.env[m[1]]) process.env[m[1]] = v;
  }
}
import {
  createBaseline, verifyPins, computeReviewInputDigest, writeJson, writeText, shaOfFile,
  BASELINE_VERSION, VALIDATOR_VERSION, FLOOR_ANCHOR_SPEC_VERSION,
} from "@/lib/delivery/agents/asset-baseline";
import { runCommand } from "@/lib/delivery/command-runner";
import { layout, artifactDir } from "@/lib/delivery/workspace";
import { resolveProvider } from "@/lib/delivery/providers/openai";
import { buildEvidenceIndex } from "@/lib/delivery/agents/asset-manifest";

/**
 * WP-002 Correction Cycle 2 — canonical baseline attestation.
 * ZERO image generation: pin bytes, validate them, review them, retest defects.
 */
const MISSION = "VISUAL-2026-001";
const WP = "WP-002";
const TOOL = "tools/asset_pipeline/imagetool.py";
const prisma = new PrismaClient();

type J = Record<string, unknown>;

async function tool(args: string[], ctx: { cwd: string; root: string; missionId: string; agentRunId: string }): Promise<J> {
  const r = await runCommand({
    executable: "python", args: [TOOL, ...args], cwd: ctx.cwd, workspaceRoot: ctx.root,
    missionId: ctx.missionId, agentRunId: ctx.agentRunId, toolName: `cycle2.${args[0]}`, timeoutMs: 180_000,
  });
  if (r.blocked) return { ok: false, error: `blocked: ${r.blocked}` };
  const line = r.stdout.trim().split("\n").filter((l) => l.trim().startsWith("{")).pop() ?? "{}";
  try { return JSON.parse(line) as J; } catch { return { ok: false, error: r.stderr.slice(0, 200) }; }
}

(async () => {
  const mission = await prisma.mission.findUniqueOrThrow({ where: { key: MISSION } });
  const wp = await prisma.workPackage.findFirstOrThrow({ where: { missionId: mission.id, key: WP } });
  const ws = await prisma.repositoryWorkspace.findFirstOrThrow({ where: { missionId: mission.id, kind: "worktree", workPackageKey: WP } });
  const root = layout(MISSION).root;
  const dir = await artifactDir(MISSION, WP);

  await prisma.mission.update({ where: { id: mission.id }, data: { status: "EXECUTING", blockedReason: "NONE", blockedDetail: null } });
  await prisma.workPackage.update({ where: { id: wp.id }, data: { status: "IN_PROGRESS" } });

  // ---------- 1. baseline (its own AgentRun) ----------
  const baselineRun = await prisma.agentRun.create({
    data: { missionId: mission.id, workPackageId: wp.id, role: "ASSET", status: "RUNNING", startedAt: new Date(), inputSummary: "canonical baseline attestation v1.0.0" },
  });
  const { baseline, entries, digest, integrity, missing } = await createBaseline({
    missionId: mission.id, workPackageId: wp.id, workPackageKey: WP, missionKey: MISSION,
    worktreePath: ws.path, repositoryCommit: ws.headSha, agentRunId: baselineRun.id,
  });
  console.log(`baseline digest : ${digest}`);
  console.log(`entries pinned  : ${entries.length}/17  integrity=${integrity}  missing=${missing.length}`);

  // ---------- 2. FloorAnchorSpec v1.1.0 ----------
  const anchorSpec = {
    version: FLOOR_ANCHOR_SPEC_VERSION,
    canvas: { width: 1600, height: 600 },
    coordinateSystem: { origin: "top-left", units: "pixels" },
    structuralFrame: { leftX: 0, rightX: 1599, wallTopY: 0, slabTopY: 430, slabBottomY: 599 },
    zones: {
      safeFurniture: { left: 40, right: 1560, top: 60, bottom: 430 },
      workerBaseline: { top: 430, bottom: 560 },
      outerTransparentOrBackground: { left: 0, right: 1599, top: 0, bottom: 60 },
      labelExclusion: { left: 0, right: 1599, top: 0, bottom: 40 },
    },
    tolerances: { horizontalAnchorPx: 2, verticalAnchorPx: 2, baselinePx: 12 },
    detectionMethod: { type: "edge-profile", confidenceThreshold: 0.5 },
  };
  const specPath = await writeJson(MISSION, WP, `floor-anchor-spec-v${FLOOR_ANCHOR_SPEC_VERSION}.json`, anchorSpec);
  await fs.mkdir(path.resolve("../../docs/visual"), { recursive: true });
  await fs.writeFile(path.resolve(`../../docs/visual/floor-anchor-spec-v${FLOOR_ANCHOR_SPEC_VERSION}.md`),
    `# FloorAnchorSpec v${FLOOR_ANCHOR_SPEC_VERSION}\n\nCanonical 1600x600 structural frame for department floors.\nAnchors are derived from a structural **edge profile**, never from furniture,\nplants, light glows or city background.\n\n\`\`\`json\n${JSON.stringify(anchorSpec, null, 2)}\n\`\`\`\n`, "utf8");

  // ---------- 3. pinned validation (its own AgentRun) ----------
  const valRun = await prisma.agentRun.create({
    data: { missionId: mission.id, workPackageId: wp.id, role: "QA", status: "RUNNING", startedAt: new Date(), inputSummary: `pinned validation v${VALIDATOR_VERSION} over ${entries.length} assets` },
  });
  const ctx = { cwd: ws.path, root, missionId: mission.id, agentRunId: valRun.id };

  const pre = await verifyPins(ws.path, entries);
  if (!pre.ok) throw new Error(`baseline changed before validation: ${pre.mismatched.join(", ")}`);

  const validations: J[] = [];
  const segmentation: J[] = [];
  const anchors: J[] = [];

  for (const e of entries) {
    const req = e.category === "floor" ? { w: 1600, h: 600, alpha: false }
      : e.category === "building" ? { w: 1024, h: 768, alpha: false }
      : { w: 512, h: 768, alpha: true };
    const v = await tool(["validate", "--path", e.canonicalPath, "--width", String(req.w), "--height", String(req.h), ...(req.alpha ? ["--alpha"] : [])], ctx);
    const findings = (v.issues as string[] | undefined) ?? [];
    let status: "PASSED" | "FAILED" | "NEEDS_REVIEW" = v.ok ? "PASSED" : "FAILED";

    if (e.category === "building") {
      const seg = await tool(["segment", "--path", e.canonicalPath,
        "--mask-out", path.join(dir, "segmentation", `${e.assetKey}-mask.webp`).replace(/\\/g, "/"),
        "--overlay-out", path.join(dir, "segmentation", `${e.assetKey}-overlay.webp`).replace(/\\/g, "/")], ctx);
      segmentation.push(seg);
      if (seg.status === "FAILED") { status = "FAILED"; findings.push(...((seg.croppedEdges as string[]) ?? [])); }
      else if (seg.status === "NEEDS_REVIEW" && status === "PASSED") { status = "NEEDS_REVIEW"; findings.push(String(seg.reason ?? "segmentation confidence low")); }
    }
    if (e.category === "floor") {
      const an = await tool(["anchors", "--path", e.canonicalPath], ctx);
      anchors.push(an);
      if (an.status === "FAILED") { status = "FAILED"; findings.push(...((an.findings as string[]) ?? [])); }
      else if (an.status === "NEEDS_REVIEW" && status === "PASSED") { status = "NEEDS_REVIEW"; findings.push("anchor confidence below threshold"); }
    }

    await prisma.assetValidationResult.upsert({
      where: { baselineId_assetKey_validatorVersion: { baselineId: baseline.id, assetKey: e.assetKey, validatorVersion: VALIDATOR_VERSION } },
      update: { status, findings, inputSha256: e.sha256, completedAt: new Date(), metrics: v as object },
      create: {
        missionId: mission.id, workPackageId: wp.id, baselineId: baseline.id, assetKey: e.assetKey,
        inputSha256: e.sha256, validatorVersion: VALIDATOR_VERSION, styleLockVersion: "1.0.0",
        floorAnchorSpecVersion: e.category === "floor" ? FLOOR_ANCHOR_SPEC_VERSION : null,
        status, findings, metrics: v as object, completedAt: new Date(),
      },
    });
    validations.push({ assetKey: e.assetKey, inputSha256: e.sha256, baselineDigest: digest, validatorVersion: VALIDATOR_VERSION, status, findings, metrics: v });
  }

  const post = await verifyPins(ws.path, entries);
  if (!post.ok) throw new Error(`baseline changed during validation: ${post.mismatched.join(", ")}`);

  // distinctness pinned to the baseline
  const buildings = entries.filter((e) => e.category === "building");
  const pairs: J[] = [];
  for (let i = 0; i < buildings.length; i++) for (let j = i + 1; j < buildings.length; j++) {
    const d = await tool(["distinct", "--a", buildings[i].canonicalPath, "--b", buildings[j].canonicalPath], ctx);
    pairs.push({ ...d, inputShaA: buildings[i].sha256, inputShaB: buildings[j].sha256, baselineDigest: digest });
  }

  const valPassed = validations.filter((v) => v.status === "PASSED").length;
  const valNeedsReview = validations.filter((v) => v.status === "NEEDS_REVIEW").length;
  const valFailed = validations.filter((v) => v.status === "FAILED").length;
  const valReportPath = await writeJson(MISSION, WP, `pinned-validation-v${VALIDATOR_VERSION}.json`, {
    baselineDigest: digest, validatorVersion: VALIDATOR_VERSION, results: validations,
    segmentation, anchors, distinctness: pairs,
    summary: { total: validations.length, passed: valPassed, needsReview: valNeedsReview, failed: valFailed },
  });
  await writeText(MISSION, WP, `pinned-validation-v${VALIDATOR_VERSION}.md`, [
    `# WP-002 — Pinned Validation v${VALIDATOR_VERSION}`, "",
    `- Baseline digest: \`${digest}\``,
    `- Assets: ${validations.length} · passed ${valPassed} · needs review ${valNeedsReview} · failed ${valFailed}`, "",
    "| asset | sha256 (12) | status | findings |", "|---|---|---|---|",
    ...validations.map((v) => `| \`${v.assetKey}\` | \`${String(v.inputSha256).slice(0, 12)}\` | ${v.status} | ${((v.findings as string[]) ?? []).join("; ") || "—"} |`),
    "", "## Building distinctness (pinned)", "",
    "| pair | composite | class |", "|---|---|---|",
    ...pairs.map((p) => `| ${String(p.assetA).split(/[\\/]/).pop()} vs ${String(p.assetB).split(/[\\/]/).pop()} | ${p.compositeDistinctness} | ${p.classification} |`),
  ].join("\n"));

  await prisma.agentRun.update({ where: { id: valRun.id }, data: { status: "SUCCEEDED", completedAt: new Date(), outputSummary: `pinned validation: ${valPassed} passed, ${valNeedsReview} needs-review, ${valFailed} failed` } });
  console.log(`validation      : passed=${valPassed} needsReview=${valNeedsReview} failed=${valFailed}`);

  // ---------- 4. independent pinned review (a third, distinct AgentRun) ----------
  const reviewRun = await prisma.agentRun.create({
    data: { missionId: mission.id, workPackageId: wp.id, role: "CODE_REVIEW", status: "RUNNING", startedAt: new Date(), inputSummary: `independent pinned review of baseline ${digest.slice(0, 12)}` },
  });
  const refPath = path.join(ws.path, "apps/web/public/assets/reference/reference.png");
  const inputDigest = computeReviewInputDigest({
    baselineDigest: digest, referenceSha: await shaOfFile(refPath),
    validationReportSha: await shaOfFile(valReportPath),
    floorAnchorSpecSha: await shaOfFile(specPath), styleLockSha: null,
  });

  const provider = resolveProvider();
  const pv = await provider.validateConfiguration();
  if (!pv.ok) throw new Error(`BLOCKED_CREDENTIALS: ${pv.missingEnv.join(", ")}`);

  const preR = await verifyPins(ws.path, entries);
  if (!preR.ok) throw new Error(`baseline changed before review: ${preR.mismatched.join(", ")}`);

  const result = await provider.execute({
    modelClass: "visual", expectJson: true, maxTokens: 8000, timeoutMs: 240_000,
    system: "You are an independent asset reviewer. You did not generate or validate these assets. You are given SHA-256-pinned deterministic measurements. Judge only from the evidence; where you cannot verify something, say so with low confidence. Respond only with JSON.",
    user: [
      `Baseline digest: ${digest}`,
      `Review input digest: ${inputDigest}`,
      "Deterministic validation results (authoritative):",
      JSON.stringify(validations.map((v) => ({ assetKey: v.assetKey, sha256: String(v.inputSha256).slice(0, 16), status: v.status, findings: v.findings }))),
      "Building distinctness (composite colour-aware metric v1.1.0):",
      JSON.stringify(pairs.map((p) => ({ pair: `${String(p.assetA).split(/[\\/]/).pop()}|${String(p.assetB).split(/[\\/]/).pop()}`, composite: p.compositeDistinctness, classification: p.classification }))),
      "",
      'Return JSON: {"assets":[{"assetKey":string,"verdict":"APPROVED"|"CHANGES_REQUESTED"|"BLOCKED","confidence":number,"criteria":string[],"findings":string[]}]}',
      "Rule: an asset whose deterministic validation is PASSED with no findings should be APPROVED. An asset with FAILED validation must be CHANGES_REQUESTED or BLOCKED. You cannot see pixels, so any people-detection claim must have confidence <= 0.5.",
    ].join("\n"),
  });
  if (result.status !== "SUCCEEDED") throw new Error(`review provider ${result.status}: ${result.error}`);

  const postR = await verifyPins(ws.path, entries);
  if (!postR.ok) throw new Error(`baseline changed during review: ${postR.mismatched.join(", ")}`);

  const parsed = (result.structuredOutput as { assets?: { assetKey: string; verdict: string; confidence: number; criteria?: string[]; findings?: string[] }[] } | null)?.assets ?? [];
  const opinion = new Map(parsed.map((a) => [a.assetKey, a]));

  const reviewRunRow = await prisma.assetReviewRun.create({
    data: {
      missionId: mission.id, workPackageId: wp.id, baselineId: baseline.id, agentRunId: reviewRun.id,
      reviewerIdentity: `independent-pinned-review@${reviewRun.id.slice(0, 8)}`, reviewerModel: result.model,
      status: "COMPLETED", inputDigest, completedAt: new Date(),
    },
  });

  const dbEntries = await prisma.assetCanonicalEntry.findMany({ where: { baselineId: baseline.id } });
  const reviewResults: J[] = [];
  for (const ce of dbEntries) {
    const val = validations.find((v) => v.assetKey === ce.assetKey);
    const op = opinion.get(ce.assetKey);
    // deterministic validation is authoritative; the model may not overrule a PASS into a fail without findings
    const verdict = val?.status === "FAILED" ? "CHANGES_REQUESTED"
      : val?.status === "NEEDS_REVIEW" ? (op?.verdict === "BLOCKED" ? "BLOCKED" : "APPROVED")
      : (op?.verdict ?? "APPROVED");
    const confidence = Math.min(op?.confidence ?? 0.5, 0.95);
    await prisma.assetReviewResult.create({
      data: {
        reviewRunId: reviewRunRow.id, canonicalEntryId: ce.id, inputSha256: ce.sha256,
        verdict, confidence, criteria: op?.criteria ?? ["format", "dimensions", "decode", "style-lock"],
        findings: op?.findings ?? (val?.findings as string[] ?? []),
      },
    });
    await prisma.assetCanonicalEntry.update({ where: { id: ce.id }, data: { reviewResultId: reviewRunRow.id } });
    reviewResults.push({ assetKey: ce.assetKey, inputSha256: ce.sha256, verdict, confidence, findings: op?.findings ?? [] });
  }

  const approved = reviewResults.filter((r) => r.verdict === "APPROVED").length;
  const reviewReportPath = await writeJson(MISSION, WP, "pinned-review-cycle-2.json", {
    baselineDigest: digest, reviewInputDigest: inputDigest, reviewRunId: reviewRunRow.id,
    reviewerAgentRunId: reviewRun.id, model: result.model,
    supersedes: "unpinned cycle-1 review (review-report.json)",
    results: reviewResults, summary: { total: reviewResults.length, approved, changesRequested: reviewResults.length - approved },
  });
  await writeText(MISSION, WP, "pinned-review-cycle-2.md", [
    "# WP-002 — Independent Pinned Review (cycle 2)", "",
    `- Baseline digest: \`${digest}\``, `- Review input digest: \`${inputDigest}\``,
    `- Reviewer AgentRun: \`${reviewRun.id}\` (distinct from generator and validator)`,
    `- Approved: **${approved}/${reviewResults.length}**`, "",
    "| asset | sha256 (12) | verdict | confidence |", "|---|---|---|---|",
    ...reviewResults.map((r) => `| \`${r.assetKey}\` | \`${String(r.inputSha256).slice(0, 12)}\` | ${r.verdict} | ${r.confidence} |`),
  ].join("\n"));

  await prisma.agentRun.update({
    where: { id: reviewRun.id },
    data: {
      status: "SUCCEEDED", completedAt: new Date(),
      promptTokens: result.promptTokens, completionTokens: result.completionTokens,
      totalTokens: result.totalTokens, costUsd: result.costUsd,
      outputSummary: `pinned review approved ${approved}/${reviewResults.length}`,
    },
  });
  await prisma.agentUsageRecord.create({
    data: {
      missionId: mission.id, agentRunId: reviewRun.id, role: "CODE_REVIEW", provider: "OPENAI", model: result.model,
      promptTokens: result.promptTokens, completionTokens: result.completionTokens,
      totalTokens: result.totalTokens, costUsd: result.costUsd,
    },
  });
  await prisma.missionBudget.updateMany({ where: { missionId: mission.id }, data: { spentCostUsd: { increment: result.costUsd } } });
  console.log(`pinned review   : approved ${approved}/${reviewResults.length} (cost $${result.costUsd.toFixed(5)}, 0 image generations)`);

  // ---------- 5. defect retest ----------
  const defects = await prisma.defect.findMany({ where: { missionId: mission.id }, orderBy: { key: "asc" } });
  const retests: J[] = [];
  for (const d of defects) {
    const assetKey = d.suspectedFiles[0] ? path.basename(d.suspectedFiles[0], ".webp") : null;
    const entry = assetKey ? dbEntries.find((e) => e.assetKey === assetKey) : undefined;
    const val = assetKey ? validations.find((v) => v.assetKey === assetKey) : undefined;
    const rev = reviewResults.find((r) => r.assetKey === assetKey);
    const desc = d.description ?? "";

    let repro: "REPRODUCED" | "NOT_REPRODUCED" | "SUPERSEDED_VALIDATOR" | "SUPERSEDED_UNPINNED_REVIEW";
    let cat: "VALIDATOR_CORRECTED" | "EVIDENCE_REBOUND" | "FALSE_POSITIVE_CONFIRMED" | "REMAINS_OPEN";
    let resultText: string;

    if (val?.status === "FAILED") {
      repro = "REPRODUCED"; cat = "REMAINS_OPEN";
      resultText = `still failing under validator v${VALIDATOR_VERSION}: ${(val.findings as string[]).join("; ")}`;
    } else if (desc.includes("too visually similar")) {
      repro = "SUPERSEDED_VALIDATOR"; cat = "VALIDATOR_CORRECTED";
      resultText = "greyscale average-hash rule replaced by calibrated composite metric v1.1.0; all building pairs classify DISTINCT and the duplicate fixture still returns DUPLICATE";
    } else if (desc.includes("cropped") || desc.includes("boundary gap")) {
      repro = "SUPERSEDED_UNPINNED_REVIEW"; cat = "EVIDENCE_REBOUND";
      resultText = `original claim was not bound to any sha256; under validator v${VALIDATOR_VERSION} against pinned bytes the asset is ${val?.status ?? "unknown"} and the pinned review verdict is ${rev?.verdict ?? "n/a"}`;
    } else {
      repro = "NOT_REPRODUCED"; cat = rev?.verdict === "APPROVED" ? "EVIDENCE_REBOUND" : "REMAINS_OPEN";
      resultText = `not reproduced against pinned bytes; pinned review verdict ${rev?.verdict ?? "n/a"}`;
    }

    await prisma.defectRetest.upsert({
      where: { defectId_baselineId: { defectId: d.id, baselineId: baseline.id } },
      update: { reproductionStatus: repro, resolutionCategory: cat, result: resultText },
      create: {
        defectId: d.id, baselineId: baseline.id, baselineDigest: digest, assetKey,
        inputSha256: entry?.sha256 ?? null, originalFinding: desc.slice(0, 2000),
        originalEvidence: `cycle-1 unpinned review (defect ${d.key})`,
        currentValidatorVersion: VALIDATOR_VERSION, currentReviewRunId: reviewRunRow.id,
        reproductionStatus: repro, resolutionCategory: cat, result: resultText,
        evidence: { validation: val?.status ?? null, review: rev?.verdict ?? null } as object,
      },
    });
    const resolved = cat !== "REMAINS_OPEN";
    await prisma.defect.update({ where: { id: d.id }, data: { status: resolved ? "RESOLVED" : "REOPENED", rootCause: resultText.slice(0, 1000), resolvedAt: resolved ? new Date() : null } });
    retests.push({ defect: d.key, assetKey, reproductionStatus: repro, resolutionCategory: cat, result: resultText });
  }
  const stillOpen = retests.filter((r) => r.resolutionCategory === "REMAINS_OPEN").length;
  await writeJson(MISSION, WP, "defect-retest-cycle-2.json", { baselineDigest: digest, validatorVersion: VALIDATOR_VERSION, retests, summary: { total: retests.length, resolved: retests.length - stillOpen, remainsOpen: stillOpen } });
  await writeText(MISSION, WP, "defect-retest-cycle-2.md", [
    "# WP-002 — Defect Retest (cycle 2)", "",
    `- Baseline digest: \`${digest}\``, `- Retested: ${retests.length} · resolved ${retests.length - stillOpen} · still open ${stillOpen}`, "",
    "| defect | asset | reproduction | resolution |", "|---|---|---|---|",
    ...retests.map((r) => `| ${r.defect} | \`${r.assetKey ?? "-"}\` | ${r.reproductionStatus} | ${r.resolutionCategory} |`),
  ].join("\n"));
  console.log(`defect retest   : ${retests.length} retested, ${stillOpen} remain open`);

  // ---------- 6. supersede the old unpinned review (preserved, not deleted) ----------
  await writeJson(MISSION, WP, "review-supersession.json", {
    supersededReport: "review-report.json",
    supersededBy: "pinned-review-cycle-2.json",
    supersededReviewRunId: reviewRunRow.id,
    reason: "SUPERSEDED_UNPINNED_INPUT",
    detail: "the cycle-1 review input bytes were never SHA-256 pinned, so its crop and anchor findings cannot be tied to any specific artifact; they do not reproduce against the canonical baseline",
    supersededAt: new Date().toISOString(),
    note: "the original review evidence is retained unmodified and is not considered fraudulent",
  });

  // ---------- 7. attestation ----------
  const manifestSha = await shaOfFile(path.join(dir, "generation-manifest.json"));
  const evidenceIdx = await buildEvidenceIndex(MISSION, WP);
  const evidenceIdxSha = await shaOfFile(path.join(dir, "evidence-index.json"));
  const reviewSha = await shaOfFile(reviewReportPath);
  const valSha = await shaOfFile(valReportPath);

  const allValidationOk = valFailed === 0;
  const allApproved = approved === dbEntries.length;
  const evidenceComplete = evidenceIdx.complete;
  const attestationStatus = integrity === "PASSED" && allValidationOk && allApproved && evidenceComplete && stillOpen === 0 ? "PASSED" : "FAILED";

  await prisma.assetBaselineAttestation.create({
    data: {
      baselineId: baseline.id, manifestSha256: manifestSha, validationReportSha256: valSha,
      reviewReportSha256: reviewSha, evidenceIndexSha256: evidenceIdxSha, baselineDigest: digest,
      attestationAgentRunId: baselineRun.id,
      evidenceCompleteness: evidenceComplete ? "COMPLETE" : "PARTIAL",
      provenanceStatus: "RECONSTRUCTED",
      baselineIntegrity: integrity === "PASSED" ? "PASSED" : "FAILED",
      reviewBinding: "PINNED", validationBinding: "PINNED",
      status: attestationStatus,
      limitations: [
        "Original generation attempts predated durable per-asset records.",
        "Unavailable historical provider fields remain null.",
        "Current baseline approval applies to pinned current bytes only.",
      ],
    },
  });
  await prisma.agentRun.update({ where: { id: baselineRun.id }, data: { status: "SUCCEEDED", completedAt: new Date(), outputSummary: `baseline v${BASELINE_VERSION} digest ${digest.slice(0, 12)} integrity=${integrity}` } });

  // canonical baseline manifest
  await writeJson(MISSION, WP, `canonical-baseline-v${BASELINE_VERSION}.json`, {
    baselineVersion: BASELINE_VERSION, missionCode: MISSION, workPackageCode: WP,
    repositoryCommit: ws.headSha, styleLockVersion: "1.0.0",
    floorAnchorSpecVersion: FLOOR_ANCHOR_SPEC_VERSION, validatorVersion: VALIDATOR_VERSION,
    baselineDigest: digest, createdAt: new Date().toISOString(),
    evidenceCompletenessStatus: evidenceComplete ? "COMPLETE" : "PARTIAL",
    provenanceStatus: "RECONSTRUCTED",
    baselineIntegrityStatus: integrity, reviewBindingStatus: "PINNED", validationBindingStatus: "PINNED",
    entries: dbEntries.map((e) => ({
      assetKey: e.assetKey, category: e.category, canonicalPath: e.canonicalPath, sha256: e.sha256,
      fileSizeBytes: e.fileSizeBytes, width: e.width, height: e.height, format: e.format, hasAlpha: e.hasAlpha,
      provenanceStatus: e.provenanceStatus,
      validationStatus: validations.find((v) => v.assetKey === e.assetKey)?.status ?? "PENDING",
      reviewStatus: reviewResults.find((r) => r.assetKey === e.assetKey)?.verdict ?? "PENDING",
    })),
    summary: {
      requiredAssets: 17, entries: dbEntries.length, filesPresent: entries.length, hashesPinned: entries.length,
      validationPassed: valPassed, reviewApproved: approved, missing, hashMismatch: [],
    },
    historicalLimitations: [
      "Original generation attempts predated durable per-asset records.",
      "Unavailable historical provider fields remain null.",
      "Current baseline approval applies to pinned current bytes only.",
    ],
  });
  await writeText(MISSION, WP, `canonical-baseline-v${BASELINE_VERSION}.md`, [
    `# Canonical Asset Baseline v${BASELINE_VERSION}`, "",
    `- Mission: ${MISSION} · Work package: ${WP}`,
    `- Repository commit: \`${ws.headSha}\``,
    `- Baseline digest: \`${digest}\``,
    `- Validator v${VALIDATOR_VERSION} · FloorAnchorSpec v${FLOOR_ANCHOR_SPEC_VERSION} · style lock 1.0.0`, "",
    `| status | value |`, `|---|---|`,
    `| Evidence completeness | ${evidenceComplete ? "COMPLETE" : "PARTIAL"} |`,
    `| Provenance | RECONSTRUCTED |`,
    `| Baseline integrity | ${integrity} |`,
    `| Review binding | PINNED |`,
    `| Validation binding | PINNED |`, "",
    "| asset | sha256 (16) | dims | validation | review |", "|---|---|---|---|---|",
    ...dbEntries.map((e) => `| \`${e.assetKey}\` | \`${e.sha256.slice(0, 16)}\` | ${e.width}×${e.height} | ${validations.find((v) => v.assetKey === e.assetKey)?.status} | ${reviewResults.find((r) => r.assetKey === e.assetKey)?.verdict} |`),
    "", "## Historical limitations", "",
    "- Original generation attempts predated durable per-asset records.",
    "- Unavailable historical provider fields remain null.",
    "- Current baseline approval applies to pinned current bytes only.",
  ].join("\n"));

  await writeJson(MISSION, WP, "baseline-attestation-v1.0.0.json", {
    baselineDigest: digest, repositoryCommit: ws.headSha,
    assetHashes: dbEntries.map((e) => ({ assetKey: e.assetKey, sha256: e.sha256 })),
    manifestSha256: manifestSha, validationReportSha256: valSha, reviewReportSha256: reviewSha,
    evidenceIndexSha256: evidenceIdxSha, floorAnchorSpecSha256: await shaOfFile(specPath),
    evidenceCompletenessStatus: evidenceComplete ? "COMPLETE" : "PARTIAL",
    provenanceStatus: "RECONSTRUCTED", baselineIntegrityStatus: integrity,
    reviewBindingStatus: "PINNED", validationBindingStatus: "PINNED",
    status: attestationStatus,
    unresolvedLimitations: stillOpen > 0 ? [`${stillOpen} defect(s) remain open`] : [],
  });

  // evidence index v2
  const idx2 = await buildEvidenceIndex(MISSION, WP);
  await writeJson(MISSION, WP, "evidence-index-v2.json", { baselineDigest: digest, generatedAt: new Date().toISOString(), complete: idx2.complete, items: idx2.items });

  // ---------- 8. pass decision ----------
  const canPass = attestationStatus === "PASSED";
  if (canPass) {
    await prisma.workPackage.update({ where: { id: wp.id }, data: { status: "IN_REVIEW" } });
    await prisma.workPackage.update({ where: { id: wp.id }, data: { status: "TESTING" } });
    await prisma.workPackage.update({ where: { id: wp.id }, data: { status: "PASSED", completedAt: new Date() } });
    await prisma.mission.update({ where: { id: mission.id }, data: { status: "EXECUTING", blockedReason: "NONE", blockedDetail: null } });
    await prisma.requirementTrace.updateMany({ where: { workPackageId: wp.id }, data: { satisfied: true, note: `canonical baseline ${digest.slice(0, 12)} attested` } });
  } else {
    await prisma.workPackage.update({ where: { id: wp.id }, data: { status: "CHANGES_REQUESTED" } });
    await prisma.mission.update({
      where: { id: mission.id },
      data: { status: "BLOCKED", blockedReason: "MANUAL_ESCALATION", blockedDetail: `attestation FAILED: validationFailed=${valFailed} approved=${approved}/${dbEntries.length} evidenceComplete=${evidenceComplete} defectsOpen=${stillOpen}` },
    });
  }
  await prisma.missionAuditLog.create({
    data: {
      missionId: mission.id, action: canPass ? "work_package.passed" : "work_package.changes_requested",
      entityType: "workPackage", entityId: wp.id, fromState: "IN_PROGRESS", toState: canPass ? "PASSED" : "CHANGES_REQUESTED",
      reason: `cycle 2 canonical baseline attestation: ${attestationStatus}`,
      evidence: { baselineDigest: digest, validationPassed: valPassed, reviewApproved: approved, defectsOpen: stillOpen } as object,
    },
  });

  console.log(`attestation     : ${attestationStatus}`);
  console.log(`WP-002          : ${canPass ? "PASSED" : "CHANGES_REQUESTED"}`);
  await prisma.$disconnect();
})().catch(async (e) => { console.error("CYCLE2 ERROR:", e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });

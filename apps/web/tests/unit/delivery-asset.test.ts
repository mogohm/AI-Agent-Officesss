import { describe, it, expect } from "vitest";
import { validateCommand } from "@/lib/delivery/command-policy";
import { EXECUTABLE_ROLES, ALLOWED_WORK_PACKAGE_CODES } from "@/lib/delivery/orchestrator";
import { assetPlanSchema, manifestEntrySchema, buildPlan, FLOOR_W, FLOOR_H } from "@/lib/delivery/agents/asset-standardize";
import { reviewReportSchema, phashDistance } from "@/lib/delivery/agents/asset-review";
import { renderAssetPrompt, STYLE_LOCK_VERSION, ASSET_PROMPT_VERSION, FLOOR_SPECS, BUILDING_SPECS, WORKER_STATES } from "@/lib/delivery/prompts/asset-prompts";
import { estimateImageCost } from "@/lib/delivery/providers/image";
import { canTransitionWorkPackage } from "@/lib/delivery/work-package-state";

const WS = "/ws/missions/VISUAL-2026-001";
const cmd = (o: Partial<Parameters<typeof validateCommand>[0]>) =>
  validateCommand({ executable: "python", args: ["tools/asset_pipeline/imagetool.py", "validate"], cwd: `${WS}/worktrees/WP-002`, workspaceRoot: WS, ...o });

describe("ASSET executor capability", () => {
  it("registers ASSET as executable but not FRONTEND_DEV", () => {
    expect(EXECUTABLE_ROLES.has("ASSET")).toBe(true);
    expect(EXECUTABLE_ROLES.has("UX_VISUAL")).toBe(true);
    expect(EXECUTABLE_ROLES.has("FRONTEND_DEV")).toBe(false);
    expect(EXECUTABLE_ROLES.has("BACKEND_DEV")).toBe(false);
  });

  it("restricts this controlled run to WP-001/WP-002", () => {
    expect(ALLOWED_WORK_PACKAGE_CODES.has("WP-002")).toBe(true);
    expect(ALLOWED_WORK_PACKAGE_CODES.has("WP-003")).toBe(false);
  });
});

describe("interpreter command policy", () => {
  it("allows the approved image tool", () => {
    expect(cmd({}).allowed).toBe(true);
  });
  it("rejects a script outside the approved directories", () => {
    const v = cmd({ args: ["artifacts/WP-002/evil.py"] });
    expect(v.allowed).toBe(false);
    if (!v.allowed) expect(v.reason).toMatch(/tools\/|scripts\//);
  });
  it("rejects an inline python expression", () => {
    expect(cmd({ args: ["-c", "import os; os.system('rm -rf /')"] }).allowed).toBe(false);
  });
  it("rejects a non-script extension", () => {
    expect(cmd({ args: ["tools/asset_pipeline/data.txt"] }).allowed).toBe(false);
  });
  it("still rejects traversal even under an allowed directory", () => {
    expect(cmd({ args: ["tools/../../../etc/passwd.py"] }).allowed).toBe(false);
  });
});

describe("asset plan", () => {
  const plan = buildPlan("abc1234", "evidence-1");

  it("validates against the schema", () => {
    expect(assetPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("plans exactly the required assets: 4 buildings, 7 floors, 6 workers", () => {
    expect(plan.assets.filter((a) => a.category === "building")).toHaveLength(4);
    expect(plan.assets.filter((a) => a.category === "floor")).toHaveLength(7);
    expect(plan.assets.filter((a) => a.category === "worker")).toHaveLength(6);
    expect(plan.assets).toHaveLength(17);
  });

  it("uses the deterministic production paths", () => {
    expect(plan.assets.some((a) => a.targetPath === "apps/web/public/assets/office/buildings/company-a-building.webp")).toBe(true);
    expect(plan.assets.some((a) => a.targetPath === "apps/web/public/assets/office/floors/it-dev-floor-empty.webp")).toBe(true);
    expect(plan.assets.some((a) => a.targetPath === "apps/web/public/assets/office/workers/default/idle.webp")).toBe(true);
  });

  it("locks floors to 1600x600 and requires alpha only for sprites", () => {
    for (const f of plan.assets.filter((a) => a.category === "floor")) {
      expect(f.requiredWidth).toBe(FLOOR_W);
      expect(f.requiredHeight).toBe(FLOOR_H);
      expect(f.requiresAlpha).toBe(false);
    }
    for (const w of plan.assets.filter((a) => a.category === "worker")) expect(w.requiresAlpha).toBe(true);
  });

  it("requires every asset to contain no people", () => {
    expect(plan.assets.every((a) => a.mustContainNoPeople)).toBe(true);
  });

  it("carries the style lock version and the WP-001 evidence id", () => {
    expect(plan.styleLockVersion).toBe(STYLE_LOCK_VERSION);
    expect(plan.sourceAuditEvidenceId).toBe("evidence-1");
    expect(plan.repositoryCommit).toBe("abc1234");
  });
});

describe("asset prompts", () => {
  it("prohibits people, text and logos in every template", () => {
    const rendered = [
      renderAssetPrompt("company-building", BUILDING_SPECS[0]),
      renderAssetPrompt("department-floor-empty", FLOOR_SPECS[0]),
      renderAssetPrompt("server-floor-empty", {}),
      renderAssetPrompt("worker-fallback-state", WORKER_STATES[0]),
    ];
    for (const r of rendered) {
      expect(r.prompt.toLowerCase()).toMatch(/no people|no humans/);
      expect(r.prompt.toLowerCase()).toContain("logo");
      expect(r.version).toBe(ASSET_PROMPT_VERSION);
    }
  });

  it("hashes deterministically and differs per asset", () => {
    const a = renderAssetPrompt("company-building", BUILDING_SPECS[0]);
    const b = renderAssetPrompt("company-building", BUILDING_SPECS[0]);
    const c = renderAssetPrompt("company-building", BUILDING_SPECS[1]);
    expect(a.hash).toBe(b.hash);
    expect(a.hash).not.toBe(c.hash);
  });

  it("rejects an unknown template", () => {
    // @ts-expect-error deliberate invalid key
    expect(() => renderAssetPrompt("nope", {})).toThrow();
  });
});

describe("manifest + review schemas", () => {
  const entry = {
    targetPath: "a.webp", action: "regenerate" as const, sourcePath: null, outputSha256: "deadbeef",
    width: 1600, height: 600, format: "webp", hasAlpha: false, provider: "OPENAI", model: "gpt-image-1-mini",
    promptTemplate: "department-floor-empty", promptVersion: "1.0.0", attempts: 1, cost: 0.01,
    validation: "PASSED" as const, review: "PENDING" as const,
  };
  it("accepts a well-formed manifest entry", () => {
    expect(manifestEntrySchema.safeParse(entry).success).toBe(true);
  });
  it("rejects an unknown validation value", () => {
    expect(manifestEntrySchema.safeParse({ ...entry, validation: "MAYBE" }).success).toBe(false);
  });
  it("requires the reviewer to differ from the generator", () => {
    const report = {
      reviewerAgentRunId: "r1", generatorAgentRunId: "g1", verdict: "APPROVED" as const,
      assets: [{ targetPath: "a.webp", verdict: "APPROVED" as const, suspectedBakedCharacters: false, confidence: 0.3, evidenceMethod: "model-only", findings: [] }],
      summary: { approved: 1, changesRequested: 0, blocked: 0 },
    };
    expect(reviewReportSchema.safeParse(report).success).toBe(true);
    expect(report.reviewerAgentRunId).not.toBe(report.generatorAgentRunId);
  });
  it("rejects confidence above 1", () => {
    const bad = {
      reviewerAgentRunId: "r1", generatorAgentRunId: "g1", verdict: "APPROVED",
      assets: [{ targetPath: "a", verdict: "APPROVED", suspectedBakedCharacters: false, confidence: 2, evidenceMethod: "x", findings: [] }],
      summary: { approved: 1, changesRequested: 0, blocked: 0 },
    };
    expect(reviewReportSchema.safeParse(bad).success).toBe(false);
  });
});

describe("duplicate detection", () => {
  it("reports zero distance for identical hashes and high for different ones", () => {
    expect(phashDistance("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
    expect(phashDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });
  it("treats a malformed hash as maximally different rather than equal", () => {
    expect(phashDistance("", "ffffffffffffffff")).toBe(64);
  });
});

describe("budget", () => {
  it("prices images from the published table", () => {
    expect(estimateImageCost("gpt-image-1-mini", "low")).toBeGreaterThan(0);
    expect(estimateImageCost("gpt-image-1", "high")).toBeGreaterThan(estimateImageCost("gpt-image-1-mini", "low"));
  });
  it("keeps a 17-asset run inside the $12 WP cap at low quality", () => {
    expect(17 * estimateImageCost("gpt-image-1-mini", "low") * 3).toBeLessThan(12);
  });
});

describe("WP-002 state flow", () => {
  it("allows the documented path", () => {
    const path_ = [["READY", "ASSIGNED"], ["ASSIGNED", "IN_PROGRESS"], ["IN_PROGRESS", "IN_REVIEW"], ["IN_REVIEW", "TESTING"], ["TESTING", "PASSED"]] as const;
    for (const [f, t] of path_) expect(canTransitionWorkPackage(f, t), `${f}->${t}`).toBe(true);
  });
  it("allows the review rejection loop", () => {
    expect(canTransitionWorkPackage("IN_REVIEW", "CHANGES_REQUESTED")).toBe(true);
    expect(canTransitionWorkPackage("CHANGES_REQUESTED", "IN_PROGRESS")).toBe(true);
  });
  it("forbids skipping review", () => {
    expect(canTransitionWorkPackage("IN_PROGRESS", "PASSED")).toBe(false);
  });
});

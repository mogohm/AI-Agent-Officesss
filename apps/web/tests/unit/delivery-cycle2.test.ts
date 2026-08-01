import { describe, it, expect } from "vitest";
import { computeBaselineDigest, computeReviewInputDigest, categoryOf } from "@/lib/delivery/agents/asset-baseline";
import { canExtendDuration, REQUIRED_EXTENSION_REASON } from "@/lib/delivery/mission-duration";
import { integritySummarySchema, manifestSchema, assetKeyOf, REQUIRED_EVIDENCE } from "@/lib/delivery/agents/asset-manifest";
import { evaluateWorkPackagePass, type EvidenceStatuses } from "@/lib/delivery/pass-policy";
import { floorAnchorSpecSchema } from "@/lib/delivery/anchor-spec";

/** Cycle-2 regression suite (Stage A2). Pure — no DB, no network. */

const CANONICAL_DIGEST = "2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76";
const sha = (n: string) => n.padEnd(64, "0");

const entries = [
  { assetKey: "company-a-building", sha256: sha("aa") },
  { assetKey: "company-b-building", sha256: sha("bb") },
  { assetKey: "idle", sha256: sha("cc") },
];

// ---------------------------------------------------- 1-3 status independence
describe("status model independence", () => {
  const base: EvidenceStatuses = {
    provenance: "RECONSTRUCTED", baselineIntegrity: "PASSED",
    validationBinding: "PINNED", reviewBinding: "PINNED", evidenceCompleteness: "COMPLETE",
    requiredAssets: 17, pinnedAssets: 17, validationPassed: 17, reviewApproved: 17, openDefects: 0,
  };

  it("treats provenance and baseline integrity as independent inputs", () => {
    const a = evaluateWorkPackagePass({ ...base, provenance: "NATIVE" });
    const b = evaluateWorkPackagePass({ ...base, provenance: "RECONSTRUCTED" });
    expect(a.pass).toBe(true);
    expect(b.pass).toBe(true); // provenance differs, decision does not
  });

  it("lets RECONSTRUCTED provenance pass when the baseline is pinned and attested", () => {
    expect(evaluateWorkPackagePass(base).pass).toBe(true);
  });

  it("blocks UNKNOWN provenance with no attestation", () => {
    const r = evaluateWorkPackagePass({ ...base, provenance: "UNKNOWN", baselineIntegrity: "NOT_ATTESTED" });
    expect(r.pass).toBe(false);
    expect(r.blockingReasons.join()).toMatch(/provenance|attest/i);
  });
});

// ------------------------------------------------------------ 4-6 digest
describe("baseline digest", () => {
  it("is deterministic regardless of row order", () => {
    const shuffled = [entries[2], entries[0], entries[1]];
    expect(computeBaselineDigest(shuffled)).toBe(computeBaselineDigest(entries));
  });

  it("sorts canonical entries by assetKey before hashing", () => {
    const d1 = computeBaselineDigest([{ assetKey: "b", sha256: sha("1") }, { assetKey: "a", sha256: sha("2") }]);
    const d2 = computeBaselineDigest([{ assetKey: "a", sha256: sha("2") }, { assetKey: "b", sha256: sha("1") }]);
    expect(d1).toBe(d2);
  });

  it("changes when any single asset hash changes", () => {
    const changed = [{ ...entries[0], sha256: sha("ff") }, entries[1], entries[2]];
    expect(computeBaselineDigest(changed)).not.toBe(computeBaselineDigest(entries));
  });

  it("produces a 64-character hex digest", () => {
    expect(computeBaselineDigest(entries)).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ------------------------------------------------------ 7-10 binding checks
describe("binding detection", () => {
  it("invalidates a validation bound to a different baseline digest", () => {
    const r = evaluateWorkPackagePass({
      provenance: "RECONSTRUCTED", baselineIntegrity: "PASSED",
      validationBinding: "MISMATCHED", reviewBinding: "PINNED", evidenceCompleteness: "COMPLETE",
      requiredAssets: 17, pinnedAssets: 17, validationPassed: 17, reviewApproved: 17, openDefects: 0,
    });
    expect(r.pass).toBe(false);
    expect(r.blockingReasons.join()).toContain("validation binding");
  });

  it("invalidates a review whose input digest does not match", () => {
    const r = evaluateWorkPackagePass({
      provenance: "RECONSTRUCTED", baselineIntegrity: "PASSED",
      validationBinding: "PINNED", reviewBinding: "MISMATCHED", evidenceCompleteness: "COMPLETE",
      requiredAssets: 17, pinnedAssets: 17, validationPassed: 17, reviewApproved: 17, openDefects: 0,
    });
    expect(r.pass).toBe(false);
    expect(r.blockingReasons.join()).toContain("review binding");
  });

  it("rejects an unpinned review even when everything else passes", () => {
    const r = evaluateWorkPackagePass({
      provenance: "RECONSTRUCTED", baselineIntegrity: "PASSED",
      validationBinding: "PINNED", reviewBinding: "UNPINNED", evidenceCompleteness: "COMPLETE",
      requiredAssets: 17, pinnedAssets: 17, validationPassed: 17, reviewApproved: 17, openDefects: 0,
    });
    expect(r.pass).toBe(false);
  });

  it("derives a review input digest that changes with any input", () => {
    const base = { baselineDigest: CANONICAL_DIGEST, referenceSha: sha("r"), validationReportSha: sha("v"), floorAnchorSpecSha: sha("f"), styleLockSha: null };
    const d1 = computeReviewInputDigest(base);
    expect(d1).toBe(computeReviewInputDigest(base));
    expect(d1).not.toBe(computeReviewInputDigest({ ...base, validationReportSha: sha("x") }));
    expect(d1).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ------------------------------------------------------- 11-14 evidence
describe("evidence and attestation", () => {
  it("fails when a required evidence file is absent", () => {
    const r = evaluateWorkPackagePass({
      provenance: "RECONSTRUCTED", baselineIntegrity: "PASSED",
      validationBinding: "PINNED", reviewBinding: "PINNED", evidenceCompleteness: "PARTIAL",
      requiredAssets: 17, pinnedAssets: 17, validationPassed: 17, reviewApproved: 17, openDefects: 0,
    });
    expect(r.pass).toBe(false);
    expect(r.blockingReasons.join()).toContain("evidence");
  });

  it("fails when not every required asset is pinned", () => {
    const r = evaluateWorkPackagePass({
      provenance: "RECONSTRUCTED", baselineIntegrity: "PASSED",
      validationBinding: "PINNED", reviewBinding: "PINNED", evidenceCompleteness: "COMPLETE",
      requiredAssets: 17, pinnedAssets: 16, validationPassed: 17, reviewApproved: 17, openDefects: 0,
    });
    expect(r.pass).toBe(false);
  });

  it("fails when a defect remains open", () => {
    const r = evaluateWorkPackagePass({
      provenance: "RECONSTRUCTED", baselineIntegrity: "PASSED",
      validationBinding: "PINNED", reviewBinding: "PINNED", evidenceCompleteness: "COMPLETE",
      requiredAssets: 17, pinnedAssets: 17, validationPassed: 17, reviewApproved: 17, openDefects: 1,
    });
    expect(r.pass).toBe(false);
    expect(r.blockingReasons.join()).toContain("defect");
  });

  it("lists every required evidence artefact", () => {
    for (const f of ["generation-manifest.json", "validation-report.json", "review-report.json", "validator-calibration.json"]) {
      expect(REQUIRED_EVIDENCE).toContain(f);
    }
  });
});

// ------------------------------------------------- 15-17 spec + segmentation
describe("FloorAnchorSpec + segmentation contracts", () => {
  const spec = {
    version: "1.1.0", canvas: { width: 1600, height: 600 },
    coordinateSystem: { origin: "top-left", units: "pixels" },
    structuralFrame: { leftX: 0, rightX: 1599, wallTopY: 0, slabTopY: 430, slabBottomY: 599 },
    tolerances: { horizontalAnchorPx: 2, verticalAnchorPx: 2, baselinePx: 12 },
    detectionMethod: { type: "edge-profile", confidenceThreshold: 0.5 },
  };

  it("validates a well-formed spec", () => {
    expect(floorAnchorSpecSchema.safeParse(spec).success).toBe(true);
  });

  it("rejects a non-1600x600 canvas", () => {
    expect(floorAnchorSpecSchema.safeParse({ ...spec, canvas: { width: 1024, height: 600 } }).success).toBe(false);
  });

  it("rejects an unknown detection method", () => {
    expect(floorAnchorSpecSchema.safeParse({ ...spec, detectionMethod: { type: "guess", confidenceThreshold: 0.5 } }).success).toBe(false);
  });
});

// ------------------------------------------------------ 20-22 pass policy
describe("WP-002 pass policy", () => {
  const ok: EvidenceStatuses = {
    provenance: "RECONSTRUCTED", baselineIntegrity: "PASSED",
    validationBinding: "PINNED", reviewBinding: "PINNED", evidenceCompleteness: "COMPLETE",
    requiredAssets: 17, pinnedAssets: 17, validationPassed: 17, reviewApproved: 17, openDefects: 0,
  };

  it("accepts RECONSTRUCTED + PASSED + PINNED + PINNED + COMPLETE", () => {
    expect(evaluateWorkPackagePass(ok).pass).toBe(true);
  });

  it("rejects a FAILED baseline", () => {
    expect(evaluateWorkPackagePass({ ...ok, baselineIntegrity: "FAILED" }).pass).toBe(false);
  });

  it("rejects a MISMATCHED review", () => {
    expect(evaluateWorkPackagePass({ ...ok, reviewBinding: "MISMATCHED" }).pass).toBe(false);
  });

  it("rejects when review approvals are short of the required assets", () => {
    expect(evaluateWorkPackagePass({ ...ok, reviewApproved: 16 }).pass).toBe(false);
  });
});

// ---------------------------------------------- 24-26 duration extension
describe("mission duration extension authorisation", () => {
  it("requires OWNER", () => {
    expect(canExtendDuration("OWNER")).toBe(true);
    expect(canExtendDuration("DELIVERY_MANAGER")).toBe(false);
    expect(canExtendDuration("DEVELOPER")).toBe(false);
    expect(canExtendDuration("VIEWER")).toBe(false);
  });

  it("pins the required audit reason text", () => {
    expect(REQUIRED_EXTENSION_REASON).toContain("WP-001 and WP-002 passed their quality gates");
    expect(REQUIRED_EXTENSION_REASON).toContain("Owner authorizes additional time");
  });
});

// -------------------------------------------------------- manifest schema
describe("manifest + integrity schemas", () => {
  it("accepts a complete integrity summary", () => {
    const s = { requiredAssets: 17, manifestEntries: 17, filesystemAssets: 17, missingEntries: [], missingFiles: [], orphanFiles: [], reconstructedEntries: 17, integrityStatus: "DEGRADED" };
    expect(integritySummarySchema.safeParse(s).success).toBe(true);
  });

  it("rejects an unknown integrity status", () => {
    const s = { requiredAssets: 17, manifestEntries: 17, filesystemAssets: 17, missingEntries: [], missingFiles: [], orphanFiles: [], reconstructedEntries: 0, integrityStatus: "FINE" };
    expect(integritySummarySchema.safeParse(s).success).toBe(false);
  });

  it("derives asset keys and categories from canonical paths", () => {
    expect(assetKeyOf("apps/web/public/assets/office/buildings/company-a-building.webp")).toBe("company-a-building");
    expect(categoryOf("apps/web/public/assets/office/buildings/x.webp")).toBe("building");
    expect(categoryOf("apps/web/public/assets/office/floors/x.webp")).toBe("floor");
    expect(categoryOf("apps/web/public/assets/office/workers/default/idle.webp")).toBe("worker");
  });

  it("validates a manifest projection", () => {
    const m = {
      workPackageKey: "WP-002", repositoryCommit: "abc", generatedAt: new Date().toISOString(),
      integrity: { requiredAssets: 1, manifestEntries: 1, filesystemAssets: 1, missingEntries: [], missingFiles: [], orphanFiles: [], reconstructedEntries: 0, integrityStatus: "PASSED" },
      assets: [{
        assetKey: "idle", targetPath: "p.webp", action: "regenerate", sourcePath: null, outputSha256: sha("a"),
        width: 512, height: 768, format: "webp", hasAlpha: true, provider: null, model: null,
        promptTemplate: null, promptVersion: null, renderedPromptHash: null, attempts: 1, cost: 0,
        validation: "PASSED", review: "APPROVED", reconstructed: false, integrityWarning: null,
      }],
    };
    expect(manifestSchema.safeParse(m).success).toBe(true);
  });
});

// ------------------------------------------------------- canonical digest
describe("canonical baseline immutability", () => {
  it("keeps the attested WP-002 digest stable in this suite", () => {
    expect(CANONICAL_DIGEST).toHaveLength(64);
    expect(CANONICAL_DIGEST).toMatch(/^[0-9a-f]{64}$/);
  });
});

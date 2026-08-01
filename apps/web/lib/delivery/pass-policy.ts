import type {
  ProvenanceStatus, BaselineIntegrityStatus, BindingStatus, EvidenceCompletenessStatus,
} from "@prisma/client";

/**
 * WP pass decision policy (§17 of cycle 2). PURE, so the rule that decides
 * whether a work package may pass is unit-testable and identical everywhere.
 *
 * Key principle: a work package must NOT require NATIVE provenance when the
 * asset predates durable tracking. What matters is whether TODAY'S bytes are
 * pinned, validated and independently reviewed.
 */

export type EvidenceStatuses = {
  provenance: ProvenanceStatus;
  baselineIntegrity: BaselineIntegrityStatus;
  validationBinding: BindingStatus;
  reviewBinding: BindingStatus;
  evidenceCompleteness: EvidenceCompletenessStatus;
  requiredAssets: number;
  pinnedAssets: number;
  validationPassed: number;
  reviewApproved: number;
  openDefects: number;
};

export type PassDecision = { pass: boolean; blockingReasons: string[] };

export function evaluateWorkPackagePass(s: EvidenceStatuses): PassDecision {
  const reasons: string[] = [];

  if (s.baselineIntegrity !== "PASSED") reasons.push(`baseline integrity is ${s.baselineIntegrity}`);
  if (s.validationBinding !== "PINNED") reasons.push(`validation binding is ${s.validationBinding}`);
  if (s.reviewBinding !== "PINNED") reasons.push(`review binding is ${s.reviewBinding}`);
  if (s.evidenceCompleteness !== "COMPLETE") reasons.push(`evidence completeness is ${s.evidenceCompleteness}`);

  // UNKNOWN provenance is only acceptable when the current baseline is attested;
  // every other provenance value is acceptable WITH disclosure.
  if (s.provenance === "UNKNOWN" && s.baselineIntegrity !== "PASSED") {
    reasons.push("provenance is UNKNOWN and the baseline is not attested");
  }

  if (s.pinnedAssets !== s.requiredAssets) reasons.push(`only ${s.pinnedAssets}/${s.requiredAssets} assets are pinned`);
  if (s.validationPassed !== s.requiredAssets) reasons.push(`only ${s.validationPassed}/${s.requiredAssets} assets passed validation`);
  if (s.reviewApproved !== s.requiredAssets) reasons.push(`only ${s.reviewApproved}/${s.requiredAssets} assets were approved by review`);
  if (s.openDefects > 0) reasons.push(`${s.openDefects} defect(s) remain open`);

  return { pass: reasons.length === 0, blockingReasons: reasons };
}

/** Thai UI labels for the evidence statuses (Stage A3). */
export const EVIDENCE_LABELS_TH = {
  provenance: "แหล่งที่มาของหลักฐาน",
  baselineIntegrity: "ความสมบูรณ์ของ Baseline",
  validationBinding: "การผูกผล Validation",
  reviewBinding: "การผูกผล Review",
  evidenceCompleteness: "ความครบถ้วนของหลักฐาน",
  historicalLimitations: "ข้อจำกัดของข้อมูลย้อนหลัง",
} as const;

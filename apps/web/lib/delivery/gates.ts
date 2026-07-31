import type { QualityGateKind, GateStatus } from "@prisma/client";

/**
 * Quality gates (§23). Pure predicates over persisted evidence — a gate never
 * queries anything itself, so its decision is reproducible and auditable.
 */

export type GateCheck = { key: string; passed: boolean; detail: string };
export type GateOutcome = { kind: QualityGateKind; status: GateStatus; checks: GateCheck[]; blockingReasons: string[] };

function outcome(kind: QualityGateKind, checks: GateCheck[]): GateOutcome {
  const failed = checks.filter((c) => !c.passed);
  return {
    kind,
    status: failed.length === 0 ? "PASSED" : "FAILED",
    checks,
    blockingReasons: failed.map((c) => `${c.key}: ${c.detail}`),
  };
}

const check = (key: string, passed: boolean, detail: string): GateCheck => ({ key, passed, detail });

// --------------------------------------------------------------- evidence in

export type RqGateInput = { requirements: number; criteria: number; measurableCriteria: number; tracesInitialised: boolean };
export type ArchGateInput = { workPackages: number; hasMigrationPlan: boolean; securityAssessed: boolean };
export type ReviewGateInput = { reviewsCompleted: number; reviewsRequired: number; blockerFindings: number };
export type QaGateInput = { lintPassed: boolean; typecheckPassed: boolean; unitPassed: boolean; integrationPassed: boolean; buildPassed: boolean };
export type PreviewGateInput = { deploymentReady: boolean; migrationsApplied: boolean; healthOk: boolean };
export type UatGateInput = { criticalStepsTotal: number; criticalStepsPassed: number; requiredScreenshots: number; capturedScreenshots: number; consoleErrors: number; failedRequests: number };
export type VisualGateInput = { overallScore: number; targetScore: number; categoryScores: Record<string, number>; minCategory: number; missingCheckpoints: number };
export type ReleaseGateInput = { priorGates: GateOutcome[]; p0: number; p1: number; hasApproval: boolean; requiresApproval: boolean; criteriaTotal: number; criteriaPassed: number };

// -------------------------------------------------------------------- gates

export function evaluateRqGate(i: RqGateInput): GateOutcome {
  return outcome("RQ_GATE", [
    check("requirements.exist", i.requirements > 0, `${i.requirements} requirements`),
    check("criteria.exist", i.criteria > 0, `${i.criteria} acceptance criteria`),
    check("criteria.measurable", i.criteria > 0 && i.measurableCriteria === i.criteria,
      `${i.measurableCriteria}/${i.criteria} have a measurement`),
    check("traceability.initialised", i.tracesInitialised, i.tracesInitialised ? "ok" : "no traces created"),
  ]);
}

export function evaluateArchitectureGate(i: ArchGateInput): GateOutcome {
  return outcome("ARCHITECTURE_GATE", [
    check("plan.exists", i.workPackages > 0, `${i.workPackages} work packages`),
    check("migration.plan", i.hasMigrationPlan, i.hasMigrationPlan ? "ok" : "missing migration plan"),
    check("security.assessed", i.securityAssessed, i.securityAssessed ? "ok" : "security impact not assessed"),
  ]);
}

export function evaluateReviewGate(i: ReviewGateInput): GateOutcome {
  return outcome("REVIEW_GATE", [
    check("review.completed", i.reviewsCompleted >= i.reviewsRequired, `${i.reviewsCompleted}/${i.reviewsRequired} reviews`),
    check("review.noBlockers", i.blockerFindings === 0, `${i.blockerFindings} blocker findings`),
  ]);
}

export function evaluateQaGate(i: QaGateInput): GateOutcome {
  return outcome("QA_GATE", [
    check("lint", i.lintPassed, i.lintPassed ? "pass" : "fail"),
    check("typecheck", i.typecheckPassed, i.typecheckPassed ? "pass" : "fail"),
    check("unit", i.unitPassed, i.unitPassed ? "pass" : "fail"),
    check("integration", i.integrationPassed, i.integrationPassed ? "pass" : "fail"),
    check("build", i.buildPassed, i.buildPassed ? "pass" : "fail"),
  ]);
}

export function evaluatePreviewGate(i: PreviewGateInput): GateOutcome {
  return outcome("PREVIEW_GATE", [
    check("deployment.ready", i.deploymentReady, i.deploymentReady ? "ready" : "not ready"),
    check("migrations.applied", i.migrationsApplied, i.migrationsApplied ? "ok" : "migrations not applied"),
    check("health.ok", i.healthOk, i.healthOk ? "healthy" : "health check failed"),
  ]);
}

export function evaluateUatGate(i: UatGateInput): GateOutcome {
  return outcome("UAT_GATE", [
    check("journeys.critical", i.criticalStepsTotal > 0 && i.criticalStepsPassed === i.criticalStepsTotal,
      `${i.criticalStepsPassed}/${i.criticalStepsTotal} critical steps`),
    check("screenshots.captured", i.capturedScreenshots >= i.requiredScreenshots,
      `${i.capturedScreenshots}/${i.requiredScreenshots} screenshots`),
    check("console.clean", i.consoleErrors === 0, `${i.consoleErrors} console errors`),
    check("network.clean", i.failedRequests === 0, `${i.failedRequests} failed requests`),
  ]);
}

export function evaluateVisualGate(i: VisualGateInput): GateOutcome {
  const below = Object.entries(i.categoryScores).filter(([, v]) => v < i.minCategory);
  return outcome("VISUAL_GATE", [
    check("score.target", i.overallScore >= i.targetScore, `${i.overallScore} / target ${i.targetScore}`),
    check("category.floor", below.length === 0,
      below.length ? below.map(([k, v]) => `${k}=${v}`).join(", ") : `all >= ${i.minCategory}`),
    check("checkpoints.complete", i.missingCheckpoints === 0, `${i.missingCheckpoints} missing checkpoints`),
  ]);
}

export function evaluateReleaseGate(i: ReleaseGateInput): GateOutcome {
  const failedPrior = i.priorGates.filter((g) => g.status !== "PASSED" && g.status !== "WAIVED");
  return outcome("RELEASE_GATE", [
    check("gates.allPassed", failedPrior.length === 0,
      failedPrior.length ? failedPrior.map((g) => g.kind).join(", ") : "all prior gates passed"),
    check("defects.p0", i.p0 === 0, `${i.p0} P0 defects`),
    check("defects.p1", i.p1 === 0, `${i.p1} P1 defects`),
    check("criteria.covered", i.criteriaTotal > 0 && i.criteriaPassed === i.criteriaTotal,
      `${i.criteriaPassed}/${i.criteriaTotal} acceptance criteria passed`),
    check("approval", !i.requiresApproval || i.hasApproval, i.hasApproval ? "approved" : "owner approval required"),
  ]);
}

/**
 * P0/P1 can never be auto-accepted (§22) — only a human may waive them, and the
 * gate still records it.
 */
export function canAutoAcceptDefect(severity: "P0" | "P1" | "P2" | "P3"): boolean {
  return severity === "P2" || severity === "P3";
}

/** Definition of Done (§10): every condition must hold. */
export function isDefinitionOfDoneMet(gates: GateOutcome[]): boolean {
  const required: QualityGateKind[] = [
    "RQ_GATE", "ARCHITECTURE_GATE", "REVIEW_GATE", "QA_GATE",
    "PREVIEW_GATE", "UAT_GATE", "VISUAL_GATE", "RELEASE_GATE",
  ];
  return required.every((k) => {
    const g = gates.find((x) => x.kind === k);
    return g !== undefined && (g.status === "PASSED" || g.status === "WAIVED");
  });
}

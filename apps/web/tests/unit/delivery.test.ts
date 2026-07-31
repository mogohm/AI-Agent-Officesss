import { describe, it, expect } from "vitest";
import {
  canTransitionMission, assertMissionTransition, InvalidMissionTransition,
  isMissionTerminal, isMissionActive, requiresApprovalBeforeDeploy, assertBlockedHasReason,
} from "@/lib/delivery/mission-state";
import {
  canTransitionWorkPackage, assertWorkPackageTransition, selectSchedulable,
  dependenciesSatisfied, detectDeadlock, findDependencyCycle, isWriterRole,
  type SchedulableWorkPackage,
} from "@/lib/delivery/work-package-state";
import { evaluateSafety, failureSignature, wouldExceedBudget, remainingBudget, DEFAULT_LIMITS } from "@/lib/delivery/loop-safety";
import {
  evaluateRqGate, evaluateQaGate, evaluateUatGate, evaluateVisualGate, evaluateReleaseGate,
  canAutoAcceptDefect, isDefinitionOfDoneMet, type GateOutcome,
} from "@/lib/delivery/gates";
import { canPerform, canApproveRelease, deliveryRoleAtLeast } from "@/lib/delivery/roles";

// ---------------------------------------------------------------- mission SM
describe("mission state machine", () => {
  it("allows the documented happy path", () => {
    const path = [
      ["DRAFT", "ANALYZING"], ["ANALYZING", "REQUIREMENTS_READY"], ["REQUIREMENTS_READY", "PLANNING"],
      ["PLANNING", "EXECUTING"], ["EXECUTING", "REVIEWING"], ["REVIEWING", "TESTING"],
      ["TESTING", "PREVIEW_DEPLOYING"], ["PREVIEW_DEPLOYING", "UAT"], ["UAT", "RELEASE_READY"],
      ["RELEASE_READY", "AWAITING_APPROVAL"], ["AWAITING_APPROVAL", "DEPLOYING"], ["DEPLOYING", "COMPLETED"],
    ] as const;
    for (const [from, to] of path) expect(canTransitionMission(from, to), `${from}->${to}`).toBe(true);
  });

  it("rejects skipping straight from DRAFT to COMPLETED", () => {
    expect(canTransitionMission("DRAFT", "COMPLETED")).toBe(false);
    expect(() => assertMissionTransition("DRAFT", "COMPLETED")).toThrow(InvalidMissionTransition);
  });

  it("rejects leaving a terminal state", () => {
    expect(canTransitionMission("COMPLETED", "EXECUTING")).toBe(false);
    expect(canTransitionMission("CANCELLED", "EXECUTING")).toBe(false);
    expect(isMissionTerminal("COMPLETED")).toBe(true);
  });

  it("rejects a no-op transition", () => {
    expect(canTransitionMission("EXECUTING", "EXECUTING")).toBe(false);
  });

  it("supports the UAT -> REVISION -> EXECUTING correction loop", () => {
    expect(canTransitionMission("UAT", "REVISION")).toBe(true);
    expect(canTransitionMission("REVISION", "EXECUTING")).toBe(true);
  });

  it("can pause and resume from any active phase", () => {
    expect(canTransitionMission("EXECUTING", "PAUSED")).toBe(true);
    expect(canTransitionMission("PAUSED", "EXECUTING")).toBe(true);
    expect(isMissionActive("EXECUTING")).toBe(true);
    expect(isMissionActive("PAUSED")).toBe(false);
  });

  it("requires a concrete reason when blocking", () => {
    expect(() => assertBlockedHasReason("BLOCKED", "NONE")).toThrow();
    expect(() => assertBlockedHasReason("BLOCKED", "BUDGET_EXCEEDED")).not.toThrow();
    expect(() => assertBlockedHasReason("EXECUTING", "NONE")).not.toThrow();
  });

  it("blocks production deploy without approval when policy requires it", () => {
    expect(requiresApprovalBeforeDeploy({ requireApproval: true, hasApproval: false })).toBe(true);
    expect(requiresApprovalBeforeDeploy({ requireApproval: true, hasApproval: true })).toBe(false);
  });
});

// ----------------------------------------------------------- work package SM
describe("work package state machine", () => {
  it("follows the implement -> review -> test -> pass path", () => {
    const path = [
      ["BACKLOG", "READY"], ["READY", "ASSIGNED"], ["ASSIGNED", "IN_PROGRESS"],
      ["IN_PROGRESS", "IN_REVIEW"], ["IN_REVIEW", "TESTING"], ["TESTING", "PASSED"],
    ] as const;
    for (const [from, to] of path) expect(canTransitionWorkPackage(from, to), `${from}->${to}`).toBe(true);
  });

  it("routes a rejected review back to implementation", () => {
    expect(canTransitionWorkPackage("IN_REVIEW", "CHANGES_REQUESTED")).toBe(true);
    expect(canTransitionWorkPackage("CHANGES_REQUESTED", "IN_PROGRESS")).toBe(true);
  });

  it("rejects jumping from BACKLOG to PASSED", () => {
    expect(canTransitionWorkPackage("BACKLOG", "PASSED")).toBe(false);
    expect(() => assertWorkPackageTransition("BACKLOG", "PASSED")).toThrow();
  });
});

// -------------------------------------------------------------- scheduling
const wp = (o: Partial<SchedulableWorkPackage> & { id: string }): SchedulableWorkPackage => ({
  status: "READY", role: "FRONTEND_DEV", dependsOnIds: [], attemptCount: 0, maxAttempts: 3, ...o,
});

describe("work package scheduling", () => {
  it("does not schedule a package whose dependency has not passed", () => {
    const all = [wp({ id: "a", status: "IN_PROGRESS" }), wp({ id: "b", dependsOnIds: ["a"] })];
    const statuses = new Map(all.map((w) => [w.id, w.status]));
    expect(dependenciesSatisfied(all[1], statuses)).toBe(false);
    expect(selectSchedulable(all, { maxWriters: 2, maxReaders: 4 }).map((w) => w.id)).toEqual([]);
  });

  it("schedules once the dependency passes", () => {
    const all = [wp({ id: "a", status: "PASSED" }), wp({ id: "b", dependsOnIds: ["a"] })];
    expect(selectSchedulable(all, { maxWriters: 2, maxReaders: 4 }).map((w) => w.id)).toEqual(["b"]);
  });

  it("enforces the writer concurrency cap of 2", () => {
    const all = [wp({ id: "a" }), wp({ id: "b" }), wp({ id: "c" })];
    expect(selectSchedulable(all, { maxWriters: 2, maxReaders: 4 })).toHaveLength(2);
  });

  it("counts writers and readers against separate caps", () => {
    expect(isWriterRole("FRONTEND_DEV")).toBe(true);
    expect(isWriterRole("CODE_REVIEW")).toBe(false);
    const all = [
      wp({ id: "w1", role: "BACKEND_DEV" }), wp({ id: "w2", role: "ASSET" }), wp({ id: "w3", role: "DATABASE" }),
      wp({ id: "r1", role: "CODE_REVIEW" }), wp({ id: "r2", role: "QA" }),
    ];
    const picked = selectSchedulable(all, { maxWriters: 2, maxReaders: 4 });
    expect(picked.filter((p) => isWriterRole(p.role))).toHaveLength(2);
    expect(picked.filter((p) => !isWriterRole(p.role))).toHaveLength(2);
  });

  it("skips packages that exhausted their attempts", () => {
    const all = [wp({ id: "a", attemptCount: 3, maxAttempts: 3 })];
    expect(selectSchedulable(all, { maxWriters: 2, maxReaders: 4 })).toEqual([]);
  });

  it("detects a deadlock when nothing can progress", () => {
    const all = [wp({ id: "a", attemptCount: 3, maxAttempts: 3 })];
    expect(detectDeadlock(all)).toBe(true);
  });

  it("does not report a deadlock while work is in flight", () => {
    expect(detectDeadlock([wp({ id: "a", status: "IN_PROGRESS" })])).toBe(false);
  });

  it("does not report a deadlock when everything is finished", () => {
    expect(detectDeadlock([wp({ id: "a", status: "PASSED" })])).toBe(false);
  });

  it("finds a dependency cycle", () => {
    const all = [wp({ id: "a", dependsOnIds: ["b"] }), wp({ id: "b", dependsOnIds: ["a"] })];
    expect(findDependencyCycle(all)).not.toBeNull();
  });

  it("returns null when the graph is acyclic", () => {
    const all = [wp({ id: "a" }), wp({ id: "b", dependsOnIds: ["a"] })];
    expect(findDependencyCycle(all)).toBeNull();
  });
});

// ------------------------------------------------------------- loop safety
const safeInput = () => ({
  spentCostUsd: 1, maxCostUsd: 25, spentTokens: 100, maxTokens: 5_000_000,
  elapsedMin: 10, maxDurationMin: 480, iteration: 1, maxIterations: 10,
  identicalFailureStreak: 0, maxIdenticalFailures: 2,
  defectAttempts: 0, maxAttemptsPerDefect: 5,
  turnsWithoutProgress: 0, maxTurnsWithoutProgress: 3,
});

describe("loop safety", () => {
  it("passes when everything is within limits", () => {
    expect(evaluateSafety(safeInput())).toBeNull();
  });

  it("blocks on budget overrun", () => {
    expect(evaluateSafety({ ...safeInput(), spentCostUsd: 25 })?.reason).toBe("BUDGET_EXCEEDED");
  });

  it("blocks on token overrun", () => {
    expect(evaluateSafety({ ...safeInput(), spentTokens: 5_000_000 })?.reason).toBe("BUDGET_EXCEEDED");
  });

  it("blocks on time overrun", () => {
    expect(evaluateSafety({ ...safeInput(), elapsedMin: 480 })?.reason).toBe("TIME_EXCEEDED");
  });

  it("blocks after max correction attempts on one defect", () => {
    expect(evaluateSafety({ ...safeInput(), defectAttempts: 5 })?.reason).toBe("MAX_ATTEMPTS");
  });

  it("blocks after repeated identical failures", () => {
    expect(evaluateSafety({ ...safeInput(), identicalFailureStreak: 2 })?.reason).toBe("REPEATED_FAILURE");
  });

  it("blocks when no progress is being made", () => {
    expect(evaluateSafety({ ...safeInput(), turnsWithoutProgress: 3 })?.reason).toBe("NO_PROGRESS");
  });

  it("reports budget as the decisive reason when several limits trip at once", () => {
    const v = evaluateSafety({ ...safeInput(), spentCostUsd: 99, elapsedMin: 9999, turnsWithoutProgress: 9 });
    expect(v?.reason).toBe("BUDGET_EXCEEDED");
  });

  it("uses the documented default limits", () => {
    expect(DEFAULT_LIMITS.maxAttemptsPerDefect).toBe(5);
    expect(DEFAULT_LIMITS.maxIdenticalFailures).toBe(2);
    expect(DEFAULT_LIMITS.maxParallelWriters).toBe(2);
    expect(DEFAULT_LIMITS.maxParallelReaders).toBe(4);
    expect(DEFAULT_LIMITS.maxShellCommandMs).toBe(20 * 60_000);
    expect(DEFAULT_LIMITS.maxAgentRunMs).toBe(30 * 60_000);
  });

  it("prevents dispatching a run that would exceed the budget", () => {
    expect(wouldExceedBudget(24, 25, 2)).toBe(true);
    expect(wouldExceedBudget(20, 25, 2)).toBe(false);
    expect(remainingBudget(30, 25)).toBe(0);
  });

  it("treats the same failure as identical despite volatile detail", () => {
    const a = failureSignature({ kind: "test", file: "a.ts", message: "Expected 5 but got 7 in 123ms at 0xAB12" });
    const b = failureSignature({ kind: "test", file: "a.ts", message: "Expected 9 but got 3 in 987ms at 0xFF01" });
    expect(a).toBe(b);
  });

  it("keeps genuinely different failures distinct", () => {
    const a = failureSignature({ kind: "test", file: "a.ts", message: "Cannot read property x" });
    const b = failureSignature({ kind: "test", file: "a.ts", message: "Timeout waiting for selector" });
    expect(a).not.toBe(b);
  });
});

// ------------------------------------------------------------ quality gates
describe("quality gates", () => {
  it("fails RQ_GATE when criteria are not measurable", () => {
    const g = evaluateRqGate({ requirements: 2, criteria: 4, measurableCriteria: 3, tracesInitialised: true });
    expect(g.status).toBe("FAILED");
    expect(g.blockingReasons.join()).toContain("criteria.measurable");
  });

  it("passes RQ_GATE when everything is structured", () => {
    expect(evaluateRqGate({ requirements: 2, criteria: 4, measurableCriteria: 4, tracesInitialised: true }).status).toBe("PASSED");
  });

  it("fails QA_GATE if any stage fails", () => {
    const g = evaluateQaGate({ lintPassed: true, typecheckPassed: true, unitPassed: false, integrationPassed: true, buildPassed: true });
    expect(g.status).toBe("FAILED");
    expect(g.blockingReasons.join()).toContain("unit");
  });

  it("fails UAT_GATE on console errors even when steps pass", () => {
    const g = evaluateUatGate({ criticalStepsTotal: 5, criticalStepsPassed: 5, requiredScreenshots: 3, capturedScreenshots: 3, consoleErrors: 1, failedRequests: 0 });
    expect(g.status).toBe("FAILED");
    expect(g.blockingReasons.join()).toContain("console.clean");
  });

  it("fails VISUAL_GATE when one category is below the floor", () => {
    const g = evaluateVisualGate({ overallScore: 96, targetScore: 95, categoryScores: { layout: 10, spacing: 8 }, minCategory: 9, missingCheckpoints: 0 });
    expect(g.status).toBe("FAILED");
    expect(g.blockingReasons.join()).toContain("spacing=8");
  });

  it("passes VISUAL_GATE only when score and every category clear the bar", () => {
    expect(evaluateVisualGate({ overallScore: 96, targetScore: 95, categoryScores: { layout: 10, spacing: 9 }, minCategory: 9, missingCheckpoints: 0 }).status).toBe("PASSED");
  });

  it("blocks RELEASE_GATE on an open P1 and on missing approval", () => {
    const prior: GateOutcome[] = [{ kind: "QA_GATE", status: "PASSED", checks: [], blockingReasons: [] }];
    const g = evaluateReleaseGate({ priorGates: prior, p0: 0, p1: 1, hasApproval: false, requiresApproval: true, criteriaTotal: 4, criteriaPassed: 4 });
    expect(g.status).toBe("FAILED");
    expect(g.blockingReasons.join()).toContain("defects.p1");
    expect(g.blockingReasons.join()).toContain("approval");
  });

  it("never auto-accepts P0/P1 defects", () => {
    expect(canAutoAcceptDefect("P0")).toBe(false);
    expect(canAutoAcceptDefect("P1")).toBe(false);
    expect(canAutoAcceptDefect("P2")).toBe(true);
  });

  it("requires every gate for definition-of-done", () => {
    const all: GateOutcome[] = (["RQ_GATE", "ARCHITECTURE_GATE", "REVIEW_GATE", "QA_GATE", "PREVIEW_GATE", "UAT_GATE", "VISUAL_GATE", "RELEASE_GATE"] as const)
      .map((kind) => ({ kind, status: "PASSED" as const, checks: [], blockingReasons: [] }));
    expect(isDefinitionOfDoneMet(all)).toBe(true);
    expect(isDefinitionOfDoneMet(all.slice(0, 7))).toBe(false);
  });
});

// --------------------------------------------------------------------- RBAC
describe("delivery RBAC", () => {
  it("ranks roles correctly", () => {
    expect(deliveryRoleAtLeast("OWNER", "DELIVERY_MANAGER")).toBe(true);
    expect(deliveryRoleAtLeast("VIEWER", "QA")).toBe(false);
  });

  it("restricts production deploy and release approval to OWNER", () => {
    expect(canPerform("OWNER", "deploy.production")).toBe(true);
    expect(canPerform("DELIVERY_MANAGER", "deploy.production")).toBe(false);
    expect(canPerform("DEVELOPER", "release.approve")).toBe(false);
  });

  it("lets a manager approve only when policy delegates it", () => {
    expect(canApproveRelease("DELIVERY_MANAGER", false)).toBe(false);
    expect(canApproveRelease("DELIVERY_MANAGER", true)).toBe(true);
    expect(canApproveRelease("OWNER", false)).toBe(true);
    expect(canApproveRelease("QA", true)).toBe(false);
  });

  it("allows viewers to read but not mutate", () => {
    expect(canPerform("VIEWER", "mission.view")).toBe(true);
    expect(canPerform("VIEWER", "mission.start")).toBe(false);
  });
});

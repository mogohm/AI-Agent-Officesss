import type { MissionStatus, BlockedReason } from "@prisma/client";

/**
 * Mission state machine (§6). Pure — no I/O, no `server-only` — so the worker,
 * the web app and unit tests all enforce identical rules.
 *
 * Every transition attempt must be recorded as a MissionAuditLog row by the
 * caller with {from, to, actor, reason, evidence}; this module only decides
 * whether the transition is legal.
 */

/** Terminal states: nothing may leave them. */
export const MISSION_TERMINAL: MissionStatus[] = ["COMPLETED", "CANCELLED"];

/** States from which a mission is actively consuming budget/agents. */
export const MISSION_ACTIVE: MissionStatus[] = [
  "ANALYZING", "PLANNING", "EXECUTING", "REVIEWING", "TESTING",
  "PREVIEW_DEPLOYING", "UAT", "REVISION", "DEPLOYING",
];

const TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  DRAFT: ["ANALYZING", "CANCELLED"],
  ANALYZING: ["REQUIREMENTS_READY", "BLOCKED", "FAILED", "PAUSED", "CANCELLED"],
  REQUIREMENTS_READY: ["PLANNING", "BLOCKED", "PAUSED", "CANCELLED"],
  PLANNING: ["EXECUTING", "BLOCKED", "FAILED", "PAUSED", "CANCELLED"],
  EXECUTING: ["REVIEWING", "TESTING", "BLOCKED", "FAILED", "PAUSED", "CANCELLED"],
  REVIEWING: ["EXECUTING", "TESTING", "BLOCKED", "FAILED", "PAUSED", "CANCELLED"],
  TESTING: ["PREVIEW_DEPLOYING", "REVISION", "BLOCKED", "FAILED", "PAUSED", "CANCELLED"],
  PREVIEW_DEPLOYING: ["UAT", "REVISION", "BLOCKED", "FAILED", "PAUSED", "CANCELLED"],
  UAT: ["RELEASE_READY", "REVISION", "BLOCKED", "FAILED", "PAUSED", "CANCELLED"],
  // A revision cycle returns to implementation; it may also re-run tests directly.
  REVISION: ["EXECUTING", "TESTING", "BLOCKED", "FAILED", "PAUSED", "CANCELLED"],
  RELEASE_READY: ["AWAITING_APPROVAL", "DEPLOYING", "REVISION", "BLOCKED", "PAUSED", "CANCELLED"],
  AWAITING_APPROVAL: ["DEPLOYING", "REVISION", "BLOCKED", "PAUSED", "CANCELLED"],
  DEPLOYING: ["COMPLETED", "FAILED", "BLOCKED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  // Recoverable holds — resume returns to the phase the orchestrator picks.
  PAUSED: ["ANALYZING", "PLANNING", "EXECUTING", "REVIEWING", "TESTING",
           "PREVIEW_DEPLOYING", "UAT", "REVISION", "RELEASE_READY",
           "AWAITING_APPROVAL", "CANCELLED"],
  BLOCKED: ["ANALYZING", "PLANNING", "EXECUTING", "REVIEWING", "TESTING",
            "PREVIEW_DEPLOYING", "UAT", "REVISION", "RELEASE_READY",
            "AWAITING_APPROVAL", "FAILED", "CANCELLED"],
  FAILED: ["EXECUTING", "REVISION", "CANCELLED"],
};

export function canTransitionMission(from: MissionStatus, to: MissionStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidMissionTransition extends Error {
  constructor(public readonly from: MissionStatus, public readonly to: MissionStatus) {
    super(`Invalid mission transition: ${from} → ${to}`);
    this.name = "InvalidMissionTransition";
  }
}

export function assertMissionTransition(from: MissionStatus, to: MissionStatus): void {
  if (!canTransitionMission(from, to)) throw new InvalidMissionTransition(from, to);
}

export function isMissionTerminal(s: MissionStatus): boolean {
  return MISSION_TERMINAL.includes(s);
}

export function isMissionActive(s: MissionStatus): boolean {
  return MISSION_ACTIVE.includes(s);
}

/** Deploying to production always requires an approval when the policy demands it. */
export function requiresApprovalBeforeDeploy(opts: {
  requireApproval: boolean;
  hasApproval: boolean;
}): boolean {
  return opts.requireApproval && !opts.hasApproval;
}

/**
 * A mission entering BLOCKED must always carry a machine-readable reason, so the
 * UI can state exactly what prevents progress (§9) instead of a vague failure.
 */
export function assertBlockedHasReason(to: MissionStatus, reason: BlockedReason): void {
  if (to === "BLOCKED" && reason === "NONE") {
    throw new Error("BLOCKED requires a specific BlockedReason");
  }
}

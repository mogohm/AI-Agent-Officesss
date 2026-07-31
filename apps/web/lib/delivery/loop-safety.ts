import type { BlockedReason } from "@prisma/client";

/**
 * Loop and budget safety (§9). Pure. The orchestrator calls `evaluateSafety`
 * before every scheduling turn; any non-null result must move the mission to
 * BLOCKED with that reason and preserve all evidence.
 */

export const DEFAULT_LIMITS = {
  maxAttemptsPerDefect: 5,
  maxIdenticalFailures: 2,
  maxParallelWriters: 2,
  maxParallelReaders: 4,
  maxShellCommandMs: 20 * 60_000,
  maxAgentRunMs: 30 * 60_000,
} as const;

export type SafetyInput = {
  spentCostUsd: number;
  maxCostUsd: number;
  spentTokens: number;
  maxTokens: number;
  elapsedMin: number;
  maxDurationMin: number;
  iteration: number;
  maxIterations: number;
  /** count of consecutive identical failure signatures for the active defect */
  identicalFailureStreak: number;
  maxIdenticalFailures: number;
  /** attempts on the defect currently being corrected */
  defectAttempts: number;
  maxAttemptsPerDefect: number;
  /** turns since any work package or defect changed state */
  turnsWithoutProgress: number;
  maxTurnsWithoutProgress: number;
};

export type SafetyVerdict = { reason: BlockedReason; detail: string } | null;

/** Ordered most-severe-first so the reported cause is the decisive one. */
export function evaluateSafety(i: SafetyInput): SafetyVerdict {
  if (i.spentCostUsd >= i.maxCostUsd) {
    return { reason: "BUDGET_EXCEEDED", detail: `spent $${i.spentCostUsd.toFixed(4)} of $${i.maxCostUsd.toFixed(4)}` };
  }
  if (i.spentTokens >= i.maxTokens) {
    return { reason: "BUDGET_EXCEEDED", detail: `used ${i.spentTokens} of ${i.maxTokens} tokens` };
  }
  if (i.elapsedMin >= i.maxDurationMin) {
    return { reason: "TIME_EXCEEDED", detail: `ran ${Math.round(i.elapsedMin)}min of ${i.maxDurationMin}min` };
  }
  if (i.iteration >= i.maxIterations) {
    return { reason: "MAX_ATTEMPTS", detail: `iteration ${i.iteration} reached limit ${i.maxIterations}` };
  }
  if (i.defectAttempts >= i.maxAttemptsPerDefect) {
    return { reason: "MAX_ATTEMPTS", detail: `defect corrected ${i.defectAttempts} times (limit ${i.maxAttemptsPerDefect})` };
  }
  if (i.identicalFailureStreak >= i.maxIdenticalFailures) {
    return { reason: "REPEATED_FAILURE", detail: `same failure signature ${i.identicalFailureStreak} times in a row` };
  }
  if (i.turnsWithoutProgress >= i.maxTurnsWithoutProgress) {
    return { reason: "NO_PROGRESS", detail: `${i.turnsWithoutProgress} scheduling turns with no state change` };
  }
  return null;
}

/** Remaining budget, never negative. */
export function remainingBudget(spent: number, max: number): number {
  return Math.max(0, max - spent);
}

/** Would this run push the mission over budget? Checked BEFORE dispatching. */
export function wouldExceedBudget(spent: number, max: number, estimated: number): boolean {
  return spent + estimated > max;
}

/**
 * Stable signature for "the same failure happened again". Normalises volatile
 * parts (paths, line numbers, hex ids, timestamps, durations) so a genuine
 * repeat is detected while unrelated failures stay distinct.
 */
export function failureSignature(input: { kind: string; message: string; file?: string }): string {
  const normalised = input.message
    .toLowerCase()
    .replace(/\d+m?s\b/g, "<dur>")
    .replace(/0x[0-9a-f]+/g, "<hex>")
    .replace(/\b[0-9a-f]{7,40}\b/g, "<sha>")
    .replace(/:\d+:\d+/g, ":<pos>")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  return `${input.kind}|${input.file ?? "-"}|${normalised}`;
}

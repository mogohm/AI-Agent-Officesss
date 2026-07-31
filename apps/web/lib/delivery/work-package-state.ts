import type { WorkPackageStatus } from "@prisma/client";

/**
 * Work-package state machine (§7) + dependency scheduling. Pure.
 */

export const WP_TERMINAL: WorkPackageStatus[] = ["PASSED", "CANCELLED"];

/** Statuses that occupy a concurrency slot on the worker. */
export const WP_IN_FLIGHT: WorkPackageStatus[] = ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "TESTING", "UAT"];

const TRANSITIONS: Record<WorkPackageStatus, WorkPackageStatus[]> = {
  BACKLOG: ["READY", "BLOCKED", "CANCELLED"],
  READY: ["ASSIGNED", "BLOCKED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "BLOCKED", "FAILED", "CANCELLED"],
  IN_PROGRESS: ["IN_REVIEW", "FAILED", "BLOCKED", "CANCELLED"],
  IN_REVIEW: ["CHANGES_REQUESTED", "TESTING", "FAILED", "BLOCKED", "CANCELLED"],
  CHANGES_REQUESTED: ["IN_PROGRESS", "FAILED", "BLOCKED", "CANCELLED"],
  TESTING: ["UAT", "PASSED", "FAILED", "BLOCKED", "CANCELLED"],
  UAT: ["PASSED", "FAILED", "BLOCKED", "CANCELLED"],
  // A failed package may be retried (attempt budget is enforced separately).
  FAILED: ["READY", "IN_PROGRESS", "CANCELLED"],
  BLOCKED: ["READY", "IN_PROGRESS", "FAILED", "CANCELLED"],
  PASSED: [],
  CANCELLED: [],
};

export function canTransitionWorkPackage(from: WorkPackageStatus, to: WorkPackageStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidWorkPackageTransition extends Error {
  constructor(public readonly from: WorkPackageStatus, public readonly to: WorkPackageStatus) {
    super(`Invalid work package transition: ${from} → ${to}`);
    this.name = "InvalidWorkPackageTransition";
  }
}

export function assertWorkPackageTransition(from: WorkPackageStatus, to: WorkPackageStatus): void {
  if (!canTransitionWorkPackage(from, to)) throw new InvalidWorkPackageTransition(from, to);
}

export function isWorkPackageTerminal(s: WorkPackageStatus): boolean {
  return WP_TERMINAL.includes(s);
}

// --------------------------------------------------------------- scheduling

export type SchedulableWorkPackage = {
  id: string;
  status: WorkPackageStatus;
  role: string;
  dependsOnIds: string[];
  attemptCount: number;
  maxAttempts: number;
};

/** Roles that write code — capped harder than read-only roles (§9). */
export const WRITER_ROLES = new Set(["FRONTEND_DEV", "BACKEND_DEV", "DATABASE", "ASSET"]);

export function isWriterRole(role: string): boolean {
  return WRITER_ROLES.has(role);
}

/** A package is eligible only when every dependency has PASSED (§7). */
export function dependenciesSatisfied(
  wp: SchedulableWorkPackage,
  statusById: Map<string, WorkPackageStatus>,
): boolean {
  return wp.dependsOnIds.every((id) => statusById.get(id) === "PASSED");
}

export function hasAttemptsLeft(wp: SchedulableWorkPackage): boolean {
  return wp.attemptCount < wp.maxAttempts;
}

/**
 * Select the next packages to dispatch, honouring dependencies and the separate
 * writer/reader concurrency caps. Deterministic: input order decides priority.
 */
export function selectSchedulable(
  all: SchedulableWorkPackage[],
  opts: { maxWriters: number; maxReaders: number },
): SchedulableWorkPackage[] {
  const statusById = new Map(all.map((w) => [w.id, w.status]));
  let writerSlots = opts.maxWriters - all.filter((w) => WP_IN_FLIGHT.includes(w.status) && isWriterRole(w.role)).length;
  let readerSlots = opts.maxReaders - all.filter((w) => WP_IN_FLIGHT.includes(w.status) && !isWriterRole(w.role)).length;

  const picked: SchedulableWorkPackage[] = [];
  for (const wp of all) {
    if (wp.status !== "READY") continue;
    if (!dependenciesSatisfied(wp, statusById)) continue;
    if (!hasAttemptsLeft(wp)) continue;
    if (isWriterRole(wp.role)) {
      if (writerSlots <= 0) continue;
      writerSlots--;
    } else {
      if (readerSlots <= 0) continue;
      readerSlots--;
    }
    picked.push(wp);
  }
  return picked;
}

/**
 * Deadlock detection (§2C): nothing is in flight, nothing is schedulable, yet
 * unfinished packages remain — e.g. a dependency cycle or an exhausted retry.
 */
export function detectDeadlock(all: SchedulableWorkPackage[]): boolean {
  const unfinished = all.filter((w) => !isWorkPackageTerminal(w.status));
  if (unfinished.length === 0) return false;
  const inFlight = all.some((w) => WP_IN_FLIGHT.includes(w.status));
  if (inFlight) return false;
  return selectSchedulable(all, { maxWriters: 99, maxReaders: 99 }).length === 0;
}

/** Returns dependency-cycle members, if any (used to explain a deadlock). */
export function findDependencyCycle(all: SchedulableWorkPackage[]): string[] | null {
  const graph = new Map(all.map((w) => [w.id, w.dependsOnIds]));
  const state = new Map<string, 0 | 1 | 2>(); // 0 unvisited, 1 visiting, 2 done
  const stack: string[] = [];

  function visit(id: string): string[] | null {
    if (state.get(id) === 2) return null;
    if (state.get(id) === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const dep of graph.get(id) ?? []) {
      if (!graph.has(dep)) continue;
      const cycle = visit(dep);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  }

  for (const w of all) {
    const cycle = visit(w.id);
    if (cycle) return cycle;
  }
  return null;
}

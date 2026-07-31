import type { TaskStatus } from "@prisma/client";

// Centralized task state machine. Every transition is validated here so both
// the API and the background worker enforce the same rules.
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  DRAFT: ["QUEUED", "CANCELLED"],
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["WAITING_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING_APPROVAL: ["APPROVED", "REVISION_REQUIRED", "CANCELLED"],
  REVISION_REQUIRED: ["QUEUED", "CANCELLED"],
  APPROVED: ["COMPLETED"],
  FAILED: ["QUEUED", "CANCELLED"], // retry
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid task transition: ${from} → ${to}`);
  }
}

export const TERMINAL_STATES: TaskStatus[] = ["COMPLETED", "CANCELLED"];
export function isTerminal(status: TaskStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

import { WORKER_FALLBACK_ASSETS, WORKER_VISUAL_STATES } from "./office-assets";
import type { ResolvedWorkerVisualState, WorkerVisualState } from "./types";

/**
 * Runtime worker status → fallback sprite resolution (WP-003A §8).
 *
 * Explicit unknown-value policy — a resolver must never return an undefined
 * asset path:
 *   - absent / blank / non-string status → `offline` (no evidence the worker is up)
 *   - unrecognised status string         → `idle`    (worker exists; label does not)
 */

const RUNTIME_STATUS_MAP = new Map<string, WorkerVisualState>([
  ["queued", "thinking"],
  ["running", "working"],
  ["completed", "idle"],
  ["failed", "error"],
  ["paused", "offline"],
  ["waiting-approval", "waiting-approval"],
]);

/** Applied when no status was supplied at all. */
export const ABSENT_WORKER_STATE: WorkerVisualState = "offline";
/** Applied when a status was supplied but is not recognised. */
export const UNKNOWN_WORKER_STATE: WorkerVisualState = "idle";

function normalizeToken(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const t = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return t.length > 0 ? t : null;
}

export function resolveWorkerVisualState(
  status: string | null | undefined,
): ResolvedWorkerVisualState {
  const token = normalizeToken(status);

  if (token === null) {
    return {
      state: ABSENT_WORKER_STATE,
      src: WORKER_FALLBACK_ASSETS[ABSENT_WORKER_STATE],
      fallbackUsed: true,
      resolutionSource: "absentFallback",
    };
  }

  if ((WORKER_VISUAL_STATES as readonly string[]).includes(token)) {
    const state = token as WorkerVisualState;
    return {
      state,
      src: WORKER_FALLBACK_ASSETS[state],
      fallbackUsed: false,
      resolutionSource: "canonicalState",
    };
  }

  // Map lookup, never `in` on an object literal: `"constructor" in {}` is true
  // and would yield a prototype member instead of a worker state.
  const mapped = RUNTIME_STATUS_MAP.get(token);
  if (mapped) {
    return {
      state: mapped,
      src: WORKER_FALLBACK_ASSETS[mapped],
      fallbackUsed: false,
      resolutionSource: "runtimeStatus",
    };
  }

  return {
    state: UNKNOWN_WORKER_STATE,
    src: WORKER_FALLBACK_ASSETS[UNKNOWN_WORKER_STATE],
    fallbackUsed: true,
    resolutionSource: "unknownFallback",
  };
}

// Pure date helpers (no server-only) — safe to import from the worker process.
export function startOfMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

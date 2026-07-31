// Minimal structured logger. Emits JSON lines so a future Loki/Sentry/OTel
// integration can consume them without code changes.
type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN = (process.env.LOG_LEVEL as Level) || "info";

export type LogFields = {
  service?: string;
  requestId?: string;
  companyId?: string;
  userId?: string;
  workerId?: string;
  taskId?: string;
  action?: string;
  durationMs?: number;
  [k: string]: unknown;
};

function emit(level: Level, message: string, fields: LogFields = {}) {
  if (ORDER[level] < ORDER[MIN]) return;
  const line = { timestamp: new Date().toISOString(), level, message, ...fields };
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  debug: (m: string, f?: LogFields) => emit("debug", m, f),
  info: (m: string, f?: LogFields) => emit("info", m, f),
  warn: (m: string, f?: LogFields) => emit("warn", m, f),
  error: (m: string, f?: LogFields) => emit("error", m, f),
};

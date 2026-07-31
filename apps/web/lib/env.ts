// no server-only: this module is also imported by the standalone worker process
import { z } from "zod";

// Validate server environment at import time. Fail fast in production; allow
// permissive defaults in development so the app can boot for local work.
const isProd = process.env.NODE_ENV === "production";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: isProd
    ? z.string().min(16, "AUTH_SECRET must be set in production")
    : z.string().min(1).default("dev-insecure-auth-secret-change-me"),
  REDIS_URL: z.string().optional().default(""),
  CREDENTIAL_ENCRYPTION_KEY: isProd
    ? z.string().min(32, "CREDENTIAL_ENCRYPTION_KEY must be >= 32 chars in production")
    : z.string().min(32).default("dev-insecure-encryption-key-000000000000"),
  INTERNAL_WORKER_SECRET: z.string().min(1).default("dev-worker-secret"),
  UPLOAD_DIR: z.string().default("./storage/uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(25),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  // Optional provider bootstrap keys (UI-entered keys are encrypted in DB).
  OPENAI_API_KEY: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional().default(""),
  LOCAL_LLM_BASE_URL: z.string().optional().default(""),
  LOCAL_LLM_API_KEY: z.string().optional().default(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export const redisAvailable = !!env.REDIS_URL;

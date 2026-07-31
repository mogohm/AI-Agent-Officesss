/**
 * Agent provider abstraction (§8/§17). The orchestrator never imports a vendor
 * SDK — it depends only on this interface, so providers are swappable and the
 * missing-credential path is explicit rather than a silent fake.
 */

export type AgentExecutionInput = {
  system: string;
  user: string;
  modelClass: "reasoning" | "coding" | "visual" | "lightweight";
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** When set, the provider must return JSON parseable into this shape. */
  expectJson?: boolean;
};

export type AgentExecutionResult = {
  status: "SUCCEEDED" | "FAILED" | "TIMED_OUT";
  structuredOutput: unknown | null;
  rawText: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  provider: string;
  model: string;
  error?: string;
};

export type ProviderValidationResult =
  | { ok: true; provider: string; model: string }
  | { ok: false; provider: string; missingEnv: string[]; reason: string };

export interface AgentProvider {
  readonly name: string;
  execute(input: AgentExecutionInput): Promise<AgentExecutionResult>;
  validateConfiguration(): Promise<ProviderValidationResult>;
}

/** Published per-1K token pricing; kept here so cost is auditable. */
export const PRICING: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.00015, out: 0.0006 },
  "gpt-4o": { in: 0.0025, out: 0.01 },
  "gpt-4.1-mini": { in: 0.0004, out: 0.0016 },
};

export function computeCost(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICING[model] ?? { in: 0, out: 0 };
  return (promptTokens / 1000) * p.in + (completionTokens / 1000) * p.out;
}

export class MissingCredentialsError extends Error {
  constructor(public readonly missingEnv: string[]) {
    super(`BLOCKED_CREDENTIALS: missing ${missingEnv.join(", ")}`);
    this.name = "MissingCredentialsError";
  }
}

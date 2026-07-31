import {
  type AgentProvider, type AgentExecutionInput, type AgentExecutionResult,
  type ProviderValidationResult, computeCost,
} from "./index";

/**
 * Real OpenAI provider — plain fetch against the Chat Completions API (no SDK
 * dependency, so nothing can silently phone home). The API key is read from the
 * environment at call time and NEVER persisted, logged, or returned.
 */
export class OpenAIProvider implements AgentProvider {
  readonly name = "OPENAI";
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(opts?: { model?: string; baseUrl?: string }) {
    this.model = opts?.model ?? process.env.DELIVERY_OPENAI_MODEL ?? "gpt-4o-mini";
    this.baseUrl = opts?.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  }

  private key(): string | undefined {
    const k = process.env.OPENAI_API_KEY?.trim();
    return k && k.length > 0 ? k : undefined;
  }

  async validateConfiguration(): Promise<ProviderValidationResult> {
    if (!this.key()) {
      return { ok: false, provider: this.name, missingEnv: ["OPENAI_API_KEY"], reason: "OPENAI_API_KEY is not set in the worker environment" };
    }
    return { ok: true, provider: this.name, model: this.model };
  }

  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const started = Date.now();
    const key = this.key();
    const base: Omit<AgentExecutionResult, "status"> = {
      structuredOutput: null, rawText: "", promptTokens: 0, completionTokens: 0, totalTokens: 0,
      costUsd: 0, latencyMs: 0, provider: this.name, model: this.model,
    };
    if (!key) return { ...base, status: "FAILED", error: "BLOCKED_CREDENTIALS: OPENAI_API_KEY missing" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 120_000);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: input.temperature ?? 0.2,
          max_tokens: input.maxTokens ?? 4000,
          ...(input.expectJson ? { response_format: { type: "json_object" } } : {}),
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ...base, status: "FAILED", latencyMs: Date.now() - started, error: `provider HTTP ${res.status}: ${body.slice(0, 300)}` };
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const rawText = json.choices?.[0]?.message?.content ?? "";
      const promptTokens = json.usage?.prompt_tokens ?? 0;
      const completionTokens = json.usage?.completion_tokens ?? 0;

      let structuredOutput: unknown = null;
      if (input.expectJson && rawText) {
        try { structuredOutput = JSON.parse(rawText); }
        catch {
          return {
            ...base, status: "FAILED", rawText, promptTokens, completionTokens,
            totalTokens: json.usage?.total_tokens ?? promptTokens + completionTokens,
            costUsd: computeCost(this.model, promptTokens, completionTokens),
            latencyMs: Date.now() - started, error: "provider returned invalid JSON",
          };
        }
      }

      return {
        status: "SUCCEEDED", structuredOutput, rawText,
        promptTokens, completionTokens,
        totalTokens: json.usage?.total_tokens ?? promptTokens + completionTokens,
        costUsd: computeCost(this.model, promptTokens, completionTokens),
        latencyMs: Date.now() - started, provider: this.name, model: this.model,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        ...base, status: aborted ? "TIMED_OUT" : "FAILED", latencyMs: Date.now() - started,
        error: aborted ? "provider timeout" : (err instanceof Error ? err.message : "provider error"),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Resolve the configured provider for a model class. */
export function resolveProvider(): AgentProvider {
  return new OpenAIProvider();
}

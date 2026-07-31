// no server-only: this module is also imported by the standalone worker process
import { ProviderConnectionError } from "@/lib/errors";
import type { AIProviderAdapter, AIExecutionRequest, AIExecutionResponse, ConnectionTestResult, ModelDefinition, ProviderCredentials, ProviderTypeKey } from "./types";

async function timeoutFetch(url: string, init: RequestInit, ms = 20000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: init.signal ?? ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

// ---- OpenAI-compatible (OpenAI + local endpoints) ----
class OpenAICompatibleAdapter implements AIProviderAdapter {
  constructor(readonly type: ProviderTypeKey, private creds: ProviderCredentials, private defaultBase: string) {}
  private base() { return (this.creds.baseUrl || this.defaultBase).replace(/\/$/, ""); }
  private headers() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.creds.apiKey) h["Authorization"] = `Bearer ${this.creds.apiKey}`;
    if (this.creds.organizationId) h["OpenAI-Organization"] = this.creds.organizationId;
    return h;
  }
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const res = await timeoutFetch(`${this.base()}/models`, { headers: this.headers() });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      const body = (await res.json()) as { data?: { id: string }[] };
      const models = (body.data ?? []).map((m) => ({ key: m.id, label: m.id }));
      return { ok: true, message: "เชื่อมต่อสำเร็จ", models };
    } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "connection failed" }; }
  }
  async listModels(): Promise<ModelDefinition[]> { return (await this.testConnection()).models ?? []; }
  async execute(req: AIExecutionRequest): Promise<AIExecutionResponse> {
    const messages = [] as { role: string; content: string }[];
    if (req.systemPrompt) messages.push({ role: "system", content: req.systemPrompt });
    messages.push({ role: "user", content: req.userPrompt });
    const res = await timeoutFetch(`${this.base()}/chat/completions`, {
      method: "POST", headers: this.headers(),
      body: JSON.stringify({ model: req.model, messages, temperature: req.temperature ?? 0.7, max_tokens: req.maxOutputTokens ?? 1024 }),
      signal: req.signal,
    });
    if (!res.ok) throw new ProviderConnectionError(`provider error HTTP ${res.status}`);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    const text = body.choices?.[0]?.message?.content ?? "";
    const u = body.usage ?? {};
    return { text, model: req.model, promptTokens: u.prompt_tokens ?? 0, completionTokens: u.completion_tokens ?? 0, totalTokens: u.total_tokens ?? 0 };
  }
}

// ---- Anthropic ----
class AnthropicAdapter implements AIProviderAdapter {
  readonly type = "ANTHROPIC" as const;
  constructor(private creds: ProviderCredentials) {}
  private base() { return (this.creds.baseUrl || "https://api.anthropic.com").replace(/\/$/, ""); }
  private headers() { return { "Content-Type": "application/json", "x-api-key": this.creds.apiKey ?? "", "anthropic-version": "2023-06-01" }; }
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const res = await timeoutFetch(`${this.base()}/v1/models`, { headers: this.headers() });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      const body = (await res.json()) as { data?: { id: string }[] };
      return { ok: true, message: "เชื่อมต่อสำเร็จ", models: (body.data ?? []).map((m) => ({ key: m.id, label: m.id })) };
    } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "connection failed" }; }
  }
  async listModels(): Promise<ModelDefinition[]> { return (await this.testConnection()).models ?? []; }
  async execute(req: AIExecutionRequest): Promise<AIExecutionResponse> {
    const res = await timeoutFetch(`${this.base()}/v1/messages`, {
      method: "POST", headers: this.headers(),
      body: JSON.stringify({ model: req.model, system: req.systemPrompt, max_tokens: req.maxOutputTokens ?? 1024, temperature: req.temperature ?? 0.7, messages: [{ role: "user", content: req.userPrompt }] }),
      signal: req.signal,
    });
    if (!res.ok) throw new ProviderConnectionError(`anthropic error HTTP ${res.status}`);
    const body = (await res.json()) as { content?: { text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    const text = body.content?.map((c) => c.text ?? "").join("") ?? "";
    const input = body.usage?.input_tokens ?? 0, output = body.usage?.output_tokens ?? 0;
    return { text, model: req.model, promptTokens: input, completionTokens: output, totalTokens: input + output };
  }
}

// ---- Google (Gemini) ----
class GoogleAdapter implements AIProviderAdapter {
  readonly type = "GOOGLE" as const;
  constructor(private creds: ProviderCredentials) {}
  private base() { return (this.creds.baseUrl || "https://generativelanguage.googleapis.com").replace(/\/$/, ""); }
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const res = await timeoutFetch(`${this.base()}/v1beta/models?key=${encodeURIComponent(this.creds.apiKey ?? "")}`, {});
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      const body = (await res.json()) as { models?: { name?: string }[] };
      return { ok: true, message: "เชื่อมต่อสำเร็จ", models: (body.models ?? []).map((m) => ({ key: (m.name ?? "").replace("models/", ""), label: (m.name ?? "").replace("models/", "") })) };
    } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "connection failed" }; }
  }
  async listModels(): Promise<ModelDefinition[]> { return (await this.testConnection()).models ?? []; }
  async execute(req: AIExecutionRequest): Promise<AIExecutionResponse> {
    const url = `${this.base()}/v1beta/models/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(this.creds.apiKey ?? "")}`;
    const contents = [{ role: "user", parts: [{ text: (req.systemPrompt ? req.systemPrompt + "\n\n" : "") + req.userPrompt }] }];
    const res = await timeoutFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents, generationConfig: { temperature: req.temperature ?? 0.7, maxOutputTokens: req.maxOutputTokens ?? 1024 } }), signal: req.signal });
    if (!res.ok) throw new ProviderConnectionError(`google error HTTP ${res.status}`);
    const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const u = body.usageMetadata ?? {};
    return { text, model: req.model, promptTokens: u.promptTokenCount ?? 0, completionTokens: u.candidatesTokenCount ?? 0, totalTokens: u.totalTokenCount ?? 0 };
  }
}

export function getAdapter(type: ProviderTypeKey, creds: ProviderCredentials): AIProviderAdapter {
  switch (type) {
    case "OPENAI": return new OpenAICompatibleAdapter("OPENAI", creds, "https://api.openai.com/v1");
    case "LOCAL": return new OpenAICompatibleAdapter("LOCAL", creds, creds.baseUrl || "http://localhost:11434/v1");
    case "ANTHROPIC": return new AnthropicAdapter(creds);
    case "GOOGLE": return new GoogleAdapter(creds);
    default: throw new ProviderConnectionError(`unknown provider ${type}`);
  }
}

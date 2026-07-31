// Provider abstraction — one adapter interface, many providers. Adapters run
// server-side only; credentials are decrypted just-in-time and never returned
// to the client.
export type ProviderTypeKey = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "LOCAL";

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
}

export interface ModelDefinition {
  key: string;
  label: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  models?: ModelDefinition[];
}

export interface AIExecutionRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface AIExecutionResponse {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIProviderAdapter {
  readonly type: ProviderTypeKey;
  testConnection(): Promise<ConnectionTestResult>;
  listModels(): Promise<ModelDefinition[]>;
  execute(request: AIExecutionRequest): Promise<AIExecutionResponse>;
}

import fs from "node:fs/promises";
import path from "node:path";

/**
 * Asset generation adapter (§6). Talks to the OpenAI images API with plain
 * fetch — the credential is read at call time and never persisted or logged.
 *
 * Contract verified against tools/creative_worker/openai_image_worker.py:
 * reference-guided `images.edit`, fixed canvas sizes, `background=transparent`
 * for sprites; exact target dimensions are produced afterwards by the
 * deterministic Pillow post-processor, never by the model.
 */

export type AssetOperation = "generate" | "edit";

export type AssetGenerationRequest = {
  prompt: string;
  /** Aspect hint — the API only accepts three canvas sizes. */
  orientation: "landscape" | "portrait" | "square";
  transparent?: boolean;
  quality?: "low" | "medium" | "high";
  outputPath: string;
  timeoutMs?: number;
};
export type AssetEditRequest = AssetGenerationRequest & { referencePaths: string[] };

export type AssetGenerationResult = {
  status: "SUCCEEDED" | "FAILED" | "TIMED_OUT";
  outputPath: string | null;
  provider: string;
  model: string;
  operation: AssetOperation;
  width: number | null;
  height: number | null;
  format: string | null;
  hasAlpha: boolean | null;
  latencyMs: number;
  estimatedCost: number;
  actualCost: number;
  providerRequestId?: string;
  error?: string;
};

export type AssetProviderValidation =
  | { ok: true; provider: string; model: string }
  | { ok: false; provider: string; missingEnv: string[]; reason: string };

export interface AssetGenerationAdapter {
  generate(request: AssetGenerationRequest): Promise<AssetGenerationResult>;
  edit(request: AssetEditRequest): Promise<AssetGenerationResult>;
  validateConfiguration(): Promise<AssetProviderValidation>;
}

const SIZES = { landscape: "1536x1024", portrait: "1024x1536", square: "1024x1024" } as const;

/** Published gpt-image pricing per generated image (USD), by quality. */
const IMAGE_PRICE: Record<string, Record<string, number>> = {
  "gpt-image-1-mini": { low: 0.005, medium: 0.011, high: 0.036 },
  "gpt-image-1": { low: 0.011, medium: 0.042, high: 0.167 },
};

export function estimateImageCost(model: string, quality: string): number {
  return IMAGE_PRICE[model]?.[quality] ?? IMAGE_PRICE["gpt-image-1-mini"].medium;
}

export class OpenAIImageAdapter implements AssetGenerationAdapter {
  readonly provider = "OPENAI";
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(opts?: { model?: string }) {
    this.model = opts?.model ?? process.env.DELIVERY_IMAGE_MODEL ?? "gpt-image-1-mini";
    this.baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  }

  private key(): string | undefined {
    const k = process.env.OPENAI_API_KEY?.trim();
    return k && k.length > 0 ? k : undefined;
  }

  async validateConfiguration(): Promise<AssetProviderValidation> {
    if (!this.key()) {
      return { ok: false, provider: this.provider, missingEnv: ["OPENAI_API_KEY"], reason: "OPENAI_API_KEY is not set in the worker environment" };
    }
    return { ok: true, provider: this.provider, model: this.model };
  }

  async generate(req: AssetGenerationRequest): Promise<AssetGenerationResult> {
    return this.call("generate", req, []);
  }

  async edit(req: AssetEditRequest): Promise<AssetGenerationResult> {
    return this.call("edit", req, req.referencePaths);
  }

  private async call(op: AssetOperation, req: AssetGenerationRequest, references: string[]): Promise<AssetGenerationResult> {
    const started = Date.now();
    const quality = req.quality ?? "medium";
    const estimatedCost = estimateImageCost(this.model, quality);
    const base: AssetGenerationResult = {
      status: "FAILED", outputPath: null, provider: this.provider, model: this.model, operation: op,
      width: null, height: null, format: null, hasAlpha: null, latencyMs: 0,
      estimatedCost, actualCost: 0,
    };

    const key = this.key();
    if (!key) return { ...base, error: "BLOCKED_CREDENTIALS: OPENAI_API_KEY missing" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 300_000);
    try {
      let res: Response;
      if (op === "edit" && references.length > 0) {
        const form = new FormData();
        form.append("model", this.model);
        form.append("prompt", req.prompt);
        form.append("size", SIZES[req.orientation]);
        form.append("quality", quality);
        if (req.transparent) form.append("background", "transparent");
        for (const r of references) {
          const buf = await fs.readFile(r);
          const ext = path.extname(r).toLowerCase();
          const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
          form.append("image[]", new Blob([new Uint8Array(buf)], { type: mime }), path.basename(r));
        }
        res = await fetch(`${this.baseUrl}/images/edits`, {
          method: "POST", headers: { authorization: `Bearer ${key}` }, body: form, signal: controller.signal,
        });
      } else {
        res = await fetch(`${this.baseUrl}/images/generations`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.model, prompt: req.prompt, size: SIZES[req.orientation], quality, n: 1,
            ...(req.transparent ? { background: "transparent" } : {}),
          }),
        });
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ...base, latencyMs: Date.now() - started, error: `image provider HTTP ${res.status}: ${body.slice(0, 400)}` };
      }

      const json = (await res.json()) as { data?: { b64_json?: string }[]; usage?: { total_tokens?: number } };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) return { ...base, latencyMs: Date.now() - started, error: "image provider returned no image data" };

      // write the raw model output; exact dimensions come from post-processing
      await fs.mkdir(path.dirname(req.outputPath), { recursive: true });
      await fs.writeFile(req.outputPath, Buffer.from(b64, "base64"));

      return {
        ...base, status: "SUCCEEDED", outputPath: req.outputPath,
        latencyMs: Date.now() - started, actualCost: estimatedCost,
        providerRequestId: res.headers.get("x-request-id") ?? undefined,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        ...base, status: aborted ? "TIMED_OUT" : "FAILED", latencyMs: Date.now() - started,
        error: aborted ? "image provider timeout" : (err instanceof Error ? err.message : "image provider error"),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export function resolveImageAdapter(): AssetGenerationAdapter {
  return new OpenAIImageAdapter();
}

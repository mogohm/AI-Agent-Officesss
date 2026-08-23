import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { renderAssetPrompt, type AssetPromptKey } from "@/lib/delivery/prompts/asset-prompts";

/**
 * WP-002R — canonical asset reconstruction (baseline v1.1.0).
 *
 * Prompts come from the APPROVED templates in asset-prompts.ts, never ad-hoc.
 * Normalisation goes through the approved deterministic pipeline (imagetool.py).
 * Resumable: an asset that already has a validated candidate is skipped.
 */

const REPO = path.resolve(process.cwd(), "..", "..");
const SPEC = path.join(REPO, "artifacts/WP-002R/recovery-spec.json");
const STAGE = path.join(REPO, "artifacts/WP-002R/staging");
const TOOL = path.join(REPO, "tools/asset_pipeline/imagetool.py");
const MODEL = process.env.WP002R_MODEL ?? "gpt-image-1";
const MAX_ATTEMPTS = 5;

type SpecAsset = {
  assetKey: string; category: "building" | "floor" | "worker";
  filename: string; productionPath: string;
  width: number; height: number; requiresAlpha: boolean;
  promptTemplate: string; orientation: "landscape" | "portrait" | "square";
  identity?: string; detail?: string; department?: string; furniture?: string;
  accent?: string; state?: string; treatment?: string;
};

const toPosix = (p: string) => p.split(path.sep).join("/");
const sizeFor = (o: string) => o === "landscape" ? "1536x1024" : o === "portrait" ? "1024x1536" : "1024x1024";

function promptVars(a: SpecAsset, attempt: number): Record<string, string> {
  const base: Record<string, string> =
    a.category === "building" ? { identity: a.identity!, detail: a.detail! }
    : a.category === "worker" ? { state: a.state!, treatment: a.treatment! }
    : { department: a.department!, furniture: a.furniture!, accent: a.accent! };
  if (attempt > 1) {
    const k = a.category === "worker" ? "treatment" : "detail" in base ? "detail" : "furniture";
    base[k] = `${base[k] ?? ""} (attempt ${attempt}: strictly no living beings, no text, keep the entire subject inside the frame with clear margin)`;
  }
  return base;
}

async function generate(a: SpecAsset, attempt: number, outPng: string): Promise<{ ok: boolean; promptHash?: string; err?: string }> {
  const vars = promptVars(a, attempt);
  const rendered = renderAssetPrompt(a.promptTemplate as AssetPromptKey, vars);
  const body: Record<string, unknown> = {
    model: MODEL, prompt: rendered.prompt, size: sizeFor(a.orientation), n: 1,
  };
  if (a.requiresAlpha) body.background = "transparent";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, err: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const j = await res.json() as { data: { b64_json?: string }[] };
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) return { ok: false, err: "no image payload" };
  fs.writeFileSync(outPng, Buffer.from(b64, "base64"));
  return { ok: true, promptHash: rendered.hash };
}

function tool(args: string[]): Record<string, unknown> {
  try {
    const out = execFileSync("python", [TOOL, ...args], { encoding: "utf8", cwd: REPO, maxBuffer: 32 << 20 });
    const line = out.trim().split("\n").filter(Boolean).pop() ?? "{}";
    return JSON.parse(line);
  } catch (e) { return { ok: false, error: (e as Error).message.slice(0, 200) }; }
}

(async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  const spec = JSON.parse(fs.readFileSync(SPEC, "utf8")) as { assets: SpecAsset[] };
  const only = process.argv[2];
  const assets = only ? spec.assets.filter((a) => a.assetKey === only) : spec.assets;
  fs.mkdirSync(STAGE, { recursive: true });
  const manifestPath = path.join(STAGE, "generation-manifest.json");
  const manifest: Record<string, unknown>[] = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : [];

  for (const a of assets) {
    const finalWebp = path.join(STAGE, a.filename);
    const done = manifest.find((m) => m.assetKey === a.assetKey && m.validation === "PASSED");
    if (done && fs.existsSync(finalWebp)) { console.log(`SKIP    ${a.assetKey} (already validated)`); continue; }

    let ok = false, lastErr = "", attempts = 0, promptHash = "";
    while (attempts < MAX_ATTEMPTS && !ok) {
      attempts++;
      const raw = path.join(STAGE, `${a.assetKey}-a${attempts}.png`);
      const g = await generate(a, attempts, raw);
      if (!g.ok) { lastErr = g.err!; console.log(`  ..    ${a.assetKey} attempt ${attempts}: ${lastErr}`); continue; }
      promptHash = g.promptHash!;

      const rel = toPosix(path.relative(REPO, finalWebp));
      const norm = tool(["normalize", "--src", toPosix(raw), "--out", rel,
        "--width", String(a.width), "--height", String(a.height),
        "--fit", a.category === "building" || a.requiresAlpha ? "contain" : "cover",
        ...(a.requiresAlpha ? ["--alpha"] : [])]);
      if (!norm.ok) { lastErr = String(norm.error ?? "normalize failed"); console.log(`  ..    ${a.assetKey} normalize: ${lastErr}`); continue; }

      const val = tool(["validate", "--path", rel, "--width", String(a.width),
        "--height", String(a.height), ...(a.requiresAlpha ? ["--alpha"] : [])]);
      if (!val.ok) { lastErr = JSON.stringify(val.issues ?? val.error); console.log(`  ..    ${a.assetKey} validate: ${lastErr}`); continue; }
      ok = true;
      const sha = createHash("sha256").update(fs.readFileSync(finalWebp)).digest("hex");
      const entry = { assetKey: a.assetKey, filename: a.filename, productionPath: a.productionPath,
        sha256: sha, width: val.width, height: val.height, hasAlpha: val.hasAlpha,
        fileSizeBytes: fs.statSync(finalWebp).size, model: MODEL, promptTemplate: a.promptTemplate,
        promptHash, attempts, validation: "PASSED", review: "PENDING" };
      const i = manifest.findIndex((m) => m.assetKey === a.assetKey);
      if (i >= 0) manifest[i] = entry; else manifest.push(entry);
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`OK      ${a.assetKey}  ${val.width}x${val.height} alpha=${val.hasAlpha} sha=${sha.slice(0, 12)} (attempt ${attempts})`);
    }
    if (!ok) console.log(`FAIL    ${a.assetKey} after ${attempts}: ${lastErr}`);
    for (const f of fs.readdirSync(STAGE)) if (f.startsWith(`${a.assetKey}-a`) && f.endsWith(".png")) fs.rmSync(path.join(STAGE, f), { force: true });
  }
  const passed = manifest.filter((m) => m.validation === "PASSED").length;
  console.log(`\nvalidated ${passed}/17`);
})();

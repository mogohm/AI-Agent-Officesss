import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

/**
 * WP-002R correction cycle 2 — floor camera coherence + anchor conformance.
 *
 * Review P0: the seven floors used three different camera systems and none had
 * an edge-to-edge floor slab, so they cannot stack into a tower and workers
 * composited to FloorAnchorSpec would stand inside furniture.
 *
 * Fix: generate ONE floor as the camera anchor, require its detected slab to
 * land near y=430, then derive the other six from it by image-edit so the camera
 * cannot drift. Same technique that fixed worker identity in cycle 1.
 */
const REPO = path.resolve(process.cwd(), "..", "..");
const STAGE = path.join(REPO, "artifacts/WP-002R/staging");
const TOOL = path.join(REPO, "tools/asset_pipeline/imagetool.py");
const toPosix = (p: string) => p.split(path.sep).join("/");
const SLAB_TARGET = 430;
const SLAB_TOL = 45;

const FLOORS: Record<string, { furniture: string; accent: string }> = {
  "marketing": { furniture: "campaign boards, presentation screens showing abstract charts, mood-board walls, leafy plants, a lounge sofa", accent: "PURPLE and MAGENTA walls and lighting" },
  "sales": { furniture: "a large world-map wall display, call-station desks with headsets on stands, revenue dashboard screens, filing cabinets", accent: "BLUE and CYAN walls and lighting" },
  "hr": { furniture: "a warm interview corner with armchairs, bookshelves, framed abstract art, a coffee table, potted plants", accent: "SOFT PINK and WARM BEIGE walls and lighting" },
  "it-dev": { furniture: "long developer desks with multiple monitors showing abstract code, a small server rack, mechanical keyboards, desk plants", accent: "TEAL and CYAN walls and lighting" },
  "design-meeting": { furniture: "drawing tablets, a large mood-board wall, colour swatch panels, a central meeting table with empty chairs, a projector screen", accent: "ORANGE and VIOLET walls and lighting" },
  "lobby-support": { furniture: "a curved reception desk, waiting sofas, a large plant, a blank feature panel on the wall, floor lamps", accent: "WARM AMBER and GREEN walls and lighting" },
  "server": { furniture: "server racks, patch panels, cable trays, cooling units, status LEDs", accent: "CYAN and DEEP BLUE walls and lighting" },
};

const CAMERA = [
  "Strict 2:1 dimetric isometric cutaway of ONE office floor as a wide horizontal band, seen from a fixed elevated angle.",
  "The room fills the ENTIRE frame width: left and right walls are cut off exactly at the frame edges so floors stack seamlessly. No border, no gap, no city visible outside the room at the frame edges.",
  "CRITICAL LAYOUT: the lower 28 percent of the image is an EMPTY polished floor slab running edge to edge with NOTHING standing on it. All furniture sits in the UPPER portion against the back wall.",
  "Detailed pixel-art game-art style, night city beyond the windows, warm interior lighting, consistent pixel density and outline weight.",
].join(" ");

const BAN = "ABSOLUTELY NO people, workers, humans, characters, faces or silhouettes. NO text, letters, numbers, labels, signage, logos or watermarks. NO photographic style, NO 3D render.";

function tool(args: string[]): Record<string, unknown> {
  try {
    const out = execFileSync("python", [TOOL, ...args], { encoding: "utf8", cwd: REPO, maxBuffer: 32 << 20 });
    return JSON.parse(out.trim().split("\n").filter(Boolean).pop() ?? "{}");
  } catch (e) { return { ok: false, error: (e as Error).message.slice(0, 200) }; }
}

function finish(slug: string, rawPng: string) {
  const rel = toPosix(path.relative(REPO, path.join(STAGE, slug + "-floor-empty.webp")));
  const norm = tool(["normalize", "--src", toPosix(rawPng), "--out", rel, "--width", "1600", "--height", "600", "--fit", "cover"]);
  if (!norm.ok) return { ok: false, err: String(norm.error) };
  const val = tool(["validate", "--path", rel, "--width", "1600", "--height", "600"]);
  if (!val.ok) return { ok: false, err: JSON.stringify(val.issues ?? val.error) };
  const anc = tool(["anchors", "--path", rel]);
  const det = (anc.detected ?? {}) as Record<string, number>;
  const abs = path.join(REPO, rel);
  return { ok: true, slab: Number(det.slabTopY ?? -1), sha: createHash("sha256").update(fs.readFileSync(abs)).digest("hex") };
}

async function textToImage(prompt: string, out: string): Promise<boolean> {
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1536x1024", n: 1 }),
  });
  if (!r.ok) { console.log("   HTTP", r.status, (await r.text()).slice(0, 120)); return false; }
  const b64 = ((await r.json()) as { data: { b64_json?: string }[] }).data?.[0]?.b64_json;
  if (!b64) return false;
  fs.writeFileSync(out, Buffer.from(b64, "base64"));
  return true;
}

async function editFrom(anchorPng: string, prompt: string, out: string): Promise<boolean> {
  const fd = new FormData();
  fd.append("model", "gpt-image-1");
  fd.append("image", new Blob([fs.readFileSync(anchorPng)], { type: "image/png" }), "anchor.png");
  fd.append("prompt", prompt);
  fd.append("size", "1536x1024");
  const r = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST", headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY }, body: fd,
  });
  if (!r.ok) { console.log("   HTTP", r.status, (await r.text()).slice(0, 120)); return false; }
  const b64 = ((await r.json()) as { data: { b64_json?: string }[] }).data?.[0]?.b64_json;
  if (!b64) return false;
  fs.writeFileSync(out, Buffer.from(b64, "base64"));
  return true;
}

(async () => {
  const ANCHOR = "it-dev";
  const anchorRaw = path.join(STAGE, "_anchor-floor.png");
  let anchorOk = false;

  for (let a = 1; a <= 5 && !anchorOk; a++) {
    const p = [CAMERA, "Department: software engineering. Furniture: " + FLOORS[ANCHOR].furniture + ". " + FLOORS[ANCHOR].accent + ".", BAN].join(" ");
    if (!(await textToImage(p, anchorRaw))) continue;
    const r = finish(ANCHOR, anchorRaw);
    if (!r.ok) { console.log("  .. anchor a" + a + ": " + r.err); continue; }
    const dev = Math.abs((r.slab ?? 0) - SLAB_TARGET);
    console.log("  anchor a" + a + ": slabTopY=" + r.slab + " dev=" + dev);
    if (dev <= SLAB_TOL) { anchorOk = true; console.log("OK   it-dev-floor-empty slab=" + r.slab + " sha=" + r.sha!.slice(0, 12)); }
  }
  if (!anchorOk) { console.log("FAIL: anchor floor never satisfied the slab anchor"); return; }

  for (const slug of Object.keys(FLOORS)) {
    if (slug === ANCHOR) continue;
    const f = FLOORS[slug];
    const p = ["Keep EXACTLY the same camera angle, perspective, room geometry, wall positions and floor-slab position as the reference image.",
      "The lower 28 percent must remain an EMPTY floor slab edge to edge with nothing standing on it.",
      "Replace ONLY the furniture and the colour scheme: " + f.furniture + ". " + f.accent + ".", BAN].join(" ");
    const raw = path.join(STAGE, "_" + slug + "-edit.png");
    let done = false;
    for (let a = 1; a <= 3 && !done; a++) {
      if (!(await editFrom(anchorRaw, p, raw))) continue;
      const r = finish(slug, raw);
      if (!r.ok) { console.log("  .. " + slug + " a" + a + ": " + r.err); continue; }
      const dev = Math.abs((r.slab ?? 0) - SLAB_TARGET);
      console.log((dev <= SLAB_TOL ? "OK   " : "WARN ") + slug + "-floor-empty slab=" + r.slab + " dev=" + dev + " sha=" + r.sha!.slice(0, 12) + " (a" + a + ")");
      if (dev <= SLAB_TOL) done = true;
    }
    if (!done) console.log("FAIL " + slug + ": slab anchor not met");
    fs.rmSync(raw, { force: true });
  }
})();

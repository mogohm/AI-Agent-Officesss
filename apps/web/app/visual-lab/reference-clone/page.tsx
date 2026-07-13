"use client";
/* eslint-disable @next/next/no-img-element */
// Reference Clone Lab — the visual-match gate for the REFERENCE CLONE REBUILD.
// Modes: side-by-side · overlay (opacity slider) · alignment guides · pixel-diff report.
// Reference: /assets/reference/reference.png (copy of references/ai-agent-office-reference.png)
// Clone:     live <ReferenceCloneStage/> (and /assets/reference/clone.png for diffs)
import { useEffect, useState } from "react";
import { ReferenceCloneStage } from "@/components/reference-clone/ReferenceCloneStage";

const REF = "/assets/reference/reference.png";
const W = 1672, H = 941;

// Measured seams (docs/REFERENCE_PIXEL_MEASUREMENTS.md) for alignment guides.
const GUIDES_X = [10, 416, 420, 960, 976, 1662];
const GUIDES_Y = [11, 770, 775, 931];

type Metrics = { layout_similarity: number; color_similarity: number; structure_similarity: number; overall_similarity: number } | null;

function Stage({ scale, eng, workers }: { scale: number; eng: string; workers: "off" | "fe" | "trio" }) {
  return (
    <div style={{ width: W * scale, height: H * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}><ReferenceCloneStage eng={eng} workers={workers} /></div>
    </div>
  );
}

export default function ReferenceClonePage() {
  const [mode, setMode] = useState<"side" | "overlay" | "guides" | "diff">("side");
  const [opacity, setOpacity] = useState(50);
  const [eng, setEng] = useState("locked");
  const [workers, setWorkers] = useState<"off" | "fe" | "trio">("off");
  const [metrics, setMetrics] = useState<Metrics>(null);
  useEffect(() => {
    fetch("/assets/reference/diff-metrics.json").then((r) => (r.ok ? r.json() : null)).then(setMetrics).catch(() => setMetrics(null));
  }, []);

  const half = 0.42, full = 0.78;

  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-6">
      <header className="mb-3">
        <h1 className="text-2xl font-bold text-ink">Reference Clone Lab</h1>
        <p className="mt-1 text-sm text-muted">Static clone vs approved reference. The clone must pass here before production integration.</p>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          {([["side", "Side by side"], ["overlay", "Overlay"], ["guides", "Guides"], ["diff", "Pixel diff"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setMode(k)}
              className={`px-4 py-2 text-sm font-bold transition ${mode === k ? "bg-neon text-white" : "bg-elevated text-ink hover:bg-surface"}`}>{label}</button>
          ))}
        </div>
        {/* temporary Engineering A/B switch (v1 frontal vs v2 isometric) */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-elevated px-2 py-1">
          <span className="text-[11px] font-bold text-muted">Engineering:</span>
          {([["v1", "V1 — Frontal"], ["v2", "V2 — Rejected"], ["v3", "V3 — Reference Crop"], ["locked", "Locked"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setEng(k)}
              className={`rounded px-2 py-1 text-[11px] font-bold transition ${eng === k ? "bg-amber text-white" : "text-ink hover:bg-surface"}`}>{label}</button>
          ))}
        </div>
        {/* Engineering workers switch */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-elevated px-2 py-1">
          <span className="text-[11px] font-bold text-muted">Engineering Workers:</span>
          {([["off", "OFF"], ["fe", "Frontend Only"], ["trio", "Full Trio"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setWorkers(k)}
              className={`rounded px-2 py-1 text-[11px] font-bold transition ${workers === k ? "bg-lime text-white" : "text-ink hover:bg-surface"}`}>{label}</button>
          ))}
        </div>
      </div>

      {mode === "side" && (
        <div className="flex flex-wrap gap-3">
          <figure className="overflow-hidden rounded-xl border border-line bg-elevated shadow-card">
            <figcaption className="border-b border-line px-3 py-1.5 text-sm font-bold text-ink">Approved reference</figcaption>
            <img src={REF} alt="reference" style={{ width: W * half }} />
          </figure>
          <figure className="overflow-hidden rounded-xl border border-line bg-elevated shadow-card">
            <figcaption className="border-b border-line px-3 py-1.5 text-sm font-bold text-ink">Static clone (live)</figcaption>
            <Stage scale={half} eng={eng} workers={workers} />
          </figure>
        </div>
      )}

      {mode === "overlay" && (
        <>
          <label className="mb-2 flex max-w-xl items-center gap-3 text-sm text-ink">
            <span className="whitespace-nowrap font-medium">Clone opacity</span>
            <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surfaceAlt accent-neon" />
            <span className="w-12 text-right font-mono text-muted">{opacity}%</span>
          </label>
          <div className="relative overflow-hidden rounded-xl border border-line shadow-card" style={{ width: W * full, height: H * full }}>
            <img src={REF} alt="reference" className="absolute left-0 top-0" style={{ width: W * full }} />
            <div className="absolute left-0 top-0" style={{ opacity: opacity / 100 }}><Stage scale={full} eng={eng} workers={workers} /></div>
          </div>
        </>
      )}

      {mode === "guides" && (
        <div className="relative overflow-hidden rounded-xl border border-line shadow-card" style={{ width: W * full, height: H * full }}>
          <div className="absolute left-0 top-0" style={{ opacity: 0.55 }}><img src={REF} alt="reference" style={{ width: W * full }} /></div>
          <div className="absolute left-0 top-0" style={{ opacity: 0.55 }}><Stage scale={full} eng={eng} workers={workers} /></div>
          {GUIDES_X.map((x) => <div key={`x${x}`} className="absolute top-0 h-full w-px bg-pink" style={{ left: x * full }} />)}
          {GUIDES_Y.map((y) => <div key={`y${y}`} className="absolute left-0 w-full border-t border-dashed border-cyan" style={{ top: y * full }} />)}
          <div className="absolute bottom-2 right-2 rounded bg-white/85 px-2 py-1 text-[11px] text-ink">pink = measured column seams · cyan = row seams</div>
        </div>
      )}

      {mode === "diff" && (
        <div className="space-y-3">
          {metrics ? (
            <div className="flex flex-wrap gap-3">
              {Object.entries(metrics).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-elevated px-4 py-3 shadow-card">
                  <div className="text-[11px] uppercase tracking-wide text-muted">{k.replace(/_/g, " ")}</div>
                  <div className={`text-2xl font-bold ${Number(v) >= 0.85 ? "text-lime" : Number(v) >= 0.7 ? "text-amber" : "text-pink"}`}>{(Number(v) * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No metrics yet — run <code className="rounded bg-surface px-1">tools/creative_worker/reference_diff.py</code> to generate outputs/reference-diff/ and copy diff-metrics.json + difference-map.png to /public/assets/reference/.</p>
          )}
          <div className="flex flex-wrap gap-3">
            {[["overlay-50.png", "50% overlay"], ["difference-map.png", "Difference map"]].map(([f, label]) => (
              <figure key={f} className="overflow-hidden rounded-xl border border-line bg-elevated shadow-card">
                <figcaption className="border-b border-line px-3 py-1.5 text-sm font-bold text-ink">{label}</figcaption>
                <img src={`/assets/reference/${f}`} alt={label} style={{ width: W * half }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

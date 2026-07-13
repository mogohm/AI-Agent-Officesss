"use client";
// Reference-comparison lab: approved reference vs current production screenshot.
// Two modes — side-by-side, and an overlay with an opacity slider (0–100%) so
// composition drift is measurable, not remembered.
import { useState } from "react";

const REFERENCE = "/assets/reference/reference.png";
const CURRENT = "/assets/reference/current.png";

export default function ReferenceComparisonPage() {
  const [mode, setMode] = useState<"side" | "overlay">("side");
  const [opacity, setOpacity] = useState(50);

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-ink">Reference Comparison</h1>
        <p className="mt-1 text-sm text-muted">
          Left/base = approved reference. Right/overlay = current production page. Score composition from this, not from memory.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          <button
            onClick={() => setMode("side")}
            className={`px-4 py-2 text-sm font-bold transition ${mode === "side" ? "bg-neon text-white" : "bg-elevated text-ink hover:bg-surface"}`}
          >
            Side by side
          </button>
          <button
            onClick={() => setMode("overlay")}
            className={`px-4 py-2 text-sm font-bold transition ${mode === "overlay" ? "bg-neon text-white" : "bg-elevated text-ink hover:bg-surface"}`}
          >
            Overlay
          </button>
        </div>

        {mode === "overlay" && (
          <label className="flex flex-1 items-center gap-3 text-sm text-ink">
            <span className="whitespace-nowrap font-medium">Current opacity</span>
            <input
              type="range" min={0} max={100} value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-2 w-full max-w-md cursor-pointer appearance-none rounded-full bg-surfaceAlt accent-neon"
            />
            <span className="w-12 text-right font-mono text-muted">{opacity}%</span>
          </label>
        )}
      </div>

      {mode === "side" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-xl border border-line bg-elevated shadow-card">
            <figcaption className="border-b border-line px-3 py-2 text-sm font-bold text-ink">Approved reference</figcaption>
            <img src={REFERENCE} alt="Approved reference" className="w-full" />
          </figure>
          <figure className="overflow-hidden rounded-xl border border-line bg-elevated shadow-card">
            <figcaption className="border-b border-line px-3 py-2 text-sm font-bold text-ink">Current production</figcaption>
            <img src={CURRENT} alt="Current production" className="w-full" />
          </figure>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-line bg-elevated shadow-card">
          <img src={REFERENCE} alt="Approved reference" className="w-full" />
          <img
            src={CURRENT} alt="Current production"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: opacity / 100 }}
          />
        </div>
      )}

      <p className="mt-4 text-xs text-faint">
        Reference: /assets/reference/reference.png · Current: /assets/reference/current.png (re-copy the latest 1920×1080 screenshot to refresh).
      </p>
    </div>
  );
}

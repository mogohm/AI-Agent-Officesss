"use client";
// Layered IT/Dev floor scene. Two display modes share ONE composed 8:3 scene:
//  - showcase: the 8:3 scene shown directly (visual approval)
//  - band: the SAME 8:3 scene inside a 5:1 viewport (crop preview, no stretch)
// Layer order: room image → shadows(in agent) → agents → lighting → bounds.
import type { AssetState } from "@/hooks/useAssetStatus";
import {
  AGENTS, CHAR_HEIGHT_RATIO, BAND_ASPECT, SHOWCASE_ASPECT,
  IT_DEV_FLOOR_ASSET, posFor,
} from "@/lib/assets/verticalSlice";
import { CompositedAgent } from "./CompositedAgent";

type Focal = "top" | "center" | "bottom";

export function ItDevFloorScene({
  agentStates, status, mode, lighting, labels, bounds, displayW, focal,
}: {
  agentStates: Record<string, string>;
  status: Record<string, AssetState>;
  mode: "showcase" | "band";
  lighting: boolean;
  labels: boolean;
  bounds: boolean;
  displayW: number;
  focal: Focal;
}) {
  const sceneW = displayW;
  const sceneH = displayW / SHOWCASE_ASPECT; // composed scene is always 8:3
  const roomStatus = status[IT_DEV_FLOOR_ASSET] ?? "loading";

  const composed = (
    <div className="relative overflow-hidden" style={{ width: sceneW, height: sceneH, background: "#0a1120" }}>
      {/* z0 — room background (pixel art, furniture/equipment/lighting baked) */}
      {roomStatus === "ok" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={IT_DEV_FLOOR_ASSET} alt="IT / Dev floor" className="pixelated absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#FF3DAE] bg-[#FF3DAE]/8"
          style={{ backgroundImage: "linear-gradient(rgba(255,61,174,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,61,174,.08) 1px,transparent 1px)", backgroundSize: "24px 24px" }}>
          <span className="rounded bg-[#FF3DAE]/20 px-3 py-1 text-sm font-bold uppercase tracking-wider text-[#FF3DAE]">DEV FALLBACK — room asset missing</span>
          <span className="font-mono text-xs text-ink/80">✗ /assets/office/floors/it-dev/it-dev-floor-base.webp</span>
        </div>
      )}

      {/* z5 — agents (each carries its own contact shadow + FX) */}
      {AGENTS.map((agent) => {
        const key = agentStates[agent.id] ?? agent.default;
        const pos = posFor(agent, key);
        const h = sceneH * CHAR_HEIGHT_RATIO * pos.s;
        return (
          <div key={agent.id} className="absolute"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-100%)", zIndex: pos.z }}>
            <CompositedAgent agent={agent} stateKey={key} status={status[AGENT_ASSET(agent, key)] ?? "loading"}
              heightPx={h} facing={pos.facing} showLabel={labels} showBounds={bounds} />
          </div>
        );
      })}

      {/* z7 — lighting overlay (toggle) */}
      {lighting ? (
        <div className="pointer-events-none absolute inset-0 animate-pulseSoft" style={{
          mixBlendMode: "screen",
          background:
            "radial-gradient(40% 60% at 22% 30%, rgba(255,207,122,.28), transparent 70%)," +
            "radial-gradient(40% 60% at 52% 26%, rgba(59,232,224,.20), transparent 70%)," +
            "radial-gradient(40% 60% at 80% 34%, rgba(255,207,122,.22), transparent 70%)",
        }} />
      ) : null}

      {/* z9 — bounds overlay (toggle): room box outline */}
      {bounds ? (
        <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-amber/70">
          <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] text-amber">room 1600×600 (8:3)</span>
        </div>
      ) : null}
    </div>
  );

  if (mode === "showcase") {
    return <div style={{ width: sceneW }}>{composed}</div>;
  }

  // BUILDING BAND MODE — 5:1 viewport over the 8:3 scene (vertical crop, no stretch)
  const bandH = displayW / BAND_ASPECT;
  const maxShift = Math.max(0, sceneH - bandH);
  const shift = focal === "top" ? 0 : focal === "bottom" ? -maxShift : -maxShift / 2;
  return (
    <div className="relative overflow-hidden border border-cyan/50" style={{ width: sceneW, height: bandH }}>
      <div style={{ transform: `translateY(${shift}px)` }}>{composed}</div>
      <span className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[9px] text-cyan">5:1 band preview · focal: {focal}</span>
    </div>
  );
}

// Resolve an agent+state to its asset path (kept local to avoid import churn).
function AGENT_ASSET(agent: (typeof AGENTS)[number], key: string): string {
  return (agent.states.find((s) => s.key === key) ?? agent.states[0]).asset;
}

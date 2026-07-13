"use client";
// A single composited IT/Dev worker. Renders the REAL asset when present,
// otherwise an OBVIOUS labeled DEV FALLBACK (never an emoji/icon/silhouette).
// Subtle motion + per-state CSS FX are applied to the static pixel-art image.
import { motion } from "framer-motion";
import type { AssetState } from "@/hooks/useAssetStatus";
import { fileName, stateOf, type SliceAgent } from "@/lib/assets/verticalSlice";

const MOTION: Record<string, { anim: Record<string, number[]>; dur: number }> = {
  idle: { anim: { y: [0, -2, 0] }, dur: 3.2 },
  coding: { anim: { y: [0, -1.5, 0] }, dur: 1.0 },
  debugging: { anim: { y: [0, -1.5, 0] }, dur: 1.1 },
  reviewing: { anim: { y: [0, -2, 0] }, dur: 2.2 },
  monitoring: { anim: { y: [0, -2, 0] }, dur: 2.2 },
  analysing: { anim: { y: [0, -2, 0] }, dur: 2.2 },
  coffee: { anim: { rotate: [0, -2, 0, 2, 0] }, dur: 3.0 },
  reading: { anim: { y: [0, -1.5, 0] }, dur: 2.6 },
  relaxing: { anim: { y: [0, -1.5, 0] }, dur: 3.6 },
};

function TypingDots() {
  return (
    <div className="absolute left-1/2 top-[8%] flex -translate-x-1/2 gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-cyan animate-blink" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}
function Steam() {
  return (
    <div className="absolute left-[58%] top-[18%] flex flex-col items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-0.5 rounded-full bg-white/40 animate-float" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </div>
  );
}
function Zzz() {
  return <div className="absolute right-[10%] top-[6%] text-[10px] font-bold text-purple/80 animate-float">z</div>;
}
function MonitorGlow({ color = "#3BE8E0" }: { color?: string }) {
  return <div className="pointer-events-none absolute inset-x-[15%] top-[20%] h-1/2 rounded-full blur-lg animate-pulseSoft" style={{ background: `${color}55` }} />;
}

function FX({ state }: { state: string }) {
  if (state === "coding" || state === "debugging") return <><MonitorGlow /><TypingDots /></>;
  if (state === "reviewing" || state === "monitoring" || state === "analysing") return <MonitorGlow />;
  if (state === "coffee") return <Steam />;
  if (state === "relaxing") return <Zzz />;
  return null;
}

export function CompositedAgent({
  agent, stateKey, status, heightPx, facing, showLabel, showBounds,
}: {
  agent: SliceAgent;
  stateKey: string;
  status: AssetState;
  heightPx: number;
  facing: "left" | "right";
  showLabel: boolean;
  showBounds: boolean;
}) {
  const st = stateOf(agent, stateKey);
  const m = MOTION[stateKey] ?? MOTION.idle;
  const width = heightPx * (2 / 3);

  return (
    <div className="relative" style={{ width, height: heightPx }}>
      {showBounds ? (
        <div className="pointer-events-none absolute inset-0 border border-dashed border-cyan/70">
          <div className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan" />
        </div>
      ) : null}

      {/* contact shadow (CSS, not an asset) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: width * 0.7, height: heightPx * 0.06, background: "rgba(0,0,0,0.4)", borderRadius: "50%", filter: "blur(2px)" }} />

      <motion.div className="absolute inset-0" animate={m.anim} transition={{ duration: m.dur, repeat: Infinity, ease: "easeInOut" }}>
        {status === "ok" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={st.asset} alt={`${agent.role} ${st.label}`}
            className="pixelated h-full w-full object-contain"
            style={{ transform: facing === "left" ? "scaleX(-1)" : undefined }} />
        ) : (
          // OBVIOUS DEV FALLBACK — clearly not final art.
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-[#FF3DAE] bg-[#FF3DAE]/10 p-1 text-center">
            <span className="text-[9px] font-bold uppercase tracking-wide text-[#FF3DAE]">DEV FALLBACK</span>
            <span className="text-[8px] font-semibold text-ink/90">{agent.role}</span>
            <span className="text-[8px] text-ink/70">{st.label}</span>
            <span className="mt-0.5 text-[7px] leading-tight text-[#FF3DAE]">✗ {fileName(st.asset)}</span>
          </div>
        )}
        {status === "ok" ? <FX state={stateKey} /> : null}
      </motion.div>

      {showLabel ? (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-ink">
          {agent.role} · {st.label}
        </div>
      ) : null}
    </div>
  );
}

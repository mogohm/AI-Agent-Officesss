"use client";
/* eslint-disable @next/next/no-img-element */
// UNIFIED TOWER LAB — A/B: Slim shell vs Wide shell vs Reference crop.
// Modes: shell-only / three-floor / six-floor hybrid. /bright-office untouched.
import { useState } from "react";
import { TOWER_FINAL, TOWER_SLIM, TowerWorker, UnifiedTower } from "@/components/bright/UnifiedTower";

const FL = "/assets/themes/reference-bright/floors";
const CH = "/assets/themes/reference-bright/characters";

const FLOORS = [
  { key: "growth", src: `${FL}/growth-floor.webp`, focal: "50% 58%" },
  { key: "quality", src: `${FL}/quality-floor.webp`, focal: "50% 58%" },
  { key: "game-studio", src: `${FL}/game-studio-floor.webp`, focal: "50% 58%" },
  { key: "art-design", src: `${FL}/art-design-floor.webp`, focal: "50% 58%" },
  { key: "engineering", src: `${FL}/engineering-floor.webp`, focal: "50% 62%" },
  { key: "product-management", src: `${FL}/product-management-floor.webp`, focal: "50% 55%" },
];
const THREE = new Set(["growth", "art-design", "engineering"]);

const WORKERS: Record<string, TowerWorker[]> = {
  engineering: [
    { src: `${CH}/engineering/frontend-developer-coding.webp`, left: 22, hMul: 0.74 },
    { src: `${CH}/engineering/backend-developer-monitoring.webp`, left: 34, hMul: 0.76 },
    { src: `${CH}/engineering/system-analyst-reviewing.webp`, left: 52, hMul: 0.7 },
  ],
  "art-design": [{ src: `${CH}/art-design/visual-designer-designing.webp`, left: 30, hMul: 0.74 }],
  growth: [{ src: `${CH}/growth/growth-strategist-analysing.webp`, left: 36, hMul: 0.74 }],
  "product-management": [{ src: `${CH}/product-management/product-manager-planning.webp`, left: 32, hMul: 0.74 }],
  quality: [{ src: `${CH}/quality/qa-engineer-testing.webp`, left: 40, hMul: 0.74 }],
  "game-studio": [],
};

export default function UnifiedTowerLab() {
  const [shellKind, setShellKind] = useState<"wide" | "slim" | "reference">("wide");
  const [rooms, setRooms] = useState<"off" | "three" | "six">("six");
  const [agents, setAgents] = useState(true);

  const geom = shellKind === "slim" ? TOWER_SLIM : TOWER_FINAL;
  const floors = FLOORS.filter((f) => rooms === "six" || (rooms === "three" && THREE.has(f.key)));
  const stageW = 640;
  const towerH = 700;
  const towerW = Math.round(towerH * geom.aspect);

  return (
    <div className="min-h-[100dvh] p-4" style={{ background: "#0D386C" }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-pixel text-[13px] text-white">UNIFIED TOWER LAB</span>
        <div className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1">
          {(["wide", "slim", "reference"] as const).map((k) => (
            <button key={k} onClick={() => setShellKind(k)}
              className={`rounded px-2 py-1 text-[11px] font-bold ${shellKind === k ? "bg-amber text-white" : "text-white/80 hover:bg-white/10"}`}>{k.toUpperCase()}</button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1">
          <span className="text-[11px] font-bold text-white/70">Rooms:</span>
          {(["off", "three", "six"] as const).map((k) => (
            <button key={k} onClick={() => setRooms(k)}
              className={`rounded px-2 py-1 text-[11px] font-bold ${rooms === k ? "bg-amber text-white" : "text-white/80 hover:bg-white/10"}`}>{k.toUpperCase()}</button>
          ))}
        </div>
        <button onClick={() => setAgents(!agents)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${agents ? "bg-lime text-white" : "bg-white/10 text-white/80"}`}>Agents {agents ? "ON" : "OFF"}</button>
      </div>

      <div id="tower-stage" className="relative mx-auto overflow-hidden rounded-xl"
        style={{ width: stageW, height: 780, background: "linear-gradient(180deg,#2561B3 0%,#2E6FC4 55%,#3B7ED2 100%)", boxShadow: "inset 0 0 0 3px #17427F" }}>
        <div className="absolute left-8 top-10 h-4 w-16 rounded-full bg-white/50" />
        <div className="absolute right-10 top-20 h-3 w-12 rounded-full bg-white/40" />
        <div className="absolute inset-x-0 bottom-0 h-40">
          {[[6, 26, 60, "#1D4E8F"], [14, 20, 44, "#245A9E"], [78, 24, 52, "#1D4E8F"], [86, 18, 40, "#245A9E"], [70, 14, 34, "#2B66AD"]].map(([l, w, h, c], i) => (
            <div key={i} className="absolute bottom-0" style={{ left: `${l}%`, width: w as number, height: h as number, background: c as string }} />
          ))}
          <div className="absolute inset-x-0 bottom-0 h-5" style={{ background: "#17427F" }} />
        </div>

        {shellKind === "reference" ? (
          <img src="/assets/reference/reference.png" alt="reference" className="absolute left-1/2 top-4 -translate-x-1/2 rounded"
            style={{ height: 740, width: "auto", objectFit: "cover", objectPosition: "31% 0%" }} />
        ) : (
          <div className="absolute left-1/2 top-6 -translate-x-1/2" style={{ width: towerW, height: towerH }}>
            <UnifiedTower geom={geom} floors={floors}
              workersFor={agents ? (key) => WORKERS[key] ?? [] : undefined}
              showRooms={rooms !== "off"} />
          </div>
        )}
      </div>
    </div>
  );
}

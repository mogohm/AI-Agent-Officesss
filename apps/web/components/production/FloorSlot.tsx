"use client";
// One physical floor of the production tower. Renders the derived 5:1 BAND
// (short + wide so a whole building fits one viewport), department-tuned focal,
// real assigned agents placed by the BAND seat map, or a room-shaped fallback.
// The 8:3 masters are reserved for Visual Lab / detail views.
import { useEffect, useRef, useState } from "react";
import type { Agent, Department } from "@/lib/types";
import { departmentIcon } from "@/lib/theme";
import { AssetImg } from "@/components/scene/AssetImg";
import { ProductionAgentSprite } from "./ProductionAgentSprite";
import { assetSrc, deptVisual, placeAgents, stateFor } from "@/lib/production/departmentConfig";

export function FloorSlot({
  department, agents, selected, onOpen, tick, minH = 82,
}: { department: Department; agents: Agent[]; selected: boolean; onOpen: () => void; tick: number; minH?: number }) {
  const color = department.theme_color || "#2F66B3";
  const visual = deptVisual(department.type);
  const ref = useRef<HTMLButtonElement>(null);
  const [h, setH] = useState(minH);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = () => setH(el.clientHeight);
    m(); const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, []);

  const placed = visual ? placeAgents(department.type, agents, true) : [];
  const mul = visual?.bandScaleMul ?? 1.0;
  const src = visual?.band ?? visual?.floor;
  const fx = (visual?.bandFocalX ?? 0.5) * 100;
  const fy = (visual?.bandFocalY ?? 0.5) * 100;

  return (
    <div className="relative flex flex-1 border-b" style={{ borderColor: "rgba(24,51,90,0.18)", minHeight: minH }}>
      {/* Floor number tab — reference-style bold floor badge */}
      <button onClick={onOpen}
        className="relative z-10 flex w-14 shrink-0 flex-col items-center justify-center gap-1 px-1 text-white transition hover:brightness-110"
        style={{ background: `linear-gradient(180deg, ${color}, ${color}cc)`, boxShadow: selected ? `inset 0 0 0 2px #fff, 0 0 12px ${color}` : "none" }}>
        <span className="grid h-6 w-6 place-items-center rounded-md bg-white/25 font-pixel text-[13px] leading-none shadow-sm">{department.floor_number}</span>
        <span className="text-center text-[8px] font-bold uppercase leading-tight tracking-wide drop-shadow">{department.name}</span>
      </button>

      {/* Room band */}
      <button ref={ref} onClick={onOpen} className="relative min-w-0 flex-1 overflow-hidden text-left"
        style={{ outline: selected ? `2px solid ${color}` : "none", outlineOffset: -2 }}>
        {src ? (
          <>
            <AssetImg src={src} alt={department.type}
              className="pixelated absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${fx}% ${fy}%` }}
              placeholder={<RoomFallback color={color} type={department.type} agents={agents.length} />} />
            {placed.map(({ agent, cfg, seat }) => {
              const st = stateFor(cfg, agent.status, tick + agent.id);
              const hp = Math.max(34, Math.round(h * 0.82 * seat.s * mul));
              return (
                <div key={agent.id} className="absolute"
                  style={{ left: `${seat.x}%`, top: `${seat.y}%`, transform: "translate(-50%,-100%)", zIndex: seat.z }}>
                  <ProductionAgentSprite src={assetSrc(cfg, st)} state={st} heightPx={hp} facing={seat.facing} name={agent.name} />
                </div>
              );
            })}
          </>
        ) : (
          <RoomFallback color={color} type={department.type} agents={agents.length} />
        )}
      </button>
    </div>
  );
}

function RoomFallback({ color, type, agents }: { color: string; type: string; agents?: number }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-0 top-0 h-[58%]" style={{ background: "linear-gradient(180deg,#dfeafa,#eef4fd)" }}>
        <div className="absolute left-2 right-2 top-2 flex h-[52%] gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ background: `linear-gradient(180deg, ${color}33, #ffffff)`, boxShadow: `inset 0 0 0 1px ${color}22` }} />
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[42%]" style={{ background: "linear-gradient(180deg,#e7eefb,#dbe6f6)" }} />
      <div className="absolute inset-0 flex items-center justify-center gap-2">
        <span className="text-xl opacity-80">{departmentIcon(type)}</span>
        <div className="rounded-md border border-dashed border-amber/60 bg-white/70 px-2 py-0.5 text-center">
          <div className="text-[9px] font-bold uppercase tracking-wide text-amber">Art Pending</div>
          <div className="text-[8px] text-muted">{type}{agents != null ? ` · ${agents} agents` : ""}</div>
        </div>
      </div>
    </div>
  );
}

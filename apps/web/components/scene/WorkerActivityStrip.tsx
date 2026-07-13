"use client";
// "8 · AI Workers" — mini activity SCENES (little windows into each department):
// a cropped, darkened floor-art background with the department's real workers in
// their live state on top. Idle Time reuses the approved idle sprites.
import { useEffect, useState } from "react";
import type { Agent, Department } from "@/lib/types";
import { departmentIcon } from "@/lib/theme";
import { assetSrc, deptVisual, placeAgents, stateFor } from "@/lib/production/departmentConfig";
import { AssetImg } from "@/components/scene/AssetImg";
import { ProductionAgentSprite } from "@/components/production/ProductionAgentSprite";

const IDLE = "/assets/characters/composited/it-dev";

export function WorkerActivityStrip({ departments, agents }: { departments: Department[]; agents: Agent[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 5000); return () => clearInterval(id); }, []);

  const withAgents = departments
    .map((d) => ({ d, list: agents.filter((a) => a.department_id === d.id) }))
    .filter((x) => x.list.length > 0)
    .slice(0, 6);

  return (
    <section className="panel rounded-xl2 border border-line bg-elevated/70 p-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-b from-neon to-purple font-pixel text-[11px] text-white">8</span>
        <div>
          <div className="text-sm font-bold text-ink">AI Workers</div>
          <div className="text-[11px] text-muted">พนักงาน AI มีชีวิต — ห้องทำงานจริงของแต่ละแผนก</div>
        </div>
      </div>

      <div className="scroll-slim flex gap-1 overflow-x-auto rounded-xl border border-line p-1 pb-1.5">
        {withAgents.map(({ d, list }) => {
          const color = d.theme_color || "#5B8CFF";
          const visual = deptVisual(d.type);
          const placed = visual ? placeAgents(d.type, list) : [];
          return (
            <div key={d.id} className="relative flex h-32 w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-line">
              {/* mini scene background = cropped floor art */}
              {visual?.floor ? (
                <AssetImg src={visual.floor} alt={d.type}
                  className="pixelated absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: `${(visual.focalX) * 100}% ${(visual.focalY) * 100}%` }}
                  placeholder={<div className="window-grid absolute inset-0" style={{ background: `linear-gradient(180deg, ${color}22, #0d1730)` }} />} />
              ) : (
                <div className="window-grid absolute inset-0" style={{ background: `linear-gradient(180deg, ${color}22, #0d1730)` }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/15" />
              <div className="z-10 flex items-center gap-1 px-2 pt-1.5 text-[11px] font-bold text-white drop-shadow"><span>{departmentIcon(d.type)}</span> {d.name}</div>
              <div className="z-10 flex flex-1 items-end justify-center gap-1 pb-1">
                {placed.length ? placed.slice(0, 3).map(({ agent, cfg }) => {
                  const st = stateFor(cfg, agent.status, tick + agent.id);
                  return <ProductionAgentSprite key={agent.id} src={assetSrc(cfg, st)} state={st} heightPx={84} facing="right" name={agent.name} />;
                }) : <span className="mb-2 rounded-full bg-black/50 px-2 py-1 text-[9px] text-amber/90">art pending · {list.length}</span>}
              </div>
            </div>
          );
        })}

        {/* Idle Time */}
        <div className="relative flex h-32 w-56 shrink-0 items-end gap-1 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-[#eef4fd] to-[#dde8f7] px-2 pb-1">
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />
          <div className="absolute left-2 top-1 z-10 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-amber shadow-sm">☕ Idle Time</div>
          {[["frontend-developer", "coffee"], ["backend-developer", "reading"], ["system-analyst", "relaxing"]].map(([p, s]) => (
            <div key={p} className="z-10"><ProductionAgentSprite src={`${IDLE}/${p}-${s}.webp`} state={s} heightPx={80} facing="right" name={p} /></div>
          ))}
        </div>
      </div>
    </section>
  );
}

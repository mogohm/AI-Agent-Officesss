"use client";
// The company HQ: rooftop + department floor scenes (top floor first) + B1
// server room. Adaptive floor height keeps workers/furniture readable, and the
// building dominates the center area. Scrolls vertically for tall buildings.
import { useMemo } from "react";
import type { Agent, AIModel, Department } from "@/lib/types";
import { useAgentBehavior } from "@/hooks/useAgentBehavior";
import { ROOFTOP_ASSET, SERVER_ROOM_ASSET } from "@/lib/assets/manifest";
import { AssetImg } from "./AssetImg";
import { DepartmentFloorScene } from "./DepartmentFloorScene";

function floorHeight(n: number): number {
  if (n <= 6) return 118;
  if (n <= 10) return 94;
  return 82;
}

export function BuildingScene({
  companyName, emoji, departments, agents, models, selectedDeptId, onOpenFloor, onOpenVPS,
}: {
  companyName: string;
  emoji: string;
  departments: Department[];
  agents: Agent[];
  models: AIModel[];
  selectedDeptId: number | null;
  onOpenFloor: (d: Department) => void;
  onOpenVPS: () => void;
}) {
  void models;
  const sorted = useMemo(() => [...departments].sort((a, b) => b.floor_number - a.floor_number), [departments]);
  const states = useAgentBehavior(agents);
  const fh = floorHeight(sorted.length);
  // Tall buildings scroll instead of shrinking below readable size.
  const scroll = sorted.length > 10;

  return (
    <div className="panel overflow-hidden rounded-xl2 border border-line bg-[#0a1120]">
      {/* Rooftop */}
      <div className="relative h-20 border-b border-black/40">
        <AssetImg
          src={ROOFTOP_ASSET}
          alt="rooftop"
          className="pixelated absolute inset-0 h-full w-full object-cover"
          placeholder={<div className="skyline absolute inset-0" />}
        />
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/25">
          <span className="text-xl">{emoji}</span>
          <span className="font-pixel text-[11px] neon-text" style={{ color: "#cfe0ff" }}>{companyName}</span>
          <span className="text-[10px] text-muted">· HQ Tower</span>
        </div>
      </div>

      {/* Floors */}
      <div className={scroll ? "scroll-slim overflow-y-auto" : ""} style={scroll ? { maxHeight: "56vh" } : undefined}>
        {sorted.map((d) => (
          <div key={d.id} className="border-b border-black/40">
            <DepartmentFloorScene
              department={d}
              floorNumber={d.floor_number}
              departmentType={d.type}
              agents={agents.filter((a) => a.department_id === d.id)}
              states={states}
              selected={selectedDeptId === d.id}
              heightPx={fh}
              onOpen={() => onOpenFloor(d)}
            />
          </div>
        ))}
        {sorted.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">ยังไม่มีชั้น — เพิ่มแผนกเพื่อสร้างชั้นแรก</div>
        ) : null}
      </div>

      {/* B1 server room */}
      <button onClick={onOpenVPS} className="relative flex h-16 w-full items-stretch text-left transition hover:brightness-110">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-black/30 bg-gradient-to-b from-cyan to-cyan/70 text-[#04212b]">
          <span className="font-pixel text-[12px] leading-none">B1</span>
          <span className="text-[7px] font-bold">VPS</span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <AssetImg
            src={SERVER_ROOM_ASSET}
            alt="server room"
            className="pixelated absolute inset-0 h-full w-full object-cover"
            placeholder={
              <div className="absolute inset-0 flex items-center gap-2 bg-[#071019] px-3">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex h-9 w-3 flex-col justify-around rounded-sm bg-[#0e2430] p-0.5">
                      {[0, 1, 2].map((j) => <span key={j} className="h-1 w-1 rounded-full bg-cyan animate-blink" style={{ animationDelay: `${(i + j) * 0.3}s` }} />)}
                    </div>
                  ))}
                </div>
                <span className="font-pixel text-[9px] text-cyan">SERVER ROOM</span>
                <span className="ml-auto text-2xl animate-float">☁️</span>
              </div>
            }
          />
        </div>
      </button>
    </div>
  );
}

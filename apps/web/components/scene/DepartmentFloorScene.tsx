"use client";
// One department = one floor scene. Composes: floor tab + room background
// (pixel-art asset) + worker sprites at seat positions + lighting overlay.
import type { Agent, Department } from "@/lib/types";
import type { CharacterState } from "@/lib/assets/manifest";
import { roomAsset } from "@/lib/assets/manifest";
import { seatsFor, accentFor } from "@/lib/assets/departmentScenes";
import { departmentIcon } from "@/lib/theme";
import { AssetImg } from "./AssetImg";
import { AgentSprite } from "./AgentSprite";

export function DepartmentFloorScene({
  department, floorNumber, departmentType, agents, states, selected, heightPx, onOpen,
}: {
  department: Department;
  floorNumber: number;
  departmentType: string;
  agents: Agent[];
  states: Record<number, CharacterState>;
  selected: boolean;
  heightPx: number;
  onOpen: () => void;
}) {
  const accent = department.theme_color || accentFor(departmentType);
  const seats = seatsFor(departmentType);

  return (
    <div className="relative flex" style={{ height: heightPx }}>
      {/* Floor tab */}
      <button
        onClick={onOpen}
        className="relative z-10 flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-black/30 text-white transition hover:brightness-110"
        style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)` }}
      >
        <span className="font-pixel text-[13px] leading-none">{floorNumber}</span>
        <span className="px-1 text-center text-[8px] font-bold leading-tight opacity-90">
          {department.name}
        </span>
      </button>

      {/* Room scene */}
      <button
        onClick={onOpen}
        className="relative flex-1 overflow-hidden text-left"
        style={{ outline: selected ? `2px solid ${accent}` : "none", outlineOffset: -2 }}
      >
        <AssetImg
          src={roomAsset(departmentType)}
          alt={`${departmentType} room`}
          className="pixelated absolute inset-0 h-full w-full object-cover"
          placeholder={
            <div className="window-grid absolute inset-0" style={{ background: `linear-gradient(180deg, ${accent}18, #0d1730)` }}>
              <div className="absolute left-2 top-1.5 text-[10px] font-bold text-ink/80">
                {departmentIcon(departmentType)} {departmentType}
              </div>
              <div className="absolute bottom-1 right-2 text-[8px] text-faint">art: floors/{department.type}</div>
            </div>
          }
        />

        {/* Workers seated in the room */}
        {seats.map((seat, i) => {
          const agent = agents[i];
          if (!agent) return null;
          return (
            <div
              key={agent.id}
              className="absolute"
              style={{
                left: `${seat.x}%`, top: `${seat.y}%`,
                transform: `translate(-50%, -100%) scale(${seat.s})`,
                zIndex: seat.z,
              }}
            >
              <AgentSprite agent={agent} state={states[agent.id] ?? "idle"} heightPx={Math.round(heightPx * 0.66)} seed={i} />
            </div>
          );
        })}

        {/* warm lighting sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3" style={{ background: `linear-gradient(180deg, ${accent}22, transparent)` }} />
      </button>
    </div>
  );
}

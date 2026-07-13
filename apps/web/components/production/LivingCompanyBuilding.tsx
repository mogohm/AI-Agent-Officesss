"use client";
// The company tower: a continuous ProductionBuildingShell whose floors are
// department FloorSlots (real IT/Dev art or room-shaped fallbacks). Fills the
// height of its parent so the building dominates the center column.
import { useEffect, useMemo, useState } from "react";
import type { Agent, AIModel, Department } from "@/lib/types";
import { ProductionBuildingShell } from "./ProductionBuildingShell";
import { FloorSlot } from "./FloorSlot";

export function LivingCompanyBuilding({
  companyName, emoji, departments, agents, models, selectedDeptId, onOpenFloor, onOpenVPS,
}: {
  companyName: string; emoji: string; departments: Department[]; agents: Agent[];
  models: AIModel[]; selectedDeptId: number | null;
  onOpenFloor: (d: Department) => void; onOpenVPS: () => void;
}) {
  void models;
  const sorted = useMemo(() => [...departments].sort((a, b) => b.floor_number - a.floor_number), [departments]);
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 5000); return () => clearInterval(id); }, []);

  // Adaptive fit: 1–10 floors show simultaneously (flex distributes the height,
  // clamped by a small min so rooms stay readable); 11–15 fall back to scroll.
  const n = sorted.length;
  const fit = n <= 10;
  const minH = fit ? Math.max(52, Math.min(96, Math.round(560 / Math.max(1, n)))) : 88;

  return (
    <ProductionBuildingShell companyName={companyName} emoji={emoji} floorCount={n} onOpenVPS={onOpenVPS} fit={fit}>
      {n === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">ยังไม่มีชั้น — เพิ่มแผนก</div>
      ) : sorted.map((d) => (
        <FloorSlot key={d.id} department={d} agents={agents.filter((a) => a.department_id === d.id)}
          selected={selectedDeptId === d.id} onOpen={() => onOpenFloor(d)} tick={tick} minH={minH} />
      ))}
    </ProductionBuildingShell>
  );
}

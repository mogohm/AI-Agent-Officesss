"use client";
// The building frame that ties floors into ONE tower — now a LIGHT, glassy
// structure so the rooms read first and the frame second. Floor content
// (FloorSlots) passed as children.
import { ReactNode } from "react";

export function ProductionBuildingShell({
  companyName, emoji, floorCount, children, onOpenVPS, fit = true,
}: {
  companyName: string; emoji: string; floorCount: number; children: ReactNode; onOpenVPS: () => void; fit?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl2 border border-line bg-elevated shadow-card">
      <Rooftop companyName={companyName} emoji={emoji} />

      <div className="relative flex min-h-0 flex-1">
        <div className="w-1 shrink-0" style={{ background: "linear-gradient(180deg,#cdddf3,#e7f0fb)" }} />
        <div className={`flex min-h-0 flex-1 flex-col ${fit ? "overflow-hidden" : "overflow-y-auto scroll-slim"}`}>{children}</div>
        <ElevatorShaft floorCount={floorCount} />
        <div className="w-1 shrink-0" style={{ background: "linear-gradient(180deg,#cdddf3,#e7f0fb)" }} />
      </div>

      {/* B1 basement */}
      <button onClick={onOpenVPS} className="flex h-14 shrink-0 items-stretch border-t border-line text-left transition hover:brightness-[0.98]">
        <div className="flex w-14 shrink-0 flex-col items-center justify-center bg-gradient-to-b from-cyan to-cyan/80 text-white">
          <span className="font-pixel text-[12px] leading-none">B1</span><span className="text-[7px] font-bold">VPS</span>
        </div>
        <div className="relative flex flex-1 items-center gap-2 overflow-hidden bg-surface px-3">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex h-6 w-2.5 flex-col justify-around rounded-sm border border-line bg-white p-0.5">
                {[0, 1, 2].map((j) => <span key={j} className="h-0.5 w-0.5 rounded-full bg-cyan animate-blink" style={{ animationDelay: `${(i + j) * 0.3}s` }} />)}
              </div>
            ))}
          </div>
          <span className="font-pixel text-[9px] text-cyan">SERVER ROOM</span>
          <span className="ml-auto text-lg animate-float">☁️</span>
        </div>
      </button>
      <div className="h-1.5 shrink-0" style={{ background: "linear-gradient(180deg,#cdddf3,#b9cde8)" }} />
    </div>
  );
}

function Rooftop({ companyName, emoji }: { companyName: string; emoji: string }) {
  return (
    <div className="skyline relative flex h-[52px] shrink-0 items-center justify-center gap-2 border-b border-line">
      <span className="text-lg">{emoji}</span>
      <span className="font-pixel text-[11px]" style={{ color: "#2F66B3" }}>{companyName}</span>
      <span className="text-[10px] text-muted">· HQ Tower</span>
      <div className="absolute left-6 top-1 h-2.5 w-5 rounded-sm bg-white/70 shadow-sm" />
      <div className="absolute right-8 top-1 h-2.5 w-4 rounded-sm bg-white/70 shadow-sm" />
      <div className="absolute right-16 top-0 h-3 w-px bg-neon" />
      <div className="absolute right-[63px] top-0 h-1 w-1 rounded-full bg-pink animate-twinkle" />
    </div>
  );
}

function ElevatorShaft({ floorCount }: { floorCount: number }) {
  const n = Math.max(1, floorCount);
  return (
    <div className="relative w-7 shrink-0 overflow-hidden border-l border-line" style={{ background: "linear-gradient(180deg,#eef5ff,#e2ecfa)" }}>
      <div className="flex h-full flex-col">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="relative flex-1 border-b border-line">
            <div className="absolute inset-x-1 top-1 bottom-1 rounded-sm border border-line bg-white/80">
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line" />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute right-0.5 top-2 h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_6px_#1594B0]" />
    </div>
  );
}

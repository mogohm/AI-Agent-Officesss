"use client";
import { useState } from "react";
import { workerSprite, RUNTIME_COLOR, RUNTIME_LABEL } from "@/lib/office-assets";

export type SpriteWorker = {
  id: string;
  name: string;
  runtimeStatus: string;
  avatarKey?: string;
  role?: string;
  currentTask?: string | null;
};

const GLOW: Record<string, string> = {
  WORKING: "glow-working anim-working",
  THINKING: "glow-thinking anim-thinking",
  WAITING_APPROVAL: "glow-waiting anim-waiting",
  ERROR: "glow-error anim-error",
};

/**
 * A real pixel-art worker sprite with runtime-status glow/animation and a status
 * dot. Falls back to initials only if the sprite image fails to load.
 */
export function WorkerSprite({ worker, size = 52 }: { worker: SpriteWorker; size?: number }) {
  const [broken, setBroken] = useState(false);
  const status = worker.runtimeStatus;
  const color = RUNTIME_COLOR[status] ?? "#657A91";
  const offline = status === "OFFLINE";
  const glow = GLOW[status] ?? "";
  const src = workerSprite(worker.avatarKey, worker.role, status);
  const title = `${worker.name} · ${RUNTIME_LABEL[status] ?? status.toLowerCase()}${worker.currentTask ? ` · ${worker.currentTask}` : ""}`;

  return (
    <div className="group/w relative shrink-0" style={{ width: size, height: size }} title={title}>
      {broken ? (
        <span
          className="grid h-full w-full place-items-center rounded-full bg-[#12233A] text-[11px] font-bold text-slate-200 ring-1 ring-white/15"
        >
          {worker.name.slice(0, 2).toUpperCase()}
        </span>
      ) : (
        <img
          src={src}
          alt={worker.name}
          onError={() => setBroken(true)}
          className={`pixelated h-full w-full object-contain object-bottom ${glow} ${offline ? "opacity-45 grayscale" : ""}`}
          loading="lazy"
        />
      )}
      <span
        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#0a1626]"
        style={{ background: color, boxShadow: offline ? "none" : `0 0 5px ${color}` }}
        aria-hidden
      />
    </div>
  );
}

"use client";
/* eslint-disable @next/next/no-img-element */
// UnifiedReferenceTower — ONE continuous building: shell base (architecture),
// dynamic floor interiors clipped into the measured openings, worker layer,
// optional selection outline. Shared by /visual-lab/unified-tower and
// /bright-office. Geometry is measured per shell variant (grid overlays in
// outputs/reference-diff/unified-tower/).

export interface TowerGeom {
  shell: string;
  aspect: number;            // shell image w/h
  xL: number; xR: number;    // opening inner edges (% of shell)
  colL: number; colR: number;// front corner column band (kept visible)
  topY: number;              // top-left Y of opening 1 (%)
  pitch: number;             // per-floor Y step (%)
  h: number;                 // opening height at left edge (%)
  skew: number;              // right-edge vertical shift (%; negative = up)
}

const B = "/assets/themes/reference-bright/buildings";

// FINAL: deterministic 3-slice widening of the slim shell (0.673 w/h,
// six openings preserved by construction — docs/TOWER_9SLICE_GEOMETRY.md).
export const TOWER_FINAL: TowerGeom = {
  shell: `${B}/reference-bright-tower-shell-final-wide.webp`, aspect: 1307 / 1536,
  xL: 20.0, xR: 71.4, colL: 49.6, colR: 51.4,
  topY: 29.8, pitch: 7.45, h: 6.5, skew: -4.2,
};

// v3 generated wide shell — REJECTED (five openings), kept for audit only.
export const TOWER_WIDE: TowerGeom = {
  shell: `${B}/reference-bright-tower-shell-v3-wide.webp`, aspect: 1024 / 1024,
  xL: 15.5, xR: 62.8, colL: 44.3, colR: 45.8,
  topY: 22.4, pitch: 8.05, h: 6.4, skew: -4.4,
};

export const TOWER_SLIM: TowerGeom = {
  shell: `${B}/reference-bright-tower-shell-v2-slim.webp`, aspect: 1024 / 1536,
  xL: 25.5, xR: 63.5, colL: 47.4, colR: 48.7,
  topY: 29.8, pitch: 7.45, h: 6.5, skew: -4.2,
};

export interface TowerFloor {
  key: string;
  src?: string;        // absent → the shell's baked neutral interior shows (Bright fallback room)
  focal?: string;
  selected?: boolean;
  color?: string;
  onClick?: () => void;
}

export interface TowerWorker {
  src: string;
  left: number;   // % of shell width
  hMul: number;   // height as fraction of opening height
  title?: string;
}

export function yAt(g: TowerGeom, x: number, yL: number): number {
  return yL + ((x - g.xL) / (g.xR - g.xL)) * g.skew;
}

export function openingOf(g: TowerGeom, i: number) {
  const yL = g.topY + i * g.pitch;
  const pane = (a: number, b: number) =>
    `polygon(${a}% ${yAt(g, a, yL)}%, ${b}% ${yAt(g, b, yL)}%, ${b}% ${yAt(g, b, yL) + g.h}%, ${a}% ${yAt(g, a, yL) + g.h}%)`;
  return { yL, clips: [pane(g.xL, g.colL), pane(g.colR, g.xR)], top: yL + g.skew };
}

export function UnifiedTower({
  geom, floors, workersFor, showRooms = true, shellFilter,
}: {
  geom: TowerGeom;
  floors: TowerFloor[];               // ordered top (floor 6) → bottom (floor 1)
  workersFor?: (key: string, opening: { yL: number }) => TowerWorker[];
  showRooms?: boolean;
  shellFilter?: string;               // render-only CSS filter on the shell layer (asset untouched)
}) {
  return (
    <div className="relative h-full w-full">
      {/* shell base */}
      <img src={geom.shell} alt="tower" className="pixelated pointer-events-none absolute inset-0 z-0 h-full w-full"
        style={shellFilter ? { filter: shellFilter } : undefined} />

      {/* floor interiors */}
      {showRooms && floors.map((f, i) => {
        const o = openingOf(geom, i);
        return (
          <div key={f.key}>
            {o.clips.map((clip, k) => (
              <div key={k} className="absolute inset-0 z-10 cursor-pointer" style={{ clipPath: clip }} onClick={f.onClick}>
                {f.src ? (
                  <img src={f.src} alt={f.key} className="pixelated absolute object-cover"
                    style={{ left: `${geom.xL}%`, width: `${geom.xR - geom.xL}%`, top: `${o.top - 0.3}%`, height: `${geom.h - geom.skew + 0.6}%`, objectPosition: f.focal ?? "50% 58%" }} />
                ) : null}
                {f.selected ? <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 0 2px ${f.color ?? "#F5C25B"}`, clipPath: clip }} /> : null}
              </div>
            ))}
            {/* workers */}
            {(workersFor?.(f.key, o) ?? []).map((w, j) => (
              <div key={j} className="group absolute z-20" style={{ left: `${w.left}%`, top: `${yAt(geom, w.left, o.yL) + geom.h - geom.h * w.hMul - 0.3}%`, height: `${geom.h * w.hMul}%` }}>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[2px]" style={{ width: "60%", height: 4, background: "rgba(20,32,52,0.25)" }} />
                <img src={w.src} alt={w.title ?? ""} className="pixelated relative h-full w-auto" />
                {w.title ? (
                  <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white/90 px-1 text-[8px] font-bold text-[#17325C] opacity-0 shadow-sm transition group-hover:opacity-100">{w.title}</span>
                ) : null}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

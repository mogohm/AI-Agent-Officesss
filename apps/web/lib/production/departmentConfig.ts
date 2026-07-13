// Config-driven production art + presentation. Per department: floor asset,
// focal crop, floor slot height, agent scale, and a seat map (positions with
// depth). Adding a department's art is data-only.
import type { Agent } from "@/lib/types";

export interface Seat { x: number; y: number; s: number; z: number; facing: "left" | "right" }

export interface CharConfig {
  charId: string;
  dir: string;
  prefix: string;
  seat: number;                       // index into DeptVisual.seats
  match?: (role: string) => boolean;
  states: { work: string; think: string; idle: string[] };
  statusStates?: Record<string, string>;
}

export interface DeptVisual {
  floor?: string;                     // 8:3 MASTER (Visual Lab / detail / showcase)
  focalX: number;
  focalY: number;
  slotHeight: number;                 // px min-height of this floor (taller = less crop)
  agentScaleMul: number;              // production agent size multiplier
  seats: Seat[];
  characters: CharConfig[];
  // --- Production 5:1 BAND (multi-floor tower) ---
  band?: string;                      // derived 1600x320 band asset
  bandFocalX: number;                 // object-position X inside the short slot
  bandFocalY: number;                 // object-position Y inside the short slot
  bandScaleMul: number;               // agent size multiplier in band mode
  bandSeats: Seat[];                  // production seat map for the short band
}

const FLOORS = "/assets/office/floors";
const CHARS = "/assets/characters/composited";

const WORK = new Set(["coding", "designing", "writing", "testing", "reviewing", "meeting"]);
const THINK = new Set(["thinking", "planning"]);
function activityOf(status: string): "work" | "think" | "idle" {
  if (WORK.has(status)) return "work";
  if (THINK.has(status) || status === "error") return "think";
  return "idle";
}

const itDevChars: CharConfig[] = [
  { charId: "frontend-developer", dir: `${CHARS}/it-dev`, prefix: "frontend-developer", seat: 0,
    match: (r) => r.toLowerCase().includes("frontend"),
    states: { work: "coding", think: "reviewing", idle: ["idle", "coffee"] }, statusStates: { reviewing: "reviewing" } },
  { charId: "backend-developer", dir: `${CHARS}/it-dev`, prefix: "backend-developer", seat: 1,
    match: (r) => /backend|devops|database|developer/i.test(r),
    states: { work: "debugging", think: "monitoring", idle: ["idle", "reading"] }, statusStates: { testing: "debugging", reviewing: "monitoring" } },
  { charId: "system-analyst", dir: `${CHARS}/it-dev`, prefix: "system-analyst", seat: 2,
    match: (r) => /analyst|qa|research|data|document/i.test(r),
    states: { work: "analysing", think: "reviewing", idle: ["idle", "relaxing"] }, statusStates: { reviewing: "reviewing" } },
];

function single(dir: string, prefix: string, work: string, think: string, idle: string[]): CharConfig[] {
  return [{ charId: prefix, dir, prefix, seat: 0, states: { work, think, idle } }];
}

// Seat maps (percent of the 8:3 room). Varied x/y + depth (z) + facing, never a
// straight line; back seats slightly smaller.
const IT_SEATS: Seat[] = [
  { x: 23, y: 68, s: 1.0, z: 2, facing: "right" },
  { x: 50, y: 72, s: 1.08, z: 3, facing: "left" },
  { x: 77, y: 65, s: 0.9, z: 1, facing: "right" },
];
const ONE_SEAT: Seat[] = [{ x: 50, y: 71, s: 1.0, z: 3, facing: "left" }];

// Band seat maps — production-specific coordinates for the short 5:1 band (NOT
// the Visual-Lab showcase coords). Workers sit low and read at a smaller scale.
const IT_BAND_SEATS: Seat[] = [
  { x: 24, y: 82, s: 1.0, z: 2, facing: "right" },
  { x: 50, y: 86, s: 1.06, z: 3, facing: "left" },
  { x: 76, y: 80, s: 0.9, z: 1, facing: "right" },
];
const ONE_BAND_SEAT: Seat[] = [{ x: 52, y: 84, s: 1.0, z: 3, facing: "left" }];

export const DEPT_VISUALS: Record<string, DeptVisual> = {
  "IT / Dev": { floor: `${FLOORS}/it-dev/it-dev-floor-base.webp`, focalX: 0.5, focalY: 0.62, slotHeight: 185, agentScaleMul: 1.2, seats: IT_SEATS, characters: itDevChars,
    band: `${FLOORS}/it-dev/it-dev-floor-band.webp`, bandFocalX: 0.5, bandFocalY: 0.54, bandScaleMul: 1.0, bandSeats: IT_BAND_SEATS },
  "Design": { floor: `${FLOORS}/art-design/art-design-floor-base.webp`, focalX: 0.5, focalY: 0.6, slotHeight: 185, agentScaleMul: 1.2, seats: ONE_SEAT,
    characters: single(`${CHARS}/art-design`, "pixel-designer", "designing", "sketching", ["idle"]),
    band: `${FLOORS}/art-design/art-design-floor-band.webp`, bandFocalX: 0.5, bandFocalY: 0.52, bandScaleMul: 1.0, bandSeats: ONE_BAND_SEAT },
  "Game Studio": { floor: `${FLOORS}/game-studio/game-studio-floor-base.webp`, focalX: 0.5, focalY: 0.6, slotHeight: 185, agentScaleMul: 1.2, seats: ONE_SEAT,
    characters: single(`${CHARS}/game-studio`, "quest-gamedesigner", "working", "working", ["idle"]),
    band: `${FLOORS}/game-studio/game-studio-floor-band.webp`, bandFocalX: 0.5, bandFocalY: 0.5, bandScaleMul: 1.0, bandSeats: ONE_BAND_SEAT },
  "QA / Tester": { floor: `${FLOORS}/quality/quality-floor-base.webp`, focalX: 0.5, focalY: 0.6, slotHeight: 185, agentScaleMul: 1.2, seats: ONE_SEAT,
    characters: single(`${CHARS}/quality`, "scout-qa", "working", "working", ["idle"]),
    band: `${FLOORS}/quality/quality-floor-band.webp`, bandFocalX: 0.5, bandFocalY: 0.5, bandScaleMul: 1.0, bandSeats: ONE_BAND_SEAT },
  "Marketing": { floor: `${FLOORS}/growth/growth-floor-base.webp`, focalX: 0.5, focalY: 0.6, slotHeight: 185, agentScaleMul: 1.2, seats: ONE_SEAT,
    characters: single(`${CHARS}/growth`, "echo-marketer", "working", "working", ["idle"]),
    band: `${FLOORS}/growth/growth-floor-band.webp`, bandFocalX: 0.5, bandFocalY: 0.47, bandScaleMul: 1.0, bandSeats: ONE_BAND_SEAT },
  "Product Management": { floor: `${FLOORS}/product-management/product-management-floor-base.webp`, focalX: 0.5, focalY: 0.6, slotHeight: 185, agentScaleMul: 1.2, seats: ONE_SEAT,
    characters: single(`${CHARS}/product-management`, "nova-pm", "working", "working", ["idle"]),
    band: `${FLOORS}/product-management/product-management-floor-band.webp`, bandFocalX: 0.5, bandFocalY: 0.51, bandScaleMul: 1.0, bandSeats: ONE_BAND_SEAT },
};

// Production 5:1 band config, surfaced separately for tuning/tooling.
export interface FloorBandConfig { sourcePath?: string; bandPath?: string; focalX: number; focalY: number; displayScale: number; seats: Seat[] }
export const productionFloorBandConfig: Record<string, FloorBandConfig> = Object.fromEntries(
  Object.entries(DEPT_VISUALS).map(([type, v]) => [type, {
    sourcePath: v.floor, bandPath: v.band, focalX: v.bandFocalX, focalY: v.bandFocalY, displayScale: v.bandScaleMul, seats: v.bandSeats,
  }]),
);

export function deptVisual(type: string): DeptVisual | undefined { return DEPT_VISUALS[type]; }
export function assetSrc(c: CharConfig, state: string): string { return `${c.dir}/${c.prefix}-${state}.webp`; }

export function stateFor(c: CharConfig, status: string, tick: number): string {
  if (c.statusStates && c.statusStates[status]) return c.statusStates[status];
  const a = activityOf(status);
  if (a === "work") return c.states.work;
  if (a === "think") return c.states.think;
  return c.states.idle[tick % c.states.idle.length];
}

/** Assign a department's agents to distinct character identities (no cloning).
 *  `band` selects the production band seat map instead of the showcase seats. */
export function placeAgents(type: string, agents: Agent[], band = false): { agent: Agent; cfg: CharConfig; seat: Seat }[] {
  const v = DEPT_VISUALS[type];
  if (!v) return [];
  const seats = band ? v.bandSeats : v.seats;
  const used = new Set<string>();
  const out: { agent: Agent; cfg: CharConfig; seat: Seat }[] = [];
  for (const a of agents) {
    const cfg = v.characters.find((c) => c.match?.(a.role) && !used.has(c.charId))
      ?? v.characters.find((c) => !used.has(c.charId));
    if (!cfg) continue; // no free distinct identity → skip (never clone a sprite)
    used.add(cfg.charId);
    out.push({ agent: a, cfg, seat: seats[Math.min(cfg.seat, seats.length - 1)] });
  }
  return out;
}

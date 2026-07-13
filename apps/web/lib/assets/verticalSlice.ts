// Phase-1 vertical slice data: IT / Development floor + 3 composited agents.
// Data-only (paths, states, positions) so visual tuning never touches components.
// Exact paths/dimensions per docs/VERTICAL_SLICE_IT_DEV.md.

export const ROOM = { w: 1600, h: 600, aspect: 8 / 3 } as const;
export const SHOWCASE_ASPECT = 8 / 3;
export const BAND_ASPECT = 5 / 1;

/** Character display height = scene height × this × seat.scale. */
export const CHAR_HEIGHT_RATIO = 0.46;

export const IT_DEV_FLOOR_ASSET = "/assets/office/floors/it-dev/it-dev-floor-base.webp";
const C = "/assets/characters/composited/it-dev";

export type Facing = "left" | "right";
export interface Pos { x: number; y: number; s: number; z: number; facing: Facing }
export type StateCategory = "idle" | "work";

export interface SliceState {
  key: string;
  label: string;
  category: StateCategory;
  asset: string;
  pos?: Partial<Pos>; // override of the agent base position for this state
}

export interface SliceAgent {
  id: string;
  role: string;
  base: Pos;
  states: SliceState[]; // ordered for the control dropdown (idle first)
  default: string;
}

export const AGENTS: SliceAgent[] = [
  {
    id: "frontend-developer",
    role: "Frontend Developer",
    // Display scale tuned down (was 1.0) so the sprite matches room furniture.
    base: { x: 25, y: 66, s: 0.72, z: 3, facing: "right" },
    default: "idle",
    states: [
      { key: "idle", label: "Idle", category: "idle", asset: `${C}/frontend-developer-idle.webp` },
      { key: "coding", label: "Coding", category: "work", asset: `${C}/frontend-developer-coding.webp` },
      { key: "reviewing", label: "Reviewing UI", category: "work", asset: `${C}/frontend-developer-reviewing.webp` },
      { key: "coffee", label: "Coffee (window)", category: "idle", asset: `${C}/frontend-developer-coffee.webp`, pos: { x: 90, y: 60, s: 0.72, z: 5, facing: "left" } },
    ],
  },
  {
    id: "backend-developer",
    role: "Backend Developer",
    // Display scale tuned (was 1.05); B is taller/broader than A (0.72).
    base: { x: 50, y: 70, s: 0.74, z: 4, facing: "left" },
    default: "idle",
    states: [
      { key: "idle", label: "Idle", category: "idle", asset: `${C}/backend-developer-idle.webp` },
      { key: "debugging", label: "Debugging", category: "work", asset: `${C}/backend-developer-debugging.webp` },
      { key: "monitoring", label: "Monitoring", category: "work", asset: `${C}/backend-developer-monitoring.webp` },
      { key: "reading", label: "Reading", category: "idle", asset: `${C}/backend-developer-reading.webp`, pos: { x: 62, y: 66, s: 0.74 } },
    ],
  },
  {
    id: "system-analyst",
    role: "System Analyst",
    // Display scale tuned (was 0.95); C is shorter/slimmer than A (0.72) / B (0.74).
    base: { x: 76, y: 63, s: 0.69, z: 2, facing: "right" },
    default: "idle",
    states: [
      { key: "idle", label: "Idle", category: "idle", asset: `${C}/system-analyst-idle.webp` },
      { key: "reviewing", label: "Reviewing Arch.", category: "work", asset: `${C}/system-analyst-reviewing.webp` },
      { key: "analysing", label: "Analysing", category: "work", asset: `${C}/system-analyst-analysing.webp` },
      { key: "relaxing", label: "Relaxing", category: "idle", asset: `${C}/system-analyst-relaxing.webp`, pos: { x: 82, y: 66, z: 2, facing: "left" } },
    ],
  },
];

export function stateOf(agent: SliceAgent, key: string): SliceState {
  return agent.states.find((s) => s.key === key) ?? agent.states[0];
}

export function posFor(agent: SliceAgent, key: string): Pos {
  const st = stateOf(agent, key);
  return { ...agent.base, ...(st.pos ?? {}) };
}

export function idleStates(agent: SliceAgent): string[] {
  return agent.states.filter((s) => s.category === "idle").map((s) => s.key);
}

/** All 13 required asset paths (floor + 12 character states). */
export const ALL_ASSET_PATHS: string[] = [
  IT_DEV_FLOOR_ASSET,
  ...AGENTS.flatMap((a) => a.states.map((s) => s.asset)),
];

export function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

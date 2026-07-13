// Reference-Bright Office scene configuration (VISUAL PREVIEW CONFIG).
// Pure presentation: floors, workers, seats and the staggered state machine
// for the /bright-office preview. Real business data (departments, agents,
// projects) stays in the API layer — this file only maps it onto the scene.

export interface BrightSeat { x: number; y: number; s: number; z: number; flip?: boolean }

export interface BrightWorker {
  id: string;
  label: string;
  dir: string;                       // asset dir under /assets/themes/reference-bright/characters
  prefix: string;
  seat: BrightSeat;
  states: { work: string[]; review: string; idle: string[] };
  initial: string;                   // first-paint state (before rotation kicks in)
  match?: (role: string) => boolean; // maps a real agent onto this identity
}

export interface BrightDept {
  type: string;                      // DB department.type this floor represents
  key: string;
  floorNumber: number;               // preview tower position (6 top … 1 bottom)
  label: string;
  th: string;
  color: string;
  floor: string;                     // bright floor asset
  focal: string;                     // object-position for the tower band
  workers: BrightWorker[];
}

const CH = "/assets/themes/reference-bright/characters";
const FL = "/assets/themes/reference-bright/floors";

const one = (dept: string, prefix: string, label: string, seat: BrightSeat,
  states: BrightWorker["states"], initial: string): BrightWorker[] => [
  { id: prefix, label, dir: `${CH}/${dept}`, prefix, seat, states, initial },
];

export const BRIGHT_DEPTS: BrightDept[] = [
  {
    type: "Marketing", key: "growth", floorNumber: 6, label: "GROWTH", th: "แผนกการตลาด / เติบโต", color: "#D98A3D",
    floor: `${FL}/growth-floor.webp`, focal: "50% 58%",
    workers: one("growth", "growth-strategist", "Growth Strategist", { x: 46, y: 96, s: 0.56, z: 3 },
      { work: ["analysing"], review: "analysing", idle: ["idle", "coffee"] }, "analysing"),
  },
  {
    type: "QA / Tester", key: "quality", floorNumber: 5, label: "QUALITY", th: "แผนกคุณภาพ", color: "#2F9BB0",
    floor: `${FL}/quality-floor.webp`, focal: "50% 58%",
    workers: one("quality", "qa-engineer", "QA Engineer", { x: 52, y: 96, s: 0.56, z: 3 },
      { work: ["testing"], review: "reviewing", idle: ["idle", "reviewing"] }, "testing"),
  },
  {
    type: "Game Studio", key: "game-studio", floorNumber: 4, label: "GAME STUDIO", th: "เกมสตูดิโอ", color: "#D9A73D",
    floor: `${FL}/game-studio-floor.webp`, focal: "50% 58%",
    workers: one("game-studio", "game-designer", "Game Designer", { x: 44, y: 96, s: 0.56, z: 3 },
      { work: ["designing"], review: "playtesting", idle: ["idle", "playtesting"] }, "playtesting"),
  },
  {
    type: "Design", key: "art-design", floorNumber: 3, label: "ART & DESIGN", th: "แผนกออกแบบ", color: "#C75FA4",
    floor: `${FL}/art-design-floor.webp`, focal: "50% 58%",
    workers: one("art-design", "visual-designer", "Visual Designer", { x: 40, y: 96, s: 0.56, z: 3 },
      { work: ["designing"], review: "sketching", idle: ["idle", "sketching"] }, "designing"),
  },
  {
    type: "IT / Dev", key: "engineering", floorNumber: 2, label: "ENGINEERING", th: "แผนกวิศวกรรม", color: "#2E7BC4",
    floor: `${FL}/engineering-floor.webp`, focal: "50% 62%",
    workers: [
      { id: "frontend-developer", label: "Frontend Developer", dir: `${CH}/engineering`, prefix: "frontend-developer",
        seat: { x: 17, y: 96, s: 0.56, z: 3 }, match: (r) => /frontend/i.test(r),
        states: { work: ["coding"], review: "reviewing", idle: ["idle", "coffee"] }, initial: "coding" },
      { id: "backend-developer", label: "Backend Developer", dir: `${CH}/engineering`, prefix: "backend-developer",
        seat: { x: 50, y: 94.5, s: 0.568, z: 4 }, match: (r) => /backend|devops|database|developer/i.test(r),
        states: { work: ["monitoring", "debugging"], review: "monitoring", idle: ["idle", "reading"] }, initial: "monitoring" },
      { id: "system-analyst", label: "System Analyst", dir: `${CH}/engineering`, prefix: "system-analyst",
        seat: { x: 81, y: 94, s: 0.504, z: 3 }, match: (r) => /analyst|qa|research|data|document/i.test(r),
        states: { work: ["analysing"], review: "reviewing", idle: ["idle", "relaxing"] }, initial: "reviewing" },
    ],
  },
  {
    type: "Product Management", key: "product-management", floorNumber: 1, label: "PRODUCT MGMT", th: "แผนกผลิตภัณฑ์", color: "#7B5BD6",
    floor: `${FL}/product-management-floor.webp`, focal: "50% 55%",
    workers: one("product-management", "product-manager", "Product Manager", { x: 34, y: 96, s: 0.56, z: 3 },
      { work: ["planning"], review: "planning", idle: ["idle", "coffee"] }, "planning"),
  },
];

export function brightDeptFor(type: string): BrightDept | undefined {
  return BRIGHT_DEPTS.find((d) => d.type === type);
}

// Generic Bright worker fallback — used for real agents whose department type
// or role has no dedicated Bright identity yet (never dark art, never cloned
// named identities). Reuses the approved Product Manager silhouette.
export const GENERIC_BRIGHT_WORKER: BrightWorker = {
  id: "generic-bright-worker",
  label: "AI Worker",
  dir: `${CH}/product-management`,
  prefix: "product-manager",
  seat: { x: 40, y: 96, s: 0.56, z: 3 },
  states: { work: ["planning"], review: "planning", idle: ["idle", "coffee"] },
  initial: "idle",
};

export function brightAssetSrc(w: BrightWorker, state: string): string {
  return `${w.dir}/${w.prefix}-${state || w.initial || "idle"}.webp`;
}

// ---------- staggered state machine ----------
// Deterministic per (worker, seed): phases WORK → IDLE → WORK → REVIEW → IDLE-VAR,
// durations 8–18s (active) / 12–30s (idle) derived from a stable hash so the
// office never synchronizes and never flickers chaotically.
function hash(n: number): number { return ((n * 2654435761) ^ (n << 7)) >>> 0; }

export function brightStateAt(w: BrightWorker, seed: number, tSec: number): string {
  const h = hash(seed + w.prefix.length * 31);
  const workA = 10 + (h % 9);          // 10–18
  const idleA = 14 + ((h >> 3) % 17);  // 14–30
  const workB = 8 + ((h >> 6) % 11);   // 8–18
  const review = 8 + ((h >> 9) % 7);   // 8–14
  const idleB = 12 + ((h >> 12) % 19); // 12–30
  const phases: [number, () => string][] = [
    [workA, () => w.states.work[h % w.states.work.length]],
    [idleA, () => w.states.idle[0]],
    [workB, () => w.states.work[(h >> 4) % w.states.work.length]],
    [review, () => w.states.review],
    [idleB, () => w.states.idle[(h >> 8) % w.states.idle.length]],
  ];
  const total = phases.reduce((s, [d]) => s + d, 0);
  // stable offset so workers start at different phase points
  let t = (tSec + (h % total)) % total;
  for (const [d, f] of phases) {
    if (t < d) return f();
    t -= d;
  }
  return w.states.idle[0];
}

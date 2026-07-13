// Per-department scene configuration: seat layout, character look pool, accent,
// and the "department feature" label. Tune seat coordinates against the
// generated room art (percentages of the 640×420 room box).
import type { CharacterLook } from "./manifest";

export interface Seat {
  x: number; // % of room width
  y: number; // % of room height (chair position)
  s: number; // sprite scale
  z: number; // stacking order (higher = front)
  lounge?: boolean; // relaxation spot (idle-friendly)
}

// A reasonable default 4-seat layout; override per type where useful.
const DEFAULT_SEATS: Seat[] = [
  { x: 26, y: 64, s: 0.92, z: 2 },
  { x: 46, y: 72, s: 1.0, z: 3 },
  { x: 66, y: 64, s: 0.92, z: 2 },
  { x: 83, y: 56, s: 0.82, z: 1, lounge: true },
];

const SEATS_BY_TYPE: Record<string, Seat[]> = {
  "IT / Dev": [
    { x: 24, y: 66, s: 0.95, z: 2 },
    { x: 44, y: 73, s: 1.0, z: 3 },
    { x: 64, y: 66, s: 0.95, z: 2 },
    { x: 82, y: 58, s: 0.82, z: 1, lounge: true },
  ],
  "HR": [
    { x: 30, y: 70, s: 1.0, z: 3 },
    { x: 55, y: 66, s: 0.95, z: 2 },
    { x: 80, y: 60, s: 0.85, z: 1, lounge: true },
  ],
  "Lobby / Support": [
    { x: 32, y: 72, s: 1.0, z: 3 },
    { x: 70, y: 62, s: 0.9, z: 2, lounge: true },
  ],
};

export function seatsFor(departmentType: string): Seat[] {
  return SEATS_BY_TYPE[departmentType] ?? DEFAULT_SEATS;
}

/** Map an agent role to a character look (for outfit/hair). */
const ROLE_LOOK: Record<string, CharacterLook> = {
  "Project Manager Agent": "pm",
  "Business Analyst Agent": "pm",
  "System Analyst Agent": "pm",
  "Developer Agent": "dev-a",
  "Backend Developer Agent": "dev-a",
  "Frontend Developer Agent": "dev-b",
  "Database Agent": "dev-b",
  "DevOps Agent": "dev-a",
  "UI/UX Designer Agent": "designer",
  "Game Designer Agent": "designer",
  "QA Tester Agent": "qa",
  "Research Agent": "qa",
  "Marketing Agent": "marketer",
  "Sales Agent": "sales",
  "HR Agent": "hr",
  "Document Agent": "hr",
};

export function lookForRole(role: string, seed = 0): CharacterLook {
  if (ROLE_LOOK[role]) return ROLE_LOOK[role];
  const pool: CharacterLook[] = ["pm", "dev-a", "dev-b", "designer", "qa", "marketer", "sales", "hr"];
  return pool[Math.abs(seed) % pool.length];
}

export const DEPARTMENT_ACCENT: Record<string, string> = {
  "Marketing": "#FF9F6B", "Sales": "#5B8CFF", "HR": "#FF7AC6", "IT / Dev": "#5BE49B",
  "Design": "#A98BFF", "QA / Tester": "#FFD166", "Game Studio": "#FFD166",
  "Data / Research": "#3BE8E0", "Finance": "#5BE49B", "Legal": "#9AA7C7",
  "Content": "#FF7AC6", "DevOps": "#3BE8E0", "Product Management": "#5B8CFF",
  "Lobby / Support": "#3BE8E0", "Customer Service": "#5B8CFF",
};

export function accentFor(departmentType: string): string {
  return DEPARTMENT_ACCENT[departmentType] ?? "#5B8CFF";
}

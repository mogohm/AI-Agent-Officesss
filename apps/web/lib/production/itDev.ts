// Production mapping for the approved IT / Dev floor slice: which composited
// character + which state a real Agent maps to, and where they stand.
import type { Agent } from "@/lib/types";

export const IT_DEV_FLOOR = "/assets/office/floors/it-dev/it-dev-floor-base.webp";
const C = "/assets/characters/composited/it-dev";

export type CharId = "frontend-developer" | "backend-developer" | "system-analyst";

/** Map an agent role to one of the three approved IT/Dev identities. */
export function roleToChar(role: string): CharId {
  const r = role.toLowerCase();
  if (r.includes("frontend")) return "frontend-developer";
  if (r.includes("backend") || r.includes("devops") || r.includes("database")) return "backend-developer";
  if (r.includes("analyst") || r.includes("qa") || r.includes("research") || r.includes("data") || r.includes("document")) return "system-analyst";
  return "backend-developer"; // generic Developer / other → backend identity
}

// Per-character zone (% of the 8:3 room), scale and facing (matches vertical slice).
export const ZONE: Record<CharId, { x: number; y: number; s: number; facing: "left" | "right" }> = {
  "frontend-developer": { x: 25, y: 66, s: 0.72, facing: "right" },
  "backend-developer": { x: 50, y: 70, s: 0.74, facing: "left" },
  "system-analyst": { x: 76, y: 63, s: 0.69, facing: "right" },
};

const WORK = new Set(["coding", "designing", "writing", "testing", "reviewing", "meeting"]);
const THINK = new Set(["thinking", "planning"]);

export type Activity = "work" | "think" | "idle";

export function activityOf(status: string): Activity {
  if (WORK.has(status)) return "work";
  if (THINK.has(status) || status === "error") return "think";
  return "idle";
}

// State chosen per character for a given activity. Idle returns a rotating pool.
const STATE_MAP: Record<CharId, { work: string; think: string; idle: string[] }> = {
  "frontend-developer": { work: "coding", think: "reviewing", idle: ["idle", "coffee"] },
  "backend-developer": { work: "debugging", think: "monitoring", idle: ["idle", "reading"] },
  "system-analyst": { work: "analysing", think: "reviewing", idle: ["idle", "relaxing"] },
};

export function stateFor(char: CharId, status: string, idleTick: number): string {
  const a = activityOf(status);
  if (a === "work") return STATE_MAP[char].work;
  if (a === "think") return STATE_MAP[char].think;
  const pool = STATE_MAP[char].idle;
  return pool[idleTick % pool.length];
}

export function assetFor(char: CharId, state: string): string {
  return `${C}/${char}-${state}.webp`;
}

export function isItDev(type: string): boolean {
  return type === "IT / Dev";
}

/** Assign agents to the 3 zones (first agent per character identity wins the zone). */
export function placeAgents(agents: Agent[]): { agent: Agent; char: CharId }[] {
  const used = new Set<CharId>();
  const placed: { agent: Agent; char: CharId }[] = [];
  for (const a of agents) {
    let char = roleToChar(a.role);
    if (used.has(char)) {
      // pick any free zone so two agents don't overlap
      const free = (["frontend-developer", "backend-developer", "system-analyst"] as CharId[]).find((c) => !used.has(c));
      if (!free) continue; // only 3 zones; ignore extras
      char = free;
    }
    used.add(char);
    placed.push({ agent: a, char });
  }
  return placed;
}

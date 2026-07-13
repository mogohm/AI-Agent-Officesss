// Typed asset registry. Single source of truth for pixel-art file paths.
// Files live under apps/web/public/assets/… (see docs/ASSET_MANIFEST.md).
// Missing files fall back to labeled placeholders in the scene components.

export const ASSET_BASE = "/assets";

/** Department type → room background filename (in office/floors/). */
const ROOM_FILE: Record<string, string> = {
  "Marketing": "marketing-room",
  "Sales": "sales-room",
  "HR": "hr-room",
  "IT / Dev": "dev-room",
  "Design": "design-room",
  "QA / Tester": "qa-room",
  "Game Studio": "game-room",
  "Data / Research": "data-room",
  "Finance": "finance-room",
  "Legal": "legal-room",
  "Content": "content-room",
  "DevOps": "devops-room",
  "Product Management": "product-room",
  "Lobby / Support": "support-room",
  "Customer Service": "service-room",
};

export function roomAsset(departmentType: string): string {
  return `${ASSET_BASE}/office/floors/${ROOM_FILE[departmentType] ?? "generic-room"}.webp`;
}

export const CHARACTER_LOOKS = ["pm", "dev-a", "dev-b", "designer", "qa", "marketer", "sales", "hr"] as const;
export type CharacterLook = (typeof CHARACTER_LOOKS)[number];

export const CHARACTER_STATES = [
  "idle", "working", "thinking", "coffee", "reading", "chatting", "walking",
] as const;
export type CharacterState = (typeof CHARACTER_STATES)[number];

export function characterAsset(look: CharacterLook, state: CharacterState): string {
  return `${ASSET_BASE}/characters/${look}/${state}.webp`;
}

const THUMB_COLORS = ["blue", "purple", "teal", "green", "orange", "pink"];
export function buildingThumb(seed: number): string {
  const color = THUMB_COLORS[Math.abs(seed) % THUMB_COLORS.length];
  return `${ASSET_BASE}/office/buildings/thumbs/thumb-${color}.webp`;
}

export const ROOFTOP_ASSET = `${ASSET_BASE}/office/buildings/rooftop.webp`;
export const SERVER_ROOM_ASSET = `${ASSET_BASE}/office/vps/server-room.webp`;
export const WARM_GLOW_ASSET = `${ASSET_BASE}/office/lighting/warm-glow.webp`;

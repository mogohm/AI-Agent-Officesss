// Central manifest mapping REAL pixel-art assets (already in public/assets) to
// departments, workers and companies. Everything degrades gracefully:
// module → generic module → CSS room; sprite → default sprite → initials.

const MODULES = "/assets/themes/reference-bright/tower-master/modules";
const SPRITES = "/assets/characters/composited";
const BUILDINGS = "/assets/themes/reference-bright/companies";

export const ROOF_MODULE = `${MODULES}/tower-roof-module.webp`;

// ---- floor rooms (isometric pixel-art interiors) ----
const FLOOR_BY_TYPE: Record<string, string> = {
  MARKETING: "marketing",
  SALES: "sales",
  DEVELOPMENT: "it-dev",
  CREATIVE: "design",
  MEETING: "design",
  MANAGEMENT: "hr",
  SUPPORT: "lobby",
  OFFICE: "lobby",
  CUSTOM: "lobby",
};
const NAME_KEYWORDS: [RegExp, string][] = [
  [/market|โฆษณา|การตลาด/i, "marketing"],
  [/sale|ขาย/i, "sales"],
  [/\bit\b|dev|โปรแกรม|พัฒนา|engineer|วิศว/i, "it-dev"],
  [/design|ออกแบบ|creative|meeting|ประชุม|art/i, "design"],
  [/hr|human|บุคคล|ทรัพยากร/i, "hr"],
  [/lobby|support|ต้อนรับ|ซัพพอร์ต|reception/i, "lobby"],
];

export function floorModule(floorType: string, name = ""): string {
  for (const [re, key] of NAME_KEYWORDS) if (re.test(name)) return `${MODULES}/${key}-floor-module-ref.webp`;
  const key = FLOOR_BY_TYPE[floorType] ?? "lobby";
  return `${MODULES}/${key}-floor-module-ref.webp`;
}

// ---- worker sprites (chibi pixel-art) ----
type SpritePair = { idle: string; active: string };
const AVATAR_SPRITES: Record<string, SpritePair> = {
  "dev-a": { idle: `${SPRITES}/it-dev/frontend-developer-idle.webp`, active: `${SPRITES}/it-dev/frontend-developer-coding.webp` },
  "dev-b": { idle: `${SPRITES}/it-dev/backend-developer-idle.webp`, active: `${SPRITES}/it-dev/backend-developer-monitoring.webp` },
  designer: { idle: `${SPRITES}/art-design/pixel-designer-idle.webp`, active: `${SPRITES}/art-design/pixel-designer-designing.webp` },
  marketer: { idle: `${SPRITES}/growth/echo-marketer-idle.webp`, active: `${SPRITES}/growth/echo-marketer-working.webp` },
  pm: { idle: `${SPRITES}/product-management/nova-pm-idle.webp`, active: `${SPRITES}/product-management/nova-pm-working.webp` },
  qa: { idle: `${SPRITES}/quality/scout-qa-idle.webp`, active: `${SPRITES}/quality/scout-qa-working.webp` },
  sales: { idle: `${SPRITES}/it-dev/system-analyst-idle.webp`, active: `${SPRITES}/it-dev/system-analyst-analysing.webp` },
  hr: { idle: `${SPRITES}/product-management/nova-pm-idle.webp`, active: `${SPRITES}/product-management/nova-pm-working.webp` },
};
const ROLE_TO_AVATAR: [RegExp, string][] = [
  [/frontend/i, "dev-a"], [/backend|api/i, "dev-b"], [/design|ux|ui/i, "designer"],
  [/market/i, "marketer"], [/sale/i, "sales"], [/hr|human/i, "hr"],
  [/product|pm|manager/i, "pm"], [/qa|quality|test/i, "qa"], [/analyst|support/i, "sales"],
];

const ACTIVE_STATUSES = new Set(["WORKING", "THINKING", "QUEUED"]);

export function workerSprite(avatarKey: string | undefined, role: string | undefined, status: string): string {
  let key = avatarKey && AVATAR_SPRITES[avatarKey] ? avatarKey : undefined;
  if (!key && role) for (const [re, k] of ROLE_TO_AVATAR) if (re.test(role)) { key = k; break; }
  const pair = AVATAR_SPRITES[key ?? "dev-a"] ?? AVATAR_SPRITES["dev-a"];
  return ACTIVE_STATUSES.has(status) ? pair.active : pair.idle;
}

// ---- company building previews ----
export function buildingImage(index: number): string {
  return `${BUILDINGS}/building-${(((index % 4) + 4) % 4) + 1}.webp`;
}
export const BUILDING_THEMES = ["blue", "warm", "purple", "dark"] as const;
export function buildingTheme(index: number) {
  return BUILDING_THEMES[(((index % 4) + 4) % 4)];
}

// ---- runtime status → color + label (semantic, matches reference legend) ----
export const RUNTIME_COLOR: Record<string, string> = {
  OFFLINE: "#657A91",
  IDLE: "#35D07F",
  QUEUED: "#3ABEF9",
  THINKING: "#F0B84B",
  WORKING: "#3478F6",
  WAITING_APPROVAL: "#9B6CF6",
  COMPLETED: "#35D07F",
  ERROR: "#EF5B69",
};
export const RUNTIME_LABEL: Record<string, string> = {
  OFFLINE: "offline", IDLE: "idle", QUEUED: "queued", THINKING: "thinking",
  WORKING: "working", WAITING_APPROVAL: "waiting", COMPLETED: "done", ERROR: "error",
};

/** Deterministic building index from a company id (stable across reloads). */
export function companyBuildingIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 4;
}

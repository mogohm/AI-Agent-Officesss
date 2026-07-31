import { createHash } from "node:crypto";

/**
 * Versioned asset prompts + style lock (§5/§7). The prohibitions are part of the
 * contract: every prompt explicitly forbids people, text, logos, watermarks,
 * cropped architecture and mismatched camera angles.
 */

export const STYLE_LOCK_VERSION = "1.0.0";
export const ASSET_PROMPT_VERSION = "1.0.0";

/** Applied to EVERY asset prompt — the non-negotiable part of the style lock. */
const PROHIBITIONS = [
  "ABSOLUTELY NO people, employees, workers, humans, characters, faces, or human silhouettes of any kind.",
  "NO text, letters, numbers, labels, signage, logos, watermarks, or UI elements.",
  "NO cropped architecture — nothing important may touch or be cut off by the canvas edge.",
  "NO photographic style, NO 3D render, NO blurry gradients.",
].join(" ");

const STYLE = [
  "Detailed pixel-art / crisp illustrated game-art style for an isometric office management game.",
  "Night city setting with warm interior lighting against cool blue exteriors.",
  "Consistent pixel density and consistent outline weight throughout.",
].join(" ");

const FLOOR_CAMERA = [
  "Strict 2:1 dimetric isometric cutaway view of a single office floor, seen as a wide horizontal band.",
  "The camera elevation, scale and viewing angle must be IDENTICAL across floors.",
  "The room fills the full width of the frame; the floor slab runs edge to edge along the bottom.",
  "Left and right walls terminate at the exact frame edges so floors can stack seamlessly.",
  "Furniture and environment ONLY — the room must be completely empty of any living being.",
].join(" ");

export type AssetPromptKey =
  | "company-building" | "department-floor-empty" | "server-floor-empty"
  | "worker-fallback-state" | "asset-correction";

export type AssetPromptTemplate = {
  key: AssetPromptKey;
  version: string;
  orientation: "landscape" | "portrait" | "square";
  transparent: boolean;
  build: (vars: Record<string, string>) => string;
};

export const ASSET_TEMPLATES: Record<AssetPromptKey, AssetPromptTemplate> = {
  "company-building": {
    key: "company-building", version: ASSET_PROMPT_VERSION, orientation: "square", transparent: false,
    build: (v) => [
      `${STYLE} A single complete ${v.identity} office building shown in isometric three-quarter view at night.`,
      "The ENTIRE building is visible from the rooftop down to the ground floor and the pavement it stands on.",
      "Leave clear empty margin below the building base — the base must never touch the bottom edge.",
      `Architectural identity: ${v.detail}.`,
      "Windows glow with warm interior light. Distant dark city skyline behind. Small trees and street furniture at ground level.",
      PROHIBITIONS,
    ].join(" "),
  },

  "department-floor-empty": {
    key: "department-floor-empty", version: ASSET_PROMPT_VERSION, orientation: "landscape", transparent: false,
    build: (v) => [
      `${STYLE} ${FLOOR_CAMERA}`,
      `This floor is a ${v.department} department workspace. Furnishings: ${v.furniture}.`,
      `Colour accent: ${v.accent}. Large windows along the back wall show the night city.`,
      "Empty chairs are pushed under empty desks. Monitors are switched on but every seat is unoccupied.",
      PROHIBITIONS,
    ].join(" "),
  },

  "server-floor-empty": {
    key: "server-floor-empty", version: ASSET_PROMPT_VERSION, orientation: "landscape", transparent: false,
    build: () => [
      `${STYLE} ${FLOOR_CAMERA}`,
      "This floor is an underground server room / VPS infrastructure basement.",
      "Furnishings: rows of dark server racks with blue and cyan status LEDs, cable trays, cooling ducts, a wall-mounted network diagram panel with no readable text.",
      "Cold cyan lighting, concrete floor, no windows. Completely unoccupied.",
      PROHIBITIONS,
    ].join(" "),
  },

  "worker-fallback-state": {
    key: "worker-fallback-state", version: ASSET_PROMPT_VERSION, orientation: "portrait", transparent: true,
    build: (v) => [
      "Pixel-art game sprite of a small stylised ROBOT assistant, front-facing three-quarter view, full body from head to feet.",
      "Fully transparent background. The robot stands centred with both feet on an imaginary ground line at the very bottom of the frame.",
      `Runtime state to convey: ${v.state}. Visual treatment: ${v.treatment}.`,
      "Simple boxy friendly robot design with a glowing visor. Consistent size and proportion across states.",
      "NO furniture, NO desk, NO chair, NO background scenery — the sprite alone on transparency.",
      "NO humans, NO human faces, NO text, NO logos, NO watermarks.",
    ].join(" "),
  },

  "asset-correction": {
    key: "asset-correction", version: ASSET_PROMPT_VERSION, orientation: "landscape", transparent: false,
    build: (v) => [
      `Regenerate this asset correcting the following defects: ${v.defects}.`,
      `Original intent: ${v.original}`,
      "Keep everything that was already correct; change only what is required to fix the listed defects.",
      PROHIBITIONS,
    ].join(" "),
  },
};

export function renderAssetPrompt(key: AssetPromptKey, vars: Record<string, string>): { prompt: string; hash: string; version: string } {
  const t = ASSET_TEMPLATES[key];
  if (!t) throw new Error(`unknown asset prompt template: ${key}`);
  const prompt = t.build(vars);
  const hash = createHash("sha256").update(`${key}@${t.version}#${STYLE_LOCK_VERSION}\n${prompt}`).digest("hex");
  return { prompt, hash, version: t.version };
}

// ---------------------------------------------------------------- catalogue

export const FLOOR_SPECS = [
  { slug: "marketing", department: "marketing", furniture: "campaign boards, presentation screens showing abstract charts, mood-board walls, leafy plants, lounge sofa", accent: "purple and magenta" },
  { slug: "sales", department: "sales", furniture: "a large world-map wall display, call-station desks with headsets on stands, revenue dashboard screens, filing cabinets", accent: "blue and cyan" },
  { slug: "hr", department: "human resources", furniture: "a warm interview corner with armchairs, bookshelves, framed abstract art, a coffee table, potted plants", accent: "soft pink and warm beige" },
  { slug: "it-dev", department: "software engineering", furniture: "long developer desks with multiple monitors showing abstract code, a small server rack, mechanical keyboards, desk plants", accent: "teal and cyan" },
  { slug: "design-meeting", department: "design and meeting", furniture: "drawing tablets, a large mood-board wall, colour swatch panels, a central meeting table with empty chairs, a projector screen", accent: "orange and violet" },
  { slug: "lobby-support", department: "lobby and support reception", furniture: "a curved reception desk, waiting sofas, a large plant, a blank feature panel on the wall, floor lamps", accent: "warm amber and green" },
] as const;

export const BUILDING_SPECS = [
  { slug: "company-a", identity: "modern blue-glass corporate AI headquarters", detail: "6 visible storeys, blue-tinted glass curtain walls, a rooftop garden with trees and planters, a lit ground-floor entrance canopy" },
  { slug: "company-b", identity: "warm beige and gold stone business tower", detail: "5 visible storeys, sandstone and brass facade, arched windows, a modern rooftop terrace garden, a stepped entrance" },
  { slug: "company-c", identity: "purple creative studio loft", detail: "4 visible storeys, violet brick and industrial steel-framed windows, colourful rooftop studio pods and string lights, a bold artistic entrance" },
  { slug: "company-d", identity: "dark high-tech infrastructure tower", detail: "6 visible storeys, near-black metal panels with cyan light strips along the edges, satellite dishes and cooling units on the roof, a minimal secure entrance" },
] as const;

export const WORKER_STATES = [
  { slug: "idle", state: "idle and waiting", treatment: "relaxed neutral standing pose, calm soft green visor glow" },
  { slug: "working", state: "actively working", treatment: "leaning forward slightly with arms raised as if typing, bright blue visor glow and small motion sparks" },
  { slug: "thinking", state: "thinking / reasoning", treatment: "one hand raised near the head, amber visor glow, small floating thought dots above the head" },
  { slug: "waiting-approval", state: "waiting for human approval", treatment: "standing patiently holding up a blank document panel, purple visor glow" },
  { slug: "error", state: "error / failure", treatment: "slumped posture with a red visor glow and a small warning triangle symbol floating above (no letters)" },
  { slug: "offline", state: "offline / powered down", treatment: "powered-down slouched posture, dark unlit visor, desaturated grey colouring" },
] as const;

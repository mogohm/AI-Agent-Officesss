/**
 * Canonical office asset registry (WP-003A).
 *
 * The SINGLE approved mapping between a semantic identity (company variant /
 * department floor / worker state) and a public asset URL. Pure data plus pure
 * functions — no filesystem, database, provider or evidence paths — so it is
 * safe to import from a client component.
 *
 * `OFFICE_ASSET_BASELINE` records the WP-002 attestation this registry was
 * approved against. It is a transcribed pin, NOT a recomputation: nothing here
 * hashes image bytes. Filesystem verification lives in the test suite.
 */

// ------------------------------------------------------------------- types

export type CompanyBuildingVariant = "company-a" | "company-b" | "company-c" | "company-d";

export type OfficeFloorVariant =
  | "marketing" | "sales" | "hr" | "it-development"
  | "design-meeting" | "lobby-support" | "server";

export type WorkerVisualState =
  | "idle" | "working" | "thinking" | "waiting-approval" | "error" | "offline";

/** Carries NO display name or description — user-editable text must never pick artwork. */
export type CompanyVisualIdentity = {
  id: string;
  assetVariant?: string | null;
  buildingTheme?: string | null;
  visualTheme?: string | null;
};

export type DepartmentVisualIdentity = {
  type?: string | null;
  slug?: string | null;
  name?: string | null;
  floorType?: string | null;
};

export type ResolvedCompanyBuilding = {
  variant: CompanyBuildingVariant;
  src: string;
  fallbackUsed: boolean;
  resolutionSource: "assetVariant" | "buildingTheme" | "visualTheme" | "stableIdFallback";
};

export type ResolvedDepartmentFloor = {
  variant: OfficeFloorVariant;
  src: string;
  fallbackUsed: boolean;
  resolutionSource: "floorType" | "type" | "slug" | "unknownFallback";
};

export type ResolvedWorkerVisualState = {
  state: WorkerVisualState;
  src: string;
  fallbackUsed: boolean;
  resolutionSource: "canonicalState" | "runtimeStatus" | "unknownActive" | "unknownInactive";
};

export type CanonicalOfficeAssetMetadata = {
  readonly version: string;
  readonly digest: string;
  readonly assetCount: number;
  readonly buildingCount: number;
  readonly floorCount: number;
  readonly workerStateCount: number;
  readonly approvedPaths: readonly string[];
};

// ---------------------------------------------------------------- registry

export const OFFICE_ASSET_BASELINE = Object.freeze({
  version: "1.0.0",
  digest: "2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76",
  assetCount: 17,
} as const);

export const OFFICE_ASSET_PUBLIC_PREFIX = "/assets/office/";

export const COMPANY_BUILDING_ASSETS: Readonly<Record<CompanyBuildingVariant, string>> =
  Object.freeze({
    "company-a": "/assets/office/buildings/company-a-building.webp",
    "company-b": "/assets/office/buildings/company-b-building.webp",
    "company-c": "/assets/office/buildings/company-c-building.webp",
    "company-d": "/assets/office/buildings/company-d-building.webp",
  });

export const OFFICE_FLOOR_ASSETS: Readonly<Record<OfficeFloorVariant, string>> =
  Object.freeze({
    marketing: "/assets/office/floors/marketing-floor-empty.webp",
    sales: "/assets/office/floors/sales-floor-empty.webp",
    hr: "/assets/office/floors/hr-floor-empty.webp",
    "it-development": "/assets/office/floors/it-dev-floor-empty.webp",
    "design-meeting": "/assets/office/floors/design-meeting-floor-empty.webp",
    "lobby-support": "/assets/office/floors/lobby-support-floor-empty.webp",
    server: "/assets/office/floors/server-floor-empty.webp",
  });

export const WORKER_FALLBACK_ASSETS: Readonly<Record<WorkerVisualState, string>> =
  Object.freeze({
    idle: "/assets/office/workers/default/idle.webp",
    working: "/assets/office/workers/default/working.webp",
    thinking: "/assets/office/workers/default/thinking.webp",
    "waiting-approval": "/assets/office/workers/default/waiting-approval.webp",
    error: "/assets/office/workers/default/error.webp",
    offline: "/assets/office/workers/default/offline.webp",
  });

export const COMPANY_BUILDING_VARIANTS = Object.freeze(
  Object.keys(COMPANY_BUILDING_ASSETS) as CompanyBuildingVariant[]);
export const OFFICE_FLOOR_VARIANTS = Object.freeze(
  Object.keys(OFFICE_FLOOR_ASSETS) as OfficeFloorVariant[]);
export const WORKER_VISUAL_STATES = Object.freeze(
  Object.keys(WORKER_FALLBACK_ASSETS) as WorkerVisualState[]);

/** Every approved public path, in registry order. Exactly 17 entries. */
export const APPROVED_OFFICE_ASSET_PATHS: readonly string[] = Object.freeze([
  ...Object.values(COMPANY_BUILDING_ASSETS),
  ...Object.values(OFFICE_FLOOR_ASSETS),
  ...Object.values(WORKER_FALLBACK_ASSETS),
]);

const APPROVED_PATH_SET: ReadonlySet<string> = new Set(APPROVED_OFFICE_ASSET_PATHS);

// -------------------------------------------------------------- normalizing

/**
 * Lowercase, collapse separators, drop anything outside [a-z0-9-]. Lookups are
 * EXACT on the result — never substring — so "technology services" cannot drift
 * into the server floor.
 */
function normalizeToken(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim().toLowerCase()
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return t.length > 0 ? t : null;
}

// ------------------------------------------------------- company resolution

/** Approved aliases. Maps are used, never object literals: `"constructor" in {}` is true. */
const BUILDING_ALIASES = new Map<string, CompanyBuildingVariant>([
  ["company-a", "company-a"], ["blue", "company-a"], ["professional", "company-a"],
  ["corporate-blue", "company-a"], ["corporate", "company-a"],
  ["company-b", "company-b"], ["warm", "company-b"], ["business", "company-b"],
  ["gold", "company-b"], ["beige", "company-b"],
  ["company-c", "company-c"], ["creative", "company-c"], ["purple", "company-c"],
  ["studio", "company-c"], ["violet", "company-c"],
  ["company-d", "company-d"], ["dark", "company-d"], ["infrastructure", "company-d"],
  ["technology", "company-d"], ["high-tech", "company-d"],
]);

/**
 * FNV-1a (32-bit) — tiny, dependency-free and engine-stable, so the fallback
 * never drifts between server and client render.
 */
export function stableCompanyHash(id: string): number {
  let h = 0x811c9dc5;
  const s = typeof id === "string" ? id : "";
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function stableBuildingVariantForId(id: string): CompanyBuildingVariant {
  return COMPANY_BUILDING_VARIANTS[stableCompanyHash(id) % COMPANY_BUILDING_VARIANTS.length];
}

export function resolveCompanyBuilding(company: CompanyVisualIdentity): ResolvedCompanyBuilding {
  const ordered = [
    { source: "assetVariant", value: company?.assetVariant },
    { source: "buildingTheme", value: company?.buildingTheme },
    { source: "visualTheme", value: company?.visualTheme },
  ] as const;

  for (const { source, value } of ordered) {
    const token = normalizeToken(value);
    const variant = token !== null ? BUILDING_ALIASES.get(token) : undefined;
    if (variant) {
      return { variant, src: COMPANY_BUILDING_ASSETS[variant], fallbackUsed: false, resolutionSource: source };
    }
  }

  const variant = stableBuildingVariantForId(company?.id ?? "");
  return {
    variant, src: COMPANY_BUILDING_ASSETS[variant],
    fallbackUsed: true, resolutionSource: "stableIdFallback",
  };
}

// ---------------------------------------------------------- floor resolution

const FLOOR_ALIASES = new Map<string, OfficeFloorVariant>([
  ["marketing", "marketing"], ["campaign", "marketing"],
  ["content-marketing", "marketing"], ["performance-marketing", "marketing"],
  ["sales", "sales"], ["business-development", "sales"],
  ["account-management", "sales"], ["customer-success", "sales"],
  ["hr", "hr"], ["human-resources", "hr"], ["people", "hr"],
  ["recruitment", "hr"], ["talent", "hr"], ["management", "hr"],
  ["it", "it-development"], ["dev", "it-development"], ["development", "it-development"],
  ["engineering", "it-development"], ["frontend", "it-development"],
  ["backend", "it-development"], ["software", "it-development"],
  ["qa", "it-development"], ["quality-assurance", "it-development"],
  ["devops", "it-development"], ["it-development", "it-development"],
  ["design", "design-meeting"], ["creative", "design-meeting"], ["ux", "design-meeting"],
  ["ui", "design-meeting"], ["product-design", "design-meeting"],
  ["meeting", "design-meeting"], ["workshop", "design-meeting"],
  ["design-meeting", "design-meeting"],
  ["lobby", "lobby-support"], ["support", "lobby-support"],
  ["customer-support", "lobby-support"], ["administration", "lobby-support"],
  ["operations", "lobby-support"], ["general-office", "lobby-support"],
  ["office", "lobby-support"], ["custom", "lobby-support"], ["lobby-support", "lobby-support"],
  // the ONLY routes to the server floor
  ["server", "server"], ["infrastructure", "server"],
  ["data-center", "server"], ["datacenter", "server"],
]);

/** Department used when nothing recognisable was supplied. */
export const UNKNOWN_DEPARTMENT_FLOOR: OfficeFloorVariant = "lobby-support";

export function resolveDepartmentFloor(
  department: DepartmentVisualIdentity | string | null | undefined,
): ResolvedDepartmentFloor {
  const d: DepartmentVisualIdentity =
    typeof department === "string" ? { type: department } : (department ?? {});

  // `name` is deliberately absent: a localized, user-editable label must never
  // decide which floor art is shown.
  const ordered = [
    { source: "floorType", value: d.floorType },
    { source: "type", value: d.type },
    { source: "slug", value: d.slug },
  ] as const;

  for (const { source, value } of ordered) {
    const token = normalizeToken(value);
    const variant = token !== null ? FLOOR_ALIASES.get(token) : undefined;
    if (variant) {
      return { variant, src: OFFICE_FLOOR_ASSETS[variant], fallbackUsed: false, resolutionSource: source };
    }
  }

  return {
    variant: UNKNOWN_DEPARTMENT_FLOOR,
    src: OFFICE_FLOOR_ASSETS[UNKNOWN_DEPARTMENT_FLOOR],
    fallbackUsed: true, resolutionSource: "unknownFallback",
  };
}

// --------------------------------------------------------- worker resolution

const RUNTIME_STATUS_MAP = new Map<string, WorkerVisualState>([
  ["idle", "idle"], ["available", "idle"], ["completed", "idle"],
  ["queued", "thinking"], ["planning", "thinking"], ["thinking", "thinking"],
  ["running", "working"], ["executing", "working"], ["working", "working"],
  ["waiting-approval", "waiting-approval"], ["approval-required", "waiting-approval"],
  ["failed", "error"], ["error", "error"], ["timed-out", "error"],
  ["offline", "offline"], ["paused", "offline"],
  ["disabled", "offline"], ["archived", "offline"],
]);

/** Unknown status while the worker is otherwise active. */
export const UNKNOWN_ACTIVE_WORKER_STATE: WorkerVisualState = "idle";
/** Unknown status when the caller explicitly declares the worker inactive. */
export const UNKNOWN_INACTIVE_WORKER_STATE: WorkerVisualState = "offline";

/**
 * Runtime status -> fallback sprite. Never returns undefined, and never builds
 * a URL from caller-supplied text: an unrecognised status selects a registered
 * state, it does not become part of a path.
 */
export function resolveWorkerVisualState(
  status: string | null | undefined,
  opts?: { inactive?: boolean },
): ResolvedWorkerVisualState {
  const token = normalizeToken(status);
  const mapped = token !== null ? RUNTIME_STATUS_MAP.get(token) : undefined;

  if (mapped) {
    const canonical = (WORKER_VISUAL_STATES as readonly string[]).includes(token as string);
    return {
      state: mapped, src: WORKER_FALLBACK_ASSETS[mapped], fallbackUsed: false,
      resolutionSource: canonical ? "canonicalState" : "runtimeStatus",
    };
  }

  const inactive = opts?.inactive === true;
  const state = inactive ? UNKNOWN_INACTIVE_WORKER_STATE : UNKNOWN_ACTIVE_WORKER_STATE;
  return {
    state, src: WORKER_FALLBACK_ASSETS[state], fallbackUsed: true,
    resolutionSource: inactive ? "unknownInactive" : "unknownActive",
  };
}

// ---------------------------------------------------------------- validation

const NON_PRODUCTION_FRAGMENTS = [
  "references/", "artifacts/", "evidence/", "provider/", "workspaces/",
];

/**
 * Registry integrity check for a public asset URL.
 *
 * This is NOT a server filesystem authorization control and must never be used
 * as one. It answers exactly one question: "is this string one of the approved
 * office asset URLs, in an unmodified form?"
 */
export function validateApprovedOfficeAssetPath(path: string): boolean {
  if (typeof path !== "string" || path.length === 0) return false;

  // structural rejections first, so a malformed path never reaches the set
  if (path.includes("..") || path.includes("\\") || path.includes("\0")) return false;
  if (path.includes("?") || path.includes("#")) return false;
  if (path.includes("://") || path.startsWith("//")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false;   // data:, blob:, javascript:, C:
  if (path.includes("//")) return false;                  // repeated-slash ambiguity
  if (!path.startsWith("/")) return false;                // relative / missing leading slash

  const lower = path.toLowerCase();
  if (lower.includes("%2e") || lower.includes("%2f") || lower.includes("%5c")) return false;
  if (!path.startsWith(OFFICE_ASSET_PUBLIC_PREFIX)) return false;
  if (!lower.endsWith(".webp")) return false;
  if (NON_PRODUCTION_FRAGMENTS.some((f) => lower.includes(f))) return false;

  return APPROVED_PATH_SET.has(path);
}

/** Readonly baseline metadata, safe to render in the UI. */
export function getCanonicalOfficeAssetMetadata(): CanonicalOfficeAssetMetadata {
  return Object.freeze({
    version: OFFICE_ASSET_BASELINE.version,
    digest: OFFICE_ASSET_BASELINE.digest,
    assetCount: OFFICE_ASSET_BASELINE.assetCount,
    buildingCount: COMPANY_BUILDING_VARIANTS.length,
    floorCount: OFFICE_FLOOR_VARIANTS.length,
    workerStateCount: WORKER_VISUAL_STATES.length,
    approvedPaths: APPROVED_OFFICE_ASSET_PATHS,
  });
}

import type {
  CanonicalOfficeAssetMetadata,
  CompanyBuildingVariant,
  OfficeFloorVariant,
  WorkerVisualState,
} from "./types";

/**
 * Canonical office asset registry (WP-003A).
 *
 * This module is the SINGLE approved mapping between a semantic identity
 * (company variant / department floor / worker state) and a public asset URL.
 * It is pure data plus pure functions — no filesystem, no database, no
 * evidence, artifact or worktree paths — so it is safe to import from a client
 * component.
 *
 * `OFFICE_ASSET_BASELINE` records the WP-002 attestation this registry was
 * approved against. It is a transcribed pin, NOT a recomputation: nothing here
 * hashes image bytes. Re-deriving the digest from the 17 files requires those
 * files to be present in the checkout, which today they are not — see the
 * file-existence gate in `tests/unit/visual-assets/registry.test.ts`.
 */

/** Pin to the approved WP-002 canonical asset baseline. */
export const OFFICE_ASSET_BASELINE = Object.freeze({
  version: "1.0.0",
  digest:
    "2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76",
  assetCount: 17,
} as const);

/** Public URL prefix every approved office asset must live under. */
export const OFFICE_ASSET_PUBLIC_PREFIX = "/assets/office/";

// ------------------------------------------------------------------ registry

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
  Object.keys(COMPANY_BUILDING_ASSETS) as CompanyBuildingVariant[],
);
export const OFFICE_FLOOR_VARIANTS = Object.freeze(
  Object.keys(OFFICE_FLOOR_ASSETS) as OfficeFloorVariant[],
);
export const WORKER_VISUAL_STATES = Object.freeze(
  Object.keys(WORKER_FALLBACK_ASSETS) as WorkerVisualState[],
);

/** Every approved public path, in registry order. Exactly 17 entries. */
export const APPROVED_OFFICE_ASSET_PATHS: readonly string[] = Object.freeze([
  ...Object.values(COMPANY_BUILDING_ASSETS),
  ...Object.values(OFFICE_FLOOR_ASSETS),
  ...Object.values(WORKER_FALLBACK_ASSETS),
]);

const APPROVED_PATH_SET: ReadonlySet<string> = new Set(APPROVED_OFFICE_ASSET_PATHS);

// ---------------------------------------------------------------- validation

/** Path fragments that must never appear in a production asset URL. */
const NON_PRODUCTION_FRAGMENTS = ["references/", "artifacts/", "evidence/", "workspaces/"];

/**
 * Registry integrity check for a public asset URL.
 *
 * This is NOT a filesystem access control and must never be used as one. It
 * answers exactly one question: "is this string one of the approved office
 * asset URLs, in an unmodified form?"
 */
export function validateApprovedOfficeAssetPath(path: string): boolean {
  if (typeof path !== "string" || path.length === 0) return false;

  // structural rejections first, so a malformed path never reaches the set
  if (path.includes("..")) return false;
  if (path.includes("\\")) return false;
  if (path.includes("?") || path.includes("#")) return false;
  if (path.includes("://") || path.startsWith("//")) return false;
  if (path.includes("\0")) return false;
  if (!path.startsWith(OFFICE_ASSET_PUBLIC_PREFIX)) return false;

  const lower = path.toLowerCase();
  if (NON_PRODUCTION_FRAGMENTS.some((f) => lower.includes(f))) return false;

  return APPROVED_PATH_SET.has(path);
}

/** Canonical baseline metadata, safe to render in the UI. */
export function getCanonicalOfficeAssetMetadata(): CanonicalOfficeAssetMetadata {
  return {
    version: OFFICE_ASSET_BASELINE.version,
    digest: OFFICE_ASSET_BASELINE.digest,
    assetCount: OFFICE_ASSET_BASELINE.assetCount,
    buildingCount: COMPANY_BUILDING_VARIANTS.length,
    floorCount: OFFICE_FLOOR_VARIANTS.length,
    workerStateCount: WORKER_VISUAL_STATES.length,
  };
}

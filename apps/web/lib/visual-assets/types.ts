/**
 * Canonical office asset type contract (WP-003A).
 *
 * These types are the ONLY approved vocabulary for referring to approved office
 * art. Later frontend work (WP-003B/C) must resolve through them rather than
 * building `/assets/...` strings by hand.
 */

export type CompanyBuildingVariant = "company-a" | "company-b" | "company-c" | "company-d";

export type OfficeFloorVariant =
  | "marketing" | "sales" | "hr" | "it-development"
  | "design-meeting" | "lobby-support" | "server";

export type WorkerVisualState =
  | "idle" | "working" | "thinking" | "waiting-approval" | "error" | "offline";

/**
 * Resolver input. Deliberately carries NO display name and NO description —
 * localized, user-editable text must never decide which artwork is shown.
 */
export type CompanyVisualIdentity = {
  id: string;
  visualTheme?: string | null;
  buildingTheme?: string | null;
  assetVariant?: string | null;
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
  resolutionSource: "canonicalVariant" | "approvedAlias" | "unknownFallback";
};

export type ResolvedWorkerVisualState = {
  state: WorkerVisualState;
  src: string;
  fallbackUsed: boolean;
  resolutionSource: "canonicalState" | "runtimeStatus" | "unknownFallback" | "absentFallback";
};

export type CanonicalOfficeAssetMetadata = {
  version: string;
  digest: string;
  assetCount: number;
  buildingCount: number;
  floorCount: number;
  workerStateCount: number;
};

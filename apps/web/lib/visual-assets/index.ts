/**
 * Canonical office asset registry — public API (WP-003A §10).
 *
 * WP-003B (dashboard cards) and WP-003C (companies page cards) must import from
 * here and nowhere else. Internal alias tables and the approved-path set stay
 * module-private; everything exported is frozen or readonly.
 */

export {
  OFFICE_ASSET_BASELINE, OFFICE_ASSET_PUBLIC_PREFIX,
  COMPANY_BUILDING_ASSETS, OFFICE_FLOOR_ASSETS, WORKER_FALLBACK_ASSETS,
  COMPANY_BUILDING_VARIANTS, OFFICE_FLOOR_VARIANTS, WORKER_VISUAL_STATES,
  APPROVED_OFFICE_ASSET_PATHS,
  validateApprovedOfficeAssetPath, getCanonicalOfficeAssetMetadata,
} from "./office-assets";

export {
  resolveCompanyBuilding, stableBuildingVariantForId, stableCompanyHash,
} from "./resolve-company-building";
export { resolveDepartmentFloor, UNKNOWN_DEPARTMENT_FLOOR } from "./resolve-department-floor";
export {
  resolveWorkerVisualState, ABSENT_WORKER_STATE, UNKNOWN_WORKER_STATE,
} from "./resolve-worker-state";

export type {
  CompanyBuildingVariant, OfficeFloorVariant, WorkerVisualState,
  CompanyVisualIdentity, ResolvedCompanyBuilding, ResolvedDepartmentFloor,
  ResolvedWorkerVisualState, CanonicalOfficeAssetMetadata,
} from "./types";

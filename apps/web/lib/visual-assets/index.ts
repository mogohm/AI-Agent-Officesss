/**
 * Canonical office asset registry — public API (WP-003A).
 *
 * WP-003B (dashboard cards) and WP-003C (companies page cards) must import from
 * here or from `./office-assets` and nowhere else. Internal alias tables and the
 * approved-path set stay module-private; every export is frozen or readonly.
 */

export {
  OFFICE_ASSET_BASELINE, OFFICE_ASSET_PUBLIC_PREFIX,
  COMPANY_BUILDING_ASSETS, OFFICE_FLOOR_ASSETS, WORKER_FALLBACK_ASSETS,
  COMPANY_BUILDING_VARIANTS, OFFICE_FLOOR_VARIANTS, WORKER_VISUAL_STATES,
  APPROVED_OFFICE_ASSET_PATHS,
  UNKNOWN_DEPARTMENT_FLOOR, UNKNOWN_ACTIVE_WORKER_STATE, UNKNOWN_INACTIVE_WORKER_STATE,
  resolveCompanyBuilding, resolveDepartmentFloor, resolveWorkerVisualState,
  validateApprovedOfficeAssetPath, getCanonicalOfficeAssetMetadata,
  stableCompanyHash, stableBuildingVariantForId,
} from "./office-assets";

export type {
  CompanyBuildingVariant, OfficeFloorVariant, WorkerVisualState,
  CompanyVisualIdentity, DepartmentVisualIdentity,
  ResolvedCompanyBuilding, ResolvedDepartmentFloor, ResolvedWorkerVisualState,
  CanonicalOfficeAssetMetadata,
} from "./office-assets";

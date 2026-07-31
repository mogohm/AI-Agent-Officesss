import type { DeliveryRole } from "@prisma/client";

/**
 * Delivery-scoped RBAC (§25). Deliberately separate from the office
 * `CompanyRole` — approving a production release is not the same authority as
 * managing an AI worker.
 */

export const DELIVERY_RANK: Record<DeliveryRole, number> = {
  VIEWER: 0,
  REVIEWER: 1,
  QA: 2,
  DEVELOPER: 3,
  DELIVERY_MANAGER: 4,
  OWNER: 5,
};

export type DeliveryAction =
  | "mission.view"
  | "mission.create"
  | "mission.start"
  | "mission.pause"
  | "mission.cancel"
  | "workpackage.retry"
  | "defect.create"
  | "defect.triage"
  | "defect.accept"
  | "review.submit"
  | "test.rerun"
  | "release.approve"
  | "deploy.production";

const MIN_ROLE: Record<DeliveryAction, DeliveryRole> = {
  "mission.view": "VIEWER",
  "review.submit": "REVIEWER",
  "defect.create": "QA",
  "defect.triage": "QA",
  "test.rerun": "QA",
  "workpackage.retry": "DEVELOPER",
  "mission.create": "DELIVERY_MANAGER",
  "mission.start": "DELIVERY_MANAGER",
  "mission.pause": "DELIVERY_MANAGER",
  "mission.cancel": "DELIVERY_MANAGER",
  // P0/P1 acceptance and production release are owner-level by default.
  "defect.accept": "DELIVERY_MANAGER",
  "release.approve": "OWNER",
  "deploy.production": "OWNER",
};

export function deliveryRoleAtLeast(role: DeliveryRole, min: DeliveryRole): boolean {
  return DELIVERY_RANK[role] >= DELIVERY_RANK[min];
}

export function canPerform(role: DeliveryRole, action: DeliveryAction): boolean {
  return deliveryRoleAtLeast(role, MIN_ROLE[action]);
}

/**
 * Release approval. A DELIVERY_MANAGER may approve only when the mission policy
 * explicitly delegates it; agents can never approve (they hold no role).
 */
export function canApproveRelease(role: DeliveryRole, policyAllowsManager: boolean): boolean {
  if (role === "OWNER") return true;
  return policyAllowsManager && role === "DELIVERY_MANAGER";
}

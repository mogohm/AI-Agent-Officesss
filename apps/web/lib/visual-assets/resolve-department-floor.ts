import { OFFICE_FLOOR_ASSETS, OFFICE_FLOOR_VARIANTS } from "./office-assets";
import type { OfficeFloorVariant, ResolvedDepartmentFloor } from "./types";

/**
 * Department → floor artwork resolution (WP-003A §7).
 *
 * Matching is EXACT on a normalized token — never a substring scan. That is the
 * rule that stops "customer service" or "observer group" from silently becoming
 * the server room: an unrecognised department is a lobby, not infrastructure.
 *
 * Fallback policy:
 *   - unknown / missing department  → `lobby-support`
 *   - `server` is reachable ONLY through an explicit infrastructure alias
 */

const FLOOR_ALIASES = new Map<string, OfficeFloorVariant>([
  // marketing
  ["brand", "marketing"], ["branding", "marketing"], ["growth", "marketing"],
  ["campaign", "marketing"], ["comms", "marketing"],
  // sales
  ["revenue", "sales"], ["business-development", "sales"], ["bizdev", "sales"],
  ["accounts", "sales"],
  // human resources — `management` keeps the FloorType.MANAGEMENT mapping the
  // legacy layer had, and is the only route to the hr floor from the enum.
  ["human-resources", "hr"], ["people", "hr"], ["recruiting", "hr"],
  ["talent", "hr"], ["management", "hr"],
  // engineering
  ["it", "it-development"], ["dev", "it-development"], ["development", "it-development"],
  ["engineering", "it-development"], ["frontend", "it-development"],
  ["backend", "it-development"], ["software", "it-development"],
  ["software-engineering", "it-development"], ["platform", "it-development"],
  // design & meeting
  ["design", "design-meeting"], ["ux", "design-meeting"], ["ui", "design-meeting"],
  ["creative", "design-meeting"], ["art", "design-meeting"], ["meeting", "design-meeting"],
  ["product-design", "design-meeting"],
  // lobby & support (also the FloorType.OFFICE / CUSTOM landing spot)
  ["lobby", "lobby-support"], ["support", "lobby-support"], ["reception", "lobby-support"],
  ["helpdesk", "lobby-support"], ["customer-support", "lobby-support"],
  ["front-desk", "lobby-support"], ["office", "lobby-support"], ["custom", "lobby-support"],
  // infrastructure — the ONLY route to the server floor. Deliberately excludes
  // bare "ops", which usually means business operations, not infrastructure.
  ["infrastructure", "server"], ["infra", "server"], ["datacenter", "server"],
  ["data-center", "server"], ["devops", "server"], ["sre", "server"], ["vps", "server"],
]);

/** Department used when nothing recognisable was supplied. */
export const UNKNOWN_DEPARTMENT_FLOOR: OfficeFloorVariant = "lobby-support";

function normalizeToken(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const t = value
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return t.length > 0 ? t : null;
}

export function resolveDepartmentFloor(
  departmentType: string | null | undefined,
): ResolvedDepartmentFloor {
  const token = normalizeToken(departmentType);

  if (token !== null) {
    if ((OFFICE_FLOOR_VARIANTS as readonly string[]).includes(token)) {
      const variant = token as OfficeFloorVariant;
      return {
        variant,
        src: OFFICE_FLOOR_ASSETS[variant],
        fallbackUsed: false,
        resolutionSource: "canonicalVariant",
      };
    }
    // Map lookup, never `in` on an object literal: `"constructor" in {}` is true
    // and would yield a prototype member instead of a floor variant.
    const alias = FLOOR_ALIASES.get(token);
    if (alias) {
      return {
        variant: alias,
        src: OFFICE_FLOOR_ASSETS[alias],
        fallbackUsed: false,
        resolutionSource: "approvedAlias",
      };
    }
  }

  return {
    variant: UNKNOWN_DEPARTMENT_FLOOR,
    src: OFFICE_FLOOR_ASSETS[UNKNOWN_DEPARTMENT_FLOOR],
    fallbackUsed: true,
    resolutionSource: "unknownFallback",
  };
}

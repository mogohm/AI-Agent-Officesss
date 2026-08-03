import { COMPANY_BUILDING_ASSETS, COMPANY_BUILDING_VARIANTS } from "./office-assets";
import type {
  CompanyBuildingVariant,
  CompanyVisualIdentity,
  ResolvedCompanyBuilding,
} from "./types";

/**
 * Deterministic company → building artwork resolution (WP-003A §6).
 *
 * Priority: assetVariant → buildingTheme → visualTheme → stable hash of id.
 *
 * Explicitly NOT used: display name, description, query result order, array
 * index, or any runtime randomness. The same company id always resolves to the
 * same building, in every process, on every page, forever.
 */

/**
 * Approved theme aliases. Every alias maps to exactly one variant and no alias
 * is reused, so the mapping stays a function. Derived from the approved
 * building identities recorded in the WP-002 asset plan.
 */
const BUILDING_ALIASES = new Map<string, CompanyBuildingVariant>([
  ["company-a", "company-a"], ["a", "company-a"], ["blue", "company-a"],
  ["blue-glass", "company-a"], ["corporate", "company-a"],

  ["company-b", "company-b"], ["b", "company-b"], ["beige", "company-b"],
  ["gold", "company-b"], ["stone", "company-b"],

  ["company-c", "company-c"], ["c", "company-c"], ["purple", "company-c"],
  ["violet", "company-c"], ["creative", "company-c"], ["studio", "company-c"],

  ["company-d", "company-d"], ["d", "company-d"], ["dark", "company-d"],
  ["high-tech", "company-d"], ["hightech", "company-d"], ["infrastructure", "company-d"],
]);

/** Lowercase, collapse separators, drop anything outside [a-z0-9-]. */
function normalizeToken(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const t = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return t.length > 0 ? t : null;
}

function approvedVariant(value: string | null | undefined): CompanyBuildingVariant | null {
  const t = normalizeToken(value);
  // Map lookup, never `in` on an object literal: `"constructor" in {}` is true
  // and would return a prototype member instead of a variant.
  return t !== null ? BUILDING_ALIASES.get(t) ?? null : null;
}

/**
 * FNV-1a (32-bit). Chosen because it is tiny, dependency-free and byte-stable
 * across engines — the fallback must never drift between server and client.
 */
export function stableCompanyHash(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic, uniform-enough assignment used only when no theme is set. */
export function stableBuildingVariantForId(id: string): CompanyBuildingVariant {
  const index = stableCompanyHash(typeof id === "string" ? id : "") % COMPANY_BUILDING_VARIANTS.length;
  return COMPANY_BUILDING_VARIANTS[index];
}

export function resolveCompanyBuilding(company: CompanyVisualIdentity): ResolvedCompanyBuilding {
  const ordered = [
    { source: "assetVariant", value: company?.assetVariant },
    { source: "buildingTheme", value: company?.buildingTheme },
    { source: "visualTheme", value: company?.visualTheme },
  ] as const;

  for (const { source, value } of ordered) {
    const variant = approvedVariant(value);
    if (variant) {
      return {
        variant,
        src: COMPANY_BUILDING_ASSETS[variant],
        fallbackUsed: false,
        resolutionSource: source,
      };
    }
  }

  const variant = stableBuildingVariantForId(company?.id ?? "");
  return {
    variant,
    src: COMPANY_BUILDING_ASSETS[variant],
    fallbackUsed: true,
    resolutionSource: "stableIdFallback",
  };
}

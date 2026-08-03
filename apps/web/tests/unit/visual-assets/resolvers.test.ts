import { describe, it, expect } from "vitest";
import {
  resolveCompanyBuilding,
  resolveDepartmentFloor,
  resolveWorkerVisualState,
  stableBuildingVariantForId,
  COMPANY_BUILDING_ASSETS,
  OFFICE_FLOOR_ASSETS,
  WORKER_FALLBACK_ASSETS,
  validateApprovedOfficeAssetPath,
} from "@/lib/visual-assets";

/** WP-003A resolver determinism and fallback policy (§13, cases 14-26). */

describe("company building resolution priority", () => {
  it("14. explicit assetVariant wins over every other signal", () => {
    const r = resolveCompanyBuilding({
      id: "c1", assetVariant: "company-d", buildingTheme: "company-b", visualTheme: "company-c",
    });
    expect(r.variant).toBe("company-d");
    expect(r.resolutionSource).toBe("assetVariant");
    expect(r.fallbackUsed).toBe(false);
    expect(r.src).toBe(COMPANY_BUILDING_ASSETS["company-d"]);
  });
  it("15. buildingTheme is second priority", () => {
    const r = resolveCompanyBuilding({ id: "c1", buildingTheme: "company-b", visualTheme: "company-c" });
    expect(r.variant).toBe("company-b");
    expect(r.resolutionSource).toBe("buildingTheme");
  });
  it("16. visualTheme is third priority", () => {
    const r = resolveCompanyBuilding({ id: "c1", visualTheme: "company-c" });
    expect(r.variant).toBe("company-c");
    expect(r.resolutionSource).toBe("visualTheme");
  });
  it("15b. an unapproved higher-priority value falls through to the next signal", () => {
    const r = resolveCompanyBuilding({ id: "c1", assetVariant: "not-a-variant", buildingTheme: "company-b" });
    expect(r.variant).toBe("company-b");
    expect(r.resolutionSource).toBe("buildingTheme");
  });
  it("normalizes case and separators on approved values", () => {
    for (const v of ["Company-A", "  company_a  ", "COMPANY A"]) {
      expect(resolveCompanyBuilding({ id: "x", assetVariant: v }).variant).toBe("company-a");
    }
  });
});

describe("stable company fallback", () => {
  it("17. is deterministic for the same id", () => {
    const ids = ["cmp_01", "cmp_02", "b4f9-uuid-like", ""];
    for (const id of ids) {
      const runs = Array.from({ length: 25 }, () => resolveCompanyBuilding({ id }));
      const first = runs[0];
      expect(first.resolutionSource).toBe("stableIdFallback");
      expect(first.fallbackUsed).toBe(true);
      for (const r of runs) expect(r.variant).toBe(first.variant);
      expect(stableBuildingVariantForId(id)).toBe(first.variant);
    }
  });
  it("17b. matches recorded golden values (guards against registry reordering)", () => {
    // The fallback is `hash % 4` into COMPANY_BUILDING_VARIANTS, so reordering
    // the registry literal would silently reassign every company. Pin it.
    expect(stableBuildingVariantForId("cmp_01")).toBe("company-d");
    expect(stableBuildingVariantForId("cmp_02")).toBe("company-c");
    expect(stableBuildingVariantForId("cmp_03")).toBe("company-b");
    expect(stableBuildingVariantForId("cmp_04")).toBe("company-a");
  });
  it("18. distributes different ids evenly across all four approved variants", () => {
    const counts = new Map<string, number>();
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const v = stableBuildingVariantForId(`company-id-${i}`);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    expect(counts.size).toBe(4);
    // a degenerate hash that dumps 99% into one bucket must fail here
    for (const [variant, n] of counts) {
      expect(n / N, `${variant} share`).toBeGreaterThan(0.15);
      expect(n / N, `${variant} share`).toBeLessThan(0.35);
    }
  });
  it("19. query/array order does not affect resolution", () => {
    const companies = [{ id: "a1" }, { id: "b2" }, { id: "c3" }, { id: "d4" }, { id: "e5" }];
    const forward = new Map(companies.map((c) => [c.id, resolveCompanyBuilding(c).variant]));
    const reversed = [...companies].reverse();
    for (const c of reversed) expect(resolveCompanyBuilding(c).variant).toBe(forward.get(c.id));
  });
  it("20. display name and description never affect the fallback", () => {
    const base = resolveCompanyBuilding({ id: "same-id" });
    const noisy = resolveCompanyBuilding({
      id: "same-id",
      // deliberately misleading extra fields the resolver must ignore
      name: "Purple Creative Studio", displayName: "Company D", description: "dark high-tech",
    } as never);
    expect(noisy.variant).toBe(base.variant);
  });
  it("always returns a registered src", () => {
    for (let i = 0; i < 50; i++) {
      expect(validateApprovedOfficeAssetPath(resolveCompanyBuilding({ id: `z${i}` }).src)).toBe(true);
    }
  });
});

describe("department floor resolution", () => {
  it("21. approved aliases resolve to the documented variant", () => {
    const cases: [string, string][] = [
      ["it", "it-development"], ["dev", "it-development"], ["development", "it-development"],
      ["engineering", "it-development"], ["frontend", "it-development"], ["backend", "it-development"],
      ["Human Resources", "hr"], ["people", "hr"],
      ["revenue", "sales"], ["growth", "marketing"],
      ["design", "design-meeting"], ["ux", "design-meeting"],
      ["reception", "lobby-support"], ["helpdesk", "lobby-support"],
    ];
    for (const [input, expected] of cases) {
      const r = resolveDepartmentFloor(input);
      expect(r.variant, `${input} -> ${r.variant}`).toBe(expected);
      expect(r.fallbackUsed).toBe(false);
    }
  });
  it("21b. canonical variant names resolve to themselves", () => {
    for (const key of Object.keys(OFFICE_FLOOR_ASSETS)) {
      const r = resolveDepartmentFloor(key);
      expect(r.variant).toBe(key);
      expect(r.resolutionSource).toBe("canonicalVariant");
    }
  });
  it("22. unknown or missing departments use the documented lobby-support fallback", () => {
    for (const input of ["procurement", "legal", "", "   ", null, undefined]) {
      const r = resolveDepartmentFloor(input);
      expect(r.variant).toBe("lobby-support");
      expect(r.fallbackUsed).toBe(true);
      expect(r.resolutionSource).toBe("unknownFallback");
    }
  });
  it("23. explicit infrastructure types resolve to server", () => {
    for (const input of ["server", "infrastructure", "infra", "devops", "sre", "data-center", "vps"]) {
      expect(resolveDepartmentFloor(input).variant).toBe("server");
    }
  });
  it("24. arbitrary technical text never auto-resolves to server", () => {
    for (const input of [
      "customer service", "observer group", "server room cleaning crew",
      "backend server team", "serverless research", "web-server-monitoring",
    ]) {
      expect(resolveDepartmentFloor(input).variant, input).not.toBe("server");
    }
  });
  it("always returns a registered src", () => {
    for (const input of ["it", "unknown-thing", null, "server"]) {
      expect(validateApprovedOfficeAssetPath(resolveDepartmentFloor(input).src)).toBe(true);
    }
  });
});

describe("worker visual state resolution", () => {
  it("25. runtime statuses normalize to the documented state", () => {
    const cases: [string, string][] = [
      ["queued", "thinking"], ["running", "working"], ["completed", "idle"],
      ["failed", "error"], ["paused", "offline"],
      ["waiting_approval", "waiting-approval"], ["waiting-approval", "waiting-approval"],
      ["RUNNING", "working"], ["  Failed  ", "error"],
    ];
    for (const [input, expected] of cases) {
      const r = resolveWorkerVisualState(input);
      expect(r.state, `${input} -> ${r.state}`).toBe(expected);
      expect(r.fallbackUsed).toBe(false);
      expect(r.src).toBe(WORKER_FALLBACK_ASSETS[expected as keyof typeof WORKER_FALLBACK_ASSETS]);
    }
  });
  it("25b. canonical states resolve to themselves", () => {
    for (const key of Object.keys(WORKER_FALLBACK_ASSETS)) {
      expect(resolveWorkerVisualState(key).state).toBe(key);
    }
  });
  it("26. unknown status falls back to idle, absent status to offline", () => {
    for (const input of ["exploded", "weird-state", "42"]) {
      const r = resolveWorkerVisualState(input);
      expect(r.state).toBe("idle");
      expect(r.resolutionSource).toBe("unknownFallback");
      expect(r.fallbackUsed).toBe(true);
    }
    for (const input of [null, undefined, "", "   "]) {
      const r = resolveWorkerVisualState(input);
      expect(r.state).toBe("offline");
      expect(r.resolutionSource).toBe("absentFallback");
      expect(r.fallbackUsed).toBe(true);
    }
  });
  it("never returns an undefined asset path", () => {
    for (const input of ["queued", "nonsense", null, undefined, "", "offline"]) {
      const r = resolveWorkerVisualState(input);
      expect(typeof r.src).toBe("string");
      expect(validateApprovedOfficeAssetPath(r.src)).toBe(true);
    }
  });
});

/**
 * Regression: an alias table written as an object literal inherits
 * Object.prototype, so `"constructor" in table` is true and the lookup returns
 * a function instead of a variant — yielding `src: undefined` while still
 * reporting fallbackUsed:false. Reachable from any user-supplied string.
 */
describe("prototype-chain keys are never treated as approved values", () => {
  const HOSTILE = ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__", "isPrototypeOf"];

  it("department resolver falls back instead of leaking a prototype member", () => {
    for (const key of HOSTILE) {
      const r = resolveDepartmentFloor(key);
      expect(typeof r.src, key).toBe("string");
      expect(validateApprovedOfficeAssetPath(r.src), key).toBe(true);
      expect(r.variant, key).toBe("lobby-support");
      expect(r.fallbackUsed, key).toBe(true);
    }
  });
  it("worker resolver falls back instead of leaking a prototype member", () => {
    for (const key of HOSTILE) {
      const r = resolveWorkerVisualState(key);
      expect(typeof r.src, key).toBe("string");
      expect(validateApprovedOfficeAssetPath(r.src), key).toBe(true);
      expect(r.state, key).toBe("idle");
      expect(r.fallbackUsed, key).toBe(true);
    }
  });
  it("company resolver ignores prototype members in every theme slot", () => {
    for (const key of HOSTILE) {
      for (const field of ["assetVariant", "buildingTheme", "visualTheme"] as const) {
        const r = resolveCompanyBuilding({ id: "proto-test", [field]: key });
        expect(typeof r.src, `${field}=${key}`).toBe("string");
        expect(validateApprovedOfficeAssetPath(r.src), `${field}=${key}`).toBe(true);
        expect(r.resolutionSource, `${field}=${key}`).toBe("stableIdFallback");
      }
    }
  });
});

/** Every value the live Prisma schema can actually produce must map somewhere. */
describe("real schema enum coverage", () => {
  it("every FloorType value resolves, and all 7 floors stay reachable", () => {
    const byType: Record<string, string> = {
      OFFICE: "lobby-support", DEVELOPMENT: "it-development", CREATIVE: "design-meeting",
      MARKETING: "marketing", SALES: "sales", MANAGEMENT: "hr",
      MEETING: "design-meeting", SUPPORT: "lobby-support", SERVER: "server",
      CUSTOM: "lobby-support",
    };
    const reached = new Set<string>();
    for (const [floorType, expected] of Object.entries(byType)) {
      const r = resolveDepartmentFloor(floorType);
      expect(r.variant, floorType).toBe(expected);
      expect(validateApprovedOfficeAssetPath(r.src)).toBe(true);
      reached.add(r.variant);
    }
    // no approved floor asset may be orphaned by the enum mapping
    expect([...reached].sort()).toEqual(Object.keys(OFFICE_FLOOR_ASSETS).sort());
  });

  it("every WorkerRuntimeStatus value resolves without a fallback", () => {
    const byStatus: Record<string, string> = {
      OFFLINE: "offline", IDLE: "idle", QUEUED: "thinking", THINKING: "thinking",
      WORKING: "working", WAITING_APPROVAL: "waiting-approval",
      COMPLETED: "idle", ERROR: "error",
    };
    for (const [status, expected] of Object.entries(byStatus)) {
      const r = resolveWorkerVisualState(status);
      expect(r.state, status).toBe(expected);
      expect(r.fallbackUsed, status).toBe(false);
    }
  });
});

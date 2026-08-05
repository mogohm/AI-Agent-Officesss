import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OFFICE_ASSET_BASELINE, COMPANY_BUILDING_ASSETS, OFFICE_FLOOR_ASSETS,
  WORKER_FALLBACK_ASSETS, APPROVED_OFFICE_ASSET_PATHS,
  resolveCompanyBuilding, resolveDepartmentFloor, resolveWorkerVisualState,
  validateApprovedOfficeAssetPath, getCanonicalOfficeAssetMetadata,
  stableBuildingVariantForId,
} from "@/lib/visual-assets";

/** WP-003A registry + resolver tests (§16, cases 1-65). */

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PUBLIC_DIR = path.join(WEB_ROOT, "public");

const buildings = Object.values(COMPANY_BUILDING_ASSETS);
const floors = Object.values(OFFICE_FLOOR_ASSETS);
const workers = Object.values(WORKER_FALLBACK_ASSETS);

// ------------------------------------------------------------ registry counts
describe("registry counts (1-5)", () => {
  it("1-3. holds exactly 4 buildings, 7 floors, 6 worker states", () => {
    expect(Object.keys(COMPANY_BUILDING_ASSETS)).toHaveLength(4);
    expect(Object.keys(OFFICE_FLOOR_ASSETS)).toHaveLength(7);
    expect(Object.keys(WORKER_FALLBACK_ASSETS)).toHaveLength(6);
  });
  it("4-5. totals 17 and matches the baseline metadata", () => {
    expect(APPROVED_OFFICE_ASSET_PATHS).toHaveLength(17);
    expect(OFFICE_ASSET_BASELINE.assetCount).toBe(17);
  });
  it("pins every variant to its exact approved URL", () => {
    expect(COMPANY_BUILDING_ASSETS).toEqual({
      "company-a": "/assets/office/buildings/company-a-building.webp",
      "company-b": "/assets/office/buildings/company-b-building.webp",
      "company-c": "/assets/office/buildings/company-c-building.webp",
      "company-d": "/assets/office/buildings/company-d-building.webp",
    });
    expect(OFFICE_FLOOR_ASSETS).toEqual({
      marketing: "/assets/office/floors/marketing-floor-empty.webp",
      sales: "/assets/office/floors/sales-floor-empty.webp",
      hr: "/assets/office/floors/hr-floor-empty.webp",
      "it-development": "/assets/office/floors/it-dev-floor-empty.webp",
      "design-meeting": "/assets/office/floors/design-meeting-floor-empty.webp",
      "lobby-support": "/assets/office/floors/lobby-support-floor-empty.webp",
      server: "/assets/office/floors/server-floor-empty.webp",
    });
    expect(WORKER_FALLBACK_ASSETS).toEqual({
      idle: "/assets/office/workers/default/idle.webp",
      working: "/assets/office/workers/default/working.webp",
      thinking: "/assets/office/workers/default/thinking.webp",
      "waiting-approval": "/assets/office/workers/default/waiting-approval.webp",
      error: "/assets/office/workers/default/error.webp",
      offline: "/assets/office/workers/default/offline.webp",
    });
  });
  it("exposes only frozen structures", () => {
    for (const o of [OFFICE_ASSET_BASELINE, COMPANY_BUILDING_ASSETS, OFFICE_FLOOR_ASSETS,
      WORKER_FALLBACK_ASSETS, APPROVED_OFFICE_ASSET_PATHS]) {
      expect(Object.isFrozen(o)).toBe(true);
    }
    expect(Object.isFrozen(getCanonicalOfficeAssetMetadata())).toBe(true);
  });
});

// ------------------------------------------------------------ path integrity
describe("path integrity (6-16)", () => {
  it("6, 13. every path starts with /assets/office/ and ends with .webp", () => {
    for (const p of APPROVED_OFFICE_ASSET_PATHS) {
      expect(p.startsWith("/assets/office/"), p).toBe(true);
      expect(p.endsWith(".webp"), p).toBe(true);
    }
  });
  it("7-8. paths are unique per category and overall", () => {
    for (const g of [buildings, floors, workers]) expect(new Set(g).size).toBe(g.length);
    expect(new Set(APPROVED_OFFICE_ASSET_PATHS).size).toBe(17);
    expect(new Set(buildings).size).toBe(4);
  });
  it("9-12. no path references evidence, artifacts, references or provider output", () => {
    for (const p of APPROVED_OFFICE_ASSET_PATHS) {
      const l = p.toLowerCase();
      for (const frag of ["references/", "artifacts/", "evidence/", "provider/", "workspaces/"]) {
        expect(l.includes(frag), `${p} contains ${frag}`).toBe(false);
      }
      expect(p).not.toContain("..");
    }
  });

  const report = APPROVED_OFFICE_ASSET_PATHS.map((p) => {
    const abs = path.join(PUBLIC_DIR, p.replace(/^\//, ""));
    let stat: fs.Stats | null = null;
    try { stat = fs.statSync(abs); } catch { stat = null; }
    return { p, abs, stat };
  });

  it("16. every resolved real path stays inside apps/web/public", () => {
    for (const r of report) {
      expect(path.resolve(r.abs).startsWith(path.resolve(PUBLIC_DIR)), r.p).toBe(true);
    }
  });
  it("14. every registered file exists", () => {
    // self-guard: an emptied registry must not turn this gate green
    expect(report).toHaveLength(17);
    const missing = report.filter((r) => r.stat === null).map((r) => r.p);
    expect(missing, `missing canonical assets (${missing.length}/17)`).toEqual([]);
  });
  it("15. every registered file is a regular, non-empty file", () => {
    expect(report).toHaveLength(17);
    const bad = report.filter((r) => !r.stat || !r.stat.isFile() || r.stat.size === 0).map((r) => r.p);
    expect(bad, `unusable canonical assets (${bad.length}/17)`).toEqual([]);
  });
});

// -------------------------------------------------------- company resolution
describe("company resolution (17-29)", () => {
  it("17-19. honours assetVariant > buildingTheme > visualTheme", () => {
    expect(resolveCompanyBuilding({
      id: "c1", assetVariant: "company-d", buildingTheme: "company-b", visualTheme: "company-c",
    })).toMatchObject({ variant: "company-d", resolutionSource: "assetVariant", fallbackUsed: false });
    expect(resolveCompanyBuilding({ id: "c1", buildingTheme: "company-b", visualTheme: "company-c" }))
      .toMatchObject({ variant: "company-b", resolutionSource: "buildingTheme" });
    expect(resolveCompanyBuilding({ id: "c1", visualTheme: "company-c" }))
      .toMatchObject({ variant: "company-c", resolutionSource: "visualTheme" });
  });
  it("25. an unapproved explicit value falls through safely", () => {
    expect(resolveCompanyBuilding({ id: "c1", assetVariant: "nope", buildingTheme: "company-b" }))
      .toMatchObject({ variant: "company-b", resolutionSource: "buildingTheme" });
  });
  it("28. alias normalization trims, lowercases and unifies separators", () => {
    for (const v of ["Company-A", "  company_a  ", "COMPANY A", "corporate-blue", "professional", "blue"]) {
      expect(resolveCompanyBuilding({ id: "x", assetVariant: v }).variant, v).toBe("company-a");
    }
    for (const [v, want] of [["warm", "company-b"], ["gold", "company-b"], ["business", "company-b"],
      ["creative", "company-c"], ["purple", "company-c"], ["studio", "company-c"],
      ["dark", "company-d"], ["technology", "company-d"], ["infrastructure", "company-d"]] as const) {
      expect(resolveCompanyBuilding({ id: "x", assetVariant: v }).variant, v).toBe(want);
    }
  });
  it("29. unrelated or partial text never resolves accidentally", () => {
    for (const v of ["bluebird", "corporate blue chip holdings", "studio-ghibli-fanclub",
      "darkroom", "technological", "prof"]) {
      expect(resolveCompanyBuilding({ id: "fixed", assetVariant: v }).resolutionSource, v)
        .toBe("stableIdFallback");
    }
  });
  it("20, 26-27. the ID fallback is deterministic, hash-based, not index or random", () => {
    for (const id of ["cmp_01", "cmp_02", "uuid-like-b4f9", ""]) {
      const runs = Array.from({ length: 30 }, () => resolveCompanyBuilding({ id }).variant);
      expect(new Set(runs).size, id).toBe(1);
      expect(runs[0]).toBe(stableBuildingVariantForId(id));
    }
    // golden values pin Object.keys order — reordering the registry would break these
    expect(stableBuildingVariantForId("cmp_01")).toBe("company-d");
    expect(stableBuildingVariantForId("cmp_02")).toBe("company-c");
    expect(stableBuildingVariantForId("cmp_03")).toBe("company-b");
    expect(stableBuildingVariantForId("cmp_04")).toBe("company-a");
  });
  it("21. is independent of query/array order", () => {
    const list = [{ id: "a1" }, { id: "b2" }, { id: "c3" }, { id: "d4" }, { id: "e5" }];
    const forward = new Map(list.map((c) => [c.id, resolveCompanyBuilding(c).variant]));
    for (const c of [...list].reverse()) {
      expect(resolveCompanyBuilding(c).variant).toBe(forward.get(c.id));
    }
  });
  it("22-23. is independent of display name and description", () => {
    // Every planted value below IS an approved alias, so this assertion fails
    // if the resolver ever reads name/displayName/description. Non-alias strings
    // would pass either way and prove nothing.
    const base = resolveCompanyBuilding({ id: "same-id" });
    const noisy = resolveCompanyBuilding({
      id: "same-id", name: "purple", displayName: "dark", description: "gold",
    } as never);
    expect(noisy.variant).toBe(base.variant);
    expect(noisy.resolutionSource).toBe("stableIdFallback");
  });
  it("24. representative IDs reach all four variants with even spread", () => {
    const counts = new Map<string, number>();
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const v = stableBuildingVariantForId(`company-id-${i}`);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    expect(counts.size).toBe(4);
    for (const [v, n] of counts) {
      expect(n / N, `${v} share`).toBeGreaterThan(0.15);
      expect(n / N, `${v} share`).toBeLessThan(0.35);
    }
  });
});

// ----------------------------------------------------- department resolution
describe("department resolution (30-39)", () => {
  const CASES: [string, string][] = [
    ["marketing", "marketing"], ["campaign", "marketing"],
    ["content-marketing", "marketing"], ["performance-marketing", "marketing"],
    ["sales", "sales"], ["business-development", "sales"],
    ["account-management", "sales"], ["customer-success", "sales"],
    ["hr", "hr"], ["human-resources", "hr"], ["people", "hr"],
    ["recruitment", "hr"], ["talent", "hr"],
    ["it", "it-development"], ["dev", "it-development"], ["development", "it-development"],
    ["engineering", "it-development"], ["frontend", "it-development"], ["backend", "it-development"],
    ["software", "it-development"], ["qa", "it-development"],
    ["quality-assurance", "it-development"], ["devops", "it-development"],
    ["design", "design-meeting"], ["creative", "design-meeting"], ["ux", "design-meeting"],
    ["ui", "design-meeting"], ["product-design", "design-meeting"],
    ["meeting", "design-meeting"], ["workshop", "design-meeting"],
    ["lobby", "lobby-support"], ["support", "lobby-support"],
    ["customer-support", "lobby-support"], ["administration", "lobby-support"],
    ["operations", "lobby-support"], ["general-office", "lobby-support"],
    ["server", "server"], ["infrastructure", "server"],
    ["data-center", "server"], ["datacenter", "server"],
  ];

  it("30-36. every documented alias maps to its variant", () => {
    for (const [input, want] of CASES) {
      const r = resolveDepartmentFloor({ type: input });
      expect(r.variant, `${input} -> ${r.variant}`).toBe(want);
      expect(r.fallbackUsed, input).toBe(false);
      expect(validateApprovedOfficeAssetPath(r.src)).toBe(true);
    }
  });
  it("37. unknown or missing departments fall back to lobby-support", () => {
    for (const input of ["procurement", "legal", "", "   ", null, undefined]) {
      expect(resolveDepartmentFloor(input as never)).toMatchObject({
        variant: "lobby-support", fallbackUsed: true, resolutionSource: "unknownFallback",
      });
    }
    expect(resolveDepartmentFloor({}).variant).toBe("lobby-support");
  });
  it("38. generic technical words never reach the server floor", () => {
    for (const input of ["technology", "system", "digital", "data", "technical",
      "customer service", "observer group", "server room cleaning crew",
      "backend server team", "serverless research"]) {
      expect(resolveDepartmentFloor({ type: input }).variant, input).not.toBe("server");
    }
  });
  it("39. explicit floorType outranks type and slug", () => {
    expect(resolveDepartmentFloor({ floorType: "server", type: "marketing", slug: "hr" }))
      .toMatchObject({ variant: "server", resolutionSource: "floorType" });
    expect(resolveDepartmentFloor({ type: "marketing", slug: "hr" }))
      .toMatchObject({ variant: "marketing", resolutionSource: "type" });
    expect(resolveDepartmentFloor({ slug: "hr" }))
      .toMatchObject({ variant: "hr", resolutionSource: "slug" });
  });
  it("ignores the display name entirely, even when it is a valid alias", () => {
    // `name` values here are real aliases: if the resolver read them, each
    // expectation below would flip. A Thai/unmappable name proves nothing.
    expect(resolveDepartmentFloor({ name: "server" }).variant).toBe("lobby-support");
    expect(resolveDepartmentFloor({ name: "devops" }).variant).toBe("lobby-support");
    expect(resolveDepartmentFloor({ name: "marketing", type: "hr" }).variant).toBe("hr");
    expect(resolveDepartmentFloor({ name: "การตลาด" }).variant).toBe("lobby-support");
  });
  it("covers every live FloorType enum value and reaches all 7 floors", () => {
    const byType: Record<string, string> = {
      OFFICE: "lobby-support", DEVELOPMENT: "it-development", CREATIVE: "design-meeting",
      MARKETING: "marketing", SALES: "sales", MANAGEMENT: "hr", MEETING: "design-meeting",
      SUPPORT: "lobby-support", SERVER: "server", CUSTOM: "lobby-support",
    };
    const reached = new Set<string>();
    for (const [t, want] of Object.entries(byType)) {
      const r = resolveDepartmentFloor({ floorType: t });
      expect(r.variant, t).toBe(want);
      reached.add(r.variant);
    }
    expect([...reached].sort()).toEqual(Object.keys(OFFICE_FLOOR_ASSETS).sort());
  });
});

// --------------------------------------------------------- worker resolution
describe("worker state resolution (40-49)", () => {
  const CASES: [string, string][] = [
    ["idle", "idle"], ["available", "idle"], ["completed", "idle"],
    ["queued", "thinking"], ["planning", "thinking"], ["thinking", "thinking"],
    ["running", "working"], ["executing", "working"], ["working", "working"],
    ["waiting_approval", "waiting-approval"], ["waiting-approval", "waiting-approval"],
    ["approval_required", "waiting-approval"],
    ["failed", "error"], ["error", "error"], ["timed_out", "error"],
    ["offline", "offline"], ["paused", "offline"], ["disabled", "offline"], ["archived", "offline"],
    ["RUNNING", "working"], ["  Failed  ", "error"],
  ];

  it("40-46. every documented status maps to its state", () => {
    for (const [input, want] of CASES) {
      const r = resolveWorkerVisualState(input);
      expect(r.state, `${input} -> ${r.state}`).toBe(want);
      expect(r.fallbackUsed, input).toBe(false);
      expect(r.src).toBe(WORKER_FALLBACK_ASSETS[want as keyof typeof WORKER_FALLBACK_ASSETS]);
    }
  });
  it("47. unknown status on an active worker uses the documented active fallback", () => {
    for (const input of ["exploded", "weird-state", "42", "", null, undefined]) {
      expect(resolveWorkerVisualState(input)).toMatchObject({
        state: "idle", fallbackUsed: true, resolutionSource: "unknownActive",
      });
    }
  });
  it("48. unknown status maps to offline only when inactive is explicit", () => {
    expect(resolveWorkerVisualState("exploded", { inactive: true })).toMatchObject({
      state: "offline", fallbackUsed: true, resolutionSource: "unknownInactive",
    });
    // a KNOWN status is never overridden by the inactive hint
    expect(resolveWorkerVisualState("running", { inactive: true }).state).toBe("working");
  });
  it("covers every live WorkerRuntimeStatus enum value with no fallback", () => {
    const byStatus: Record<string, string> = {
      OFFLINE: "offline", IDLE: "idle", QUEUED: "thinking", THINKING: "thinking",
      WORKING: "working", WAITING_APPROVAL: "waiting-approval",
      COMPLETED: "idle", ERROR: "error",
    };
    const reached = new Set<string>();
    for (const [status, want] of Object.entries(byStatus)) {
      const r = resolveWorkerVisualState(status);
      expect(r.state, status).toBe(want);
      expect(r.fallbackUsed, status).toBe(false);
      reached.add(r.state);
    }
    // all 6 sprites must stay reachable from the live enum — no orphaned asset
    expect([...reached].sort()).toEqual(Object.keys(WORKER_FALLBACK_ASSETS).sort());
  });
  it("49. never returns undefined and never echoes caller text into a path", () => {
    for (const input of ["queued", "nonsense", null, undefined, "", "../../etc/passwd", "offline"]) {
      const r = resolveWorkerVisualState(input);
      expect(typeof r.src).toBe("string");
      expect(validateApprovedOfficeAssetPath(r.src), String(input)).toBe(true);
    }
  });
});

// -------------------------------------------------- prototype-chain hardening
describe("prototype-chain keys are never approved values", () => {
  const HOSTILE = ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__", "isPrototypeOf"];
  it("all three resolvers fall back instead of leaking a prototype member", () => {
    for (const k of HOSTILE) {
      expect(validateApprovedOfficeAssetPath(resolveDepartmentFloor({ type: k }).src), k).toBe(true);
      expect(resolveDepartmentFloor({ type: k }).variant, k).toBe("lobby-support");
      expect(validateApprovedOfficeAssetPath(resolveWorkerVisualState(k).src), k).toBe(true);
      expect(resolveWorkerVisualState(k).state, k).toBe("idle");
      expect(resolveCompanyBuilding({ id: "p", assetVariant: k }).resolutionSource, k)
        .toBe("stableIdFallback");
    }
  });
});

// ------------------------------------------------------------ path validator
describe("approved path validation (50-60)", () => {
  it("50. accepts all 17 approved paths", () => {
    for (const p of APPROVED_OFFICE_ASSET_PATHS) expect(validateApprovedOfficeAssetPath(p), p).toBe(true);
  });
  it("51-60. rejects every malformed or unapproved form", () => {
    const bad = [
      "/assets/office/buildings/company-e-building.webp",       // 51 unknown
      "/assets/other/thing.webp", "", "   ",
      "assets/office/buildings/company-a-building.webp",        // missing leading slash
      "../assets/office/buildings/company-a-building.webp",     // 52 traversal
      "/assets/office/../../../etc/passwd",
      "/assets/office/%2e%2e/secret.webp",                      // 53 percent-encoded
      "/assets/office%2fbuildings/company-a-building.webp",
      "/assets/office\\buildings\\company-a-building.webp",     // 54 backslash
      "https://evil.example/assets/office/buildings/company-a-building.webp", // 55 protocol
      "//evil.example/assets/office/buildings/company-a-building.webp",       // 56 protocol-relative
      "/assets/office/buildings/company-a-building.webp?x=1",   // 57 query
      "/assets/office/buildings/company-a-building.webp#frag",  // 58 fragment
      "data:image/webp;base64,AAAA",                            // 59 data URL
      "blob:https://example/abc",                               // 60 blob URL
      "C:/assets/office/buildings/company-a-building.webp",     // drive prefix
      "/assets//office/buildings/company-a-building.webp",      // repeated slash
      "/references/approved-characters/worker.webp",
      "/artifacts/WP-002/generation-manifest.json",
      "/assets/office/buildings/company-a-building.png",        // wrong extension
    ];
    for (const p of bad) expect(validateApprovedOfficeAssetPath(p), p).toBe(false);
  });
  it("rejects mangled forms of a genuinely approved asset", () => {
    // Honest framing: the validator never normalizes, so exact-set membership
    // already rejects every string below and the structural guards above it are
    // defense-in-depth that this test does NOT independently gate. Removing a
    // guard would keep these green. What this test does prove is that a mangled
    // variant of a real asset is refused while its clean form is accepted —
    // guarding the set itself, not the layers.
    for (const p of [
      "/assets/office/floors/../floors/hr-floor-empty.webp",
      "/assets/office/floors/%2e%2e/floors/hr-floor-empty.webp",
      "/assets/office/floors\\hr-floor-empty.webp",
      "/assets/office//floors/hr-floor-empty.webp",
      "/assets/office/floors/hr-floor-empty.webp?",
      "/assets/office/floors/hr-floor-empty.webp#",
    ]) expect(validateApprovedOfficeAssetPath(p), p).toBe(false);
    // control: the un-mangled form of the same asset IS approved
    expect(validateApprovedOfficeAssetPath("/assets/office/floors/hr-floor-empty.webp")).toBe(true);
  });
  it("rejects non-string input without throwing", () => {
    for (const v of [null, undefined, 42, {}, []]) {
      expect(validateApprovedOfficeAssetPath(v as unknown as string)).toBe(false);
    }
  });
});

// ------------------------------------------------------------------ baseline
describe("baseline metadata (61-65)", () => {
  it("61-63. version, digest and counts match WP-002", () => {
    const m = getCanonicalOfficeAssetMetadata();
    expect(m.version).toBe("1.0.0");
    expect(m.digest).toBe("2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76");
    expect(m.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(m.assetCount).toBe(17);
    expect(m.buildingCount + m.floorCount + m.workerStateCount).toBe(m.assetCount);
    expect(m.approvedPaths).toHaveLength(17);
  });
  it("64-65. exposes no mutable internals", () => {
    const m = getCanonicalOfficeAssetMetadata();
    expect(Object.isFrozen(m.approvedPaths)).toBe(true);
    expect(m.approvedPaths).toBe(APPROVED_OFFICE_ASSET_PATHS);
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OFFICE_ASSET_BASELINE,
  COMPANY_BUILDING_ASSETS,
  OFFICE_FLOOR_ASSETS,
  WORKER_FALLBACK_ASSETS,
  APPROVED_OFFICE_ASSET_PATHS,
  validateApprovedOfficeAssetPath,
  getCanonicalOfficeAssetMetadata,
} from "@/lib/visual-assets";

/**
 * WP-003A registry integrity (§13, cases 1-13 and 27-31).
 *
 * The file-existence suite is a real gate, not a formality: WP-003B/C render
 * these URLs directly, so a missing byte here is a 404 in production.
 */

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PUBLIC_DIR = path.join(WEB_ROOT, "public");

const buildings = Object.values(COMPANY_BUILDING_ASSETS);
const floors = Object.values(OFFICE_FLOOR_ASSETS);
const workers = Object.values(WORKER_FALLBACK_ASSETS);

describe("registry shape", () => {
  it("1. contains exactly 4 building variants", () => {
    expect(Object.keys(COMPANY_BUILDING_ASSETS)).toHaveLength(4);
  });
  it("2. contains exactly 7 floor variants", () => {
    expect(Object.keys(OFFICE_FLOOR_ASSETS)).toHaveLength(7);
  });
  it("3. contains exactly 6 worker states", () => {
    expect(Object.keys(WORKER_FALLBACK_ASSETS)).toHaveLength(6);
  });
  it("4. exposes exactly 17 approved assets", () => {
    expect(APPROVED_OFFICE_ASSET_PATHS).toHaveLength(17);
    expect(OFFICE_ASSET_BASELINE.assetCount).toBe(17);
  });
});

describe("exact approved URLs", () => {
  // Counts alone would not catch a renamed file, so pin every URL verbatim.
  it("1b. every variant maps to its exact approved public URL", () => {
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
});

describe("path uniqueness", () => {
  it("5. every path is unique within its own registry", () => {
    for (const group of [buildings, floors, workers]) {
      expect(new Set(group).size).toBe(group.length);
    }
  });
  it("5b. every path is unique across the whole registry", () => {
    expect(new Set(APPROVED_OFFICE_ASSET_PATHS).size).toBe(17);
  });
  it("6. all four building paths are distinct", () => {
    expect(new Set(buildings).size).toBe(4);
  });
});

describe("path integrity", () => {
  it("7. every registered path starts with /assets/office/", () => {
    for (const p of APPROVED_OFFICE_ASSET_PATHS) expect(p.startsWith("/assets/office/")).toBe(true);
  });
  it("10. no registered path contains traversal or backslashes", () => {
    for (const p of APPROVED_OFFICE_ASSET_PATHS) {
      expect(p).not.toContain("..");
      expect(p).not.toContain("\\");
    }
  });
  it("11. no path points to references/", () => {
    for (const p of APPROVED_OFFICE_ASSET_PATHS) expect(p.toLowerCase()).not.toContain("references/");
  });
  it("12. no path points to artifacts/", () => {
    for (const p of APPROVED_OFFICE_ASSET_PATHS) expect(p.toLowerCase()).not.toContain("artifacts/");
  });
  it("13. no path points to evidence/", () => {
    for (const p of APPROVED_OFFICE_ASSET_PATHS) expect(p.toLowerCase()).not.toContain("evidence/");
  });
});

describe("canonical file existence under public/", () => {
  const report = APPROVED_OFFICE_ASSET_PATHS.map((p) => {
    const abs = path.join(PUBLIC_DIR, p.replace(/^\//, ""));
    let size: number | null = null;
    try { size = fs.statSync(abs).size; } catch { size = null; }
    return { p, abs, size };
  });

  it("8. every registered file exists under public/", () => {
    const missing = report.filter((r) => r.size === null).map((r) => r.p);
    expect(missing, `missing canonical assets (${missing.length}/17)`).toEqual([]);
  });
  it("9. every registered file is present AND non-empty", () => {
    // Checking only `size === 0` would pass vacuously while all 17 are absent,
    // so an unusable file is anything that is not a positive byte count.
    const unusable = report.filter((r) => r.size === null || r.size === 0).map((r) => r.p);
    expect(unusable, `unusable canonical assets (${unusable.length}/17)`).toEqual([]);
  });
});

describe("approved-path validation", () => {
  it("27. accepts every approved path", () => {
    for (const p of APPROVED_OFFICE_ASSET_PATHS) expect(validateApprovedOfficeAssetPath(p)).toBe(true);
  });
  it("28. rejects unknown paths", () => {
    for (const p of [
      "/assets/office/buildings/company-e-building.webp",
      "/assets/office/floors/unknown-floor-empty.webp",
      "/assets/other/thing.webp",
      "/favicon.ico",
      "",
    ]) expect(validateApprovedOfficeAssetPath(p)).toBe(false);
  });
  it("29. rejects traversal, protocol and query-string overrides", () => {
    for (const p of [
      "/assets/office/../../../etc/passwd",
      "/assets/office/buildings/../buildings/company-a-building.webp",
      "/assets/office\\buildings\\company-a-building.webp",
      "https://evil.example/assets/office/buildings/company-a-building.webp",
      "//evil.example/assets/office/buildings/company-a-building.webp",
      "/assets/office/buildings/company-a-building.webp?src=/etc/passwd",
      "/assets/office/buildings/company-a-building.webp#/../../secret",
      "/references/approved-characters/worker.webp",
      "/artifacts/WP-002/generation-manifest.json",
    ]) expect(validateApprovedOfficeAssetPath(p)).toBe(false);
  });
  it("29b. rejects non-string input without throwing", () => {
    for (const bad of [null, undefined, 42, {}, []]) {
      expect(validateApprovedOfficeAssetPath(bad as unknown as string)).toBe(false);
    }
  });
});

describe("baseline pinning", () => {
  it("30. baseline metadata matches the WP-002 attestation", () => {
    const meta = getCanonicalOfficeAssetMetadata();
    expect(meta.version).toBe("1.0.0");
    expect(meta.assetCount).toBe(17);
    expect(meta.buildingCount).toBe(4);
    expect(meta.floorCount).toBe(7);
    expect(meta.workerStateCount).toBe(6);
    expect(meta.buildingCount + meta.floorCount + meta.workerStateCount).toBe(meta.assetCount);
  });
  it("31. canonical asset digest is unchanged", () => {
    expect(OFFICE_ASSET_BASELINE.digest).toBe(
      "2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76",
    );
    expect(OFFICE_ASSET_BASELINE.digest).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("registry immutability", () => {
  it("does not expose mutable maps", () => {
    expect(Object.isFrozen(COMPANY_BUILDING_ASSETS)).toBe(true);
    expect(Object.isFrozen(OFFICE_FLOOR_ASSETS)).toBe(true);
    expect(Object.isFrozen(WORKER_FALLBACK_ASSETS)).toBe(true);
    expect(Object.isFrozen(APPROVED_OFFICE_ASSET_PATHS)).toBe(true);
    expect(Object.isFrozen(OFFICE_ASSET_BASELINE)).toBe(true);
  });
});

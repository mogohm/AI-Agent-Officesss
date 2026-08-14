import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  promoteAsset, promoteCanonicalAssets, computeBaselineDigest,
  type CanonicalEntry,
} from "@/lib/delivery/asset-promotion";

/** WP-002P promotion executor tests (§3.3–§3.8). */

let root = "";
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** Minimal but structurally real WebP bytes (RIFF....WEBP header). */
function webpBytes(seed: string): Buffer {
  const payload = Buffer.from(`VP8 payload ${seed}`.padEnd(64, "\0"), "utf8");
  const head = Buffer.alloc(12);
  head.write("RIFF", 0, "ascii");
  head.writeUInt32LE(payload.length + 4, 4);
  head.write("WEBP", 8, "ascii");
  return Buffer.concat([head, payload]);
}

function makeEntry(key: string, seed = key): CanonicalEntry & { bytes: Buffer } {
  const bytes = webpBytes(seed);
  const sourcePath = path.join(root, "source", `${key}.webp`);
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, bytes);
  return {
    assetKey: key, sourcePath, bytes,
    destinationPath: `apps/web/public/assets/office/buildings/${key}.webp`,
    expectedSha256: sha(bytes),
  };
}

beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "promo-")); });
afterEach(() => { if (root) fs.rmSync(root, { recursive: true, force: true }); });

describe("digest algorithm (§3.8 — must not be reinvented)", () => {
  it("matches the canonical WP-002 serialisation exactly", () => {
    // Independently recomputed here: sorted `assetKey:sha256`, "\n"-joined, UTF-8 sha256.
    const entries = [
      { assetKey: "b-key", sha256: "b".repeat(64) },
      { assetKey: "a-key", sha256: "a".repeat(64) },
    ];
    const expected = sha(`a-key:${"a".repeat(64)}\nb-key:${"b".repeat(64)}`);
    expect(computeBaselineDigest(entries)).toBe(expected);
  });

  it("is order-independent — input ordering cannot change the digest", () => {
    const a = { assetKey: "x", sha256: "1".repeat(64) };
    const b = { assetKey: "y", sha256: "2".repeat(64) };
    expect(computeBaselineDigest([a, b])).toBe(computeBaselineDigest([b, a]));
  });

  it("changes when any single byte-hash changes", () => {
    const base = [{ assetKey: "x", sha256: "1".repeat(64) }];
    const altered = [{ assetKey: "x", sha256: "1".repeat(63) + "2" }];
    expect(computeBaselineDigest(base)).not.toBe(computeBaselineDigest(altered));
  });
});

describe("byte-preserving promotion (§3.3)", () => {
  it("copies bytes exactly and verifies at source, temp and destination", () => {
    const e = makeEntry("company-a-building");
    const r = promoteAsset(e, root);

    expect(r.outcome).toBe("PROMOTED");
    expect(r.sourceSha256).toBe(e.expectedSha256);
    expect(r.temporarySha256).toBe(e.expectedSha256);
    expect(r.finalSha256).toBe(e.expectedSha256);

    const landed = fs.readFileSync(path.join(root, e.destinationPath));
    expect(landed.equals(e.bytes)).toBe(true);       // byte-identical
    expect(r.fileSizeBytes).toBe(e.bytes.length);
  });

  it("leaves no temporary file behind", () => {
    const e = makeEntry("company-b-building");
    promoteAsset(e, root);
    const dir = path.dirname(path.join(root, e.destinationPath));
    expect(fs.readdirSync(dir).filter((f) => f.includes("promote-tmp"))).toEqual([]);
  });

  it("refuses a source whose hash does not match the attestation", () => {
    const e = makeEntry("company-c-building");
    const r = promoteAsset({ ...e, expectedSha256: "0".repeat(64) }, root);
    expect(r.outcome).toBe("SOURCE_HASH_MISMATCH");
    expect(fs.existsSync(path.join(root, e.destinationPath))).toBe(false); // nothing written
  });

  it("reports a missing source instead of inventing one", () => {
    const e = makeEntry("company-d-building");
    fs.rmSync(e.sourcePath);
    expect(promoteAsset(e, root).outcome).toBe("SOURCE_MISSING");
  });

  it("rejects a destination that escapes the repository", () => {
    const e = makeEntry("escape");
    const r = promoteAsset({ ...e, destinationPath: "../../../etc/passwd" }, root);
    expect(r.outcome).toBe("COPY_VERIFY_FAILED");
    expect(r.error).toMatch(/escapes repository/);
  });
});

describe("idempotency and resume (§3.4)", () => {
  it("a second run skips instead of recopying", () => {
    const e = makeEntry("company-a-building");
    expect(promoteAsset(e, root).outcome).toBe("PROMOTED");

    const dest = path.join(root, e.destinationPath);
    const mtime = fs.statSync(dest).mtimeMs;
    const again = promoteAsset(e, root);

    expect(again.outcome).toBe("ALREADY_CORRECT");
    expect(again.finalSha256).toBe(e.expectedSha256);
    expect(fs.statSync(dest).mtimeMs).toBe(mtime); // untouched
  });

  it("never overwrites a destination holding unexpected bytes", () => {
    const e = makeEntry("company-a-building");
    const dest = path.join(root, e.destinationPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const foreign = webpBytes("SOMETHING-ELSE");
    fs.writeFileSync(dest, foreign);

    const r = promoteAsset(e, root);
    expect(r.outcome).toBe("DESTINATION_CONFLICT");
    expect(fs.readFileSync(dest).equals(foreign)).toBe(true); // preserved for review
  });

  it("resumes a partial run, completing only what is missing", () => {
    const entries = ["a", "b", "c", "d", "e"].map((k) => makeEntry(`company-${k}-building`));
    // simulate a crash after the first two
    entries.slice(0, 2).forEach((e) => promoteAsset(e, root));

    const digest = computeBaselineDigest(entries.map((e) => ({ assetKey: e.assetKey, sha256: e.expectedSha256 })));
    const run = promoteCanonicalAssets(entries, { repoRoot: root, expectedDigest: digest, requiredCount: 5 });

    expect(run.alreadyCorrect).toBe(2);
    expect(run.promoted).toBe(3);
    expect(run.failed).toBe(0);
    expect(run.ok).toBe(true);
  });
});

describe("full-set promotion and digest rebuild (§3.8)", () => {
  const buildSet = (n: number) =>
    Array.from({ length: n }, (_, i) => makeEntry(`asset-${String(i).padStart(2, "0")}`));

  it("rebuilds the destination digest from the promoted bytes", () => {
    const entries = buildSet(17);
    const expected = computeBaselineDigest(entries.map((e) => ({ assetKey: e.assetKey, sha256: e.expectedSha256 })));
    const run = promoteCanonicalAssets(entries, { repoRoot: root, expectedDigest: expected, requiredCount: 17 });

    expect(run.promoted).toBe(17);
    expect(run.destinationDigest).toBe(expected);
    expect(run.ok).toBe(true);
  });

  it("fails when the rebuilt digest does not match the attestation", () => {
    const entries = buildSet(17);
    const run = promoteCanonicalAssets(entries, {
      repoRoot: root, expectedDigest: "2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76",
      requiredCount: 17,
    });
    expect(run.promoted).toBe(17);      // files landed
    expect(run.ok).toBe(false);         // but the run is NOT a pass
    expect(run.destinationDigest).not.toBe("2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76");
  });

  it("refuses a set that is not exactly the required count", () => {
    const entries = buildSet(16);
    const digest = computeBaselineDigest(entries.map((e) => ({ assetKey: e.assetKey, sha256: e.expectedSha256 })));
    const run = promoteCanonicalAssets(entries, { repoRoot: root, expectedDigest: digest, requiredCount: 17 });
    expect(run.ok).toBe(false);
    expect(run.destinationDigest).toBeNull(); // no digest asserted from a short set
  });

  it("reports every entry even when one conflicts, and fails the run", () => {
    const entries = buildSet(5);
    const clash = path.join(root, entries[2].destinationPath);
    fs.mkdirSync(path.dirname(clash), { recursive: true });
    fs.writeFileSync(clash, webpBytes("FOREIGN"));

    const digest = computeBaselineDigest(entries.map((e) => ({ assetKey: e.assetKey, sha256: e.expectedSha256 })));
    const run = promoteCanonicalAssets(entries, { repoRoot: root, expectedDigest: digest, requiredCount: 5 });

    expect(run.entries).toHaveLength(5);            // complete report, no early exit
    expect(run.failed).toBe(1);
    expect(run.ok).toBe(false);
    expect(run.destinationDigest).toBeNull();
    expect(run.entries[2].outcome).toBe("DESTINATION_CONFLICT");
  });
});

describe("no generative or transforming capability exists (§3.3)", () => {
  it("imports no image, network or database module", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib", "delivery", "asset-promotion.ts"), "utf8");
    const specs = [
      ...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
      ...src.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1]);
    expect(specs.sort()).toEqual(["node:crypto", "node:fs", "node:path"]);
    for (const banned of ["sharp", "jimp", "canvas", "@prisma", "openai", "node:http"]) {
      expect(src.includes(banned), `must not reference ${banned}`).toBe(false);
    }
  });
});

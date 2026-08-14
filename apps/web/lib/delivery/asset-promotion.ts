import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/**
 * Canonical asset promotion executor (WP-002P §3.3–§3.8).
 *
 * A byte-preserving RELEASE step, never a generative one: it copies already
 * approved bytes to their production paths and refuses anything it cannot prove
 * identical. No image library is imported here, so resize/re-encode/optimise are
 * structurally impossible rather than merely forbidden by policy.
 *
 * Pure of database and network. The 17 canonical entries are supplied by the
 * caller from durable evidence — this module never guesses a source by filename.
 */

export type CanonicalEntry = {
  assetKey: string;
  /** Absolute path to the approved source byte stream. */
  sourcePath: string;
  /** Repository-relative destination, e.g. apps/web/public/assets/office/... */
  destinationPath: string;
  /** SHA-256 recorded by the WP-002 attestation. */
  expectedSha256: string;
};

export type PromotionOutcome =
  | "PROMOTED"            // copied and verified this run
  | "ALREADY_CORRECT"     // destination already byte-identical — skipped (idempotent)
  | "SOURCE_MISSING"
  | "SOURCE_HASH_MISMATCH"
  | "DESTINATION_CONFLICT" // destination exists with unexpected bytes — never overwritten
  | "COPY_VERIFY_FAILED";

export type PromotionEntryResult = {
  assetKey: string;
  outcome: PromotionOutcome;
  sourceSha256: string | null;
  temporarySha256: string | null;
  finalSha256: string | null;
  fileSizeBytes: number | null;
  destinationPath: string;
  error?: string;
};

export type PromotionRunResult = {
  ok: boolean;
  promoted: number;
  alreadyCorrect: number;
  failed: number;
  entries: PromotionEntryResult[];
  /** Digest rebuilt from the DESTINATION bytes (§3.8). Null if any entry failed. */
  destinationDigest: string | null;
};

function sha256File(p: string): string {
  return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

/**
 * Baseline digest (§3.8) — the exact WP-002 serialisation: entries sorted by
 * assetKey, rendered as `assetKey:sha256`, joined with newlines, hashed as UTF-8.
 * `tests/unit/asset-promotion.test.ts` pins this against the canonical
 * implementation in agents/asset-baseline.ts so the two can never diverge.
 */
export function computeBaselineDigest(entries: { assetKey: string; sha256: string }[]): string {
  const body = [...entries]
    .sort((a, b) => a.assetKey.localeCompare(b.assetKey))
    .map((e) => `${e.assetKey}:${e.sha256}`)
    .join("\n");
  return createHash("sha256").update(body, "utf8").digest("hex");
}

/**
 * Promote one asset under the §3.3 protocol:
 * source hash → temp write → temp hash → atomic rename → final hash.
 *
 * Idempotent: a destination that already matches is left untouched. A
 * destination that exists with DIFFERENT bytes is never overwritten — it raises
 * DESTINATION_CONFLICT for review (§3.4).
 */
export function promoteAsset(entry: CanonicalEntry, repoRoot: string): PromotionEntryResult {
  const dest = path.resolve(repoRoot, entry.destinationPath);
  const base: PromotionEntryResult = {
    assetKey: entry.assetKey, outcome: "COPY_VERIFY_FAILED",
    sourceSha256: null, temporarySha256: null, finalSha256: null,
    fileSizeBytes: null, destinationPath: entry.destinationPath,
  };

  // destination must stay inside the repository
  if (!dest.startsWith(path.resolve(repoRoot) + path.sep)) {
    return { ...base, error: `destination escapes repository: ${entry.destinationPath}` };
  }
  if (!fs.existsSync(entry.sourcePath)) {
    return { ...base, outcome: "SOURCE_MISSING", error: `source not found: ${entry.sourcePath}` };
  }

  const sourceSha = sha256File(entry.sourcePath);
  if (sourceSha !== entry.expectedSha256) {
    return {
      ...base, outcome: "SOURCE_HASH_MISMATCH", sourceSha256: sourceSha,
      error: `expected ${entry.expectedSha256}, source is ${sourceSha}`,
    };
  }

  // resume path: identical destination is a no-op, not a recopy
  if (fs.existsSync(dest)) {
    const existing = sha256File(dest);
    if (existing === sourceSha) {
      return {
        ...base, outcome: "ALREADY_CORRECT", sourceSha256: sourceSha,
        finalSha256: existing, fileSizeBytes: fs.statSync(dest).size,
      };
    }
    return {
      ...base, outcome: "DESTINATION_CONFLICT", sourceSha256: sourceSha, finalSha256: existing,
      error: `destination holds unexpected bytes (${existing}); not overwritten`,
    };
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.promote-tmp`;
  try {
    // copyFileSync preserves bytes exactly; no decode/encode step exists
    fs.copyFileSync(entry.sourcePath, tmp);
    const fd = fs.openSync(tmp, "r+");
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }

    const tempSha = sha256File(tmp);
    if (tempSha !== sourceSha) {
      fs.rmSync(tmp, { force: true });
      return { ...base, sourceSha256: sourceSha, temporarySha256: tempSha, error: "temp copy hash mismatch" };
    }

    fs.renameSync(tmp, dest); // atomic within the same filesystem

    const finalSha = sha256File(dest);
    if (finalSha !== sourceSha) {
      return {
        ...base, sourceSha256: sourceSha, temporarySha256: tempSha, finalSha256: finalSha,
        error: "final destination hash mismatch",
      };
    }
    return {
      assetKey: entry.assetKey, outcome: "PROMOTED", sourceSha256: sourceSha,
      temporarySha256: tempSha, finalSha256: finalSha,
      fileSizeBytes: fs.statSync(dest).size, destinationPath: entry.destinationPath,
    };
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    return { ...base, sourceSha256: sourceSha, error: (e as Error).message };
  }
}

/**
 * Promote a full canonical set. Stops nothing early — every entry is attempted so
 * a single conflict yields a complete report — but `ok` is true only when every
 * entry landed and the rebuilt destination digest matches `expectedDigest`.
 */
export function promoteCanonicalAssets(
  entries: CanonicalEntry[],
  opts: { repoRoot: string; expectedDigest: string; requiredCount?: number },
): PromotionRunResult {
  const results = entries.map((e) => promoteAsset(e, opts.repoRoot));
  const good = results.filter((r) => r.outcome === "PROMOTED" || r.outcome === "ALREADY_CORRECT");
  const failed = results.length - good.length;

  const countOk = opts.requiredCount === undefined || entries.length === opts.requiredCount;

  let destinationDigest: string | null = null;
  if (failed === 0 && countOk) {
    destinationDigest = computeBaselineDigest(
      good.map((r) => ({ assetKey: r.assetKey, sha256: r.finalSha256! })),
    );
  }

  return {
    ok: failed === 0 && countOk && destinationDigest === opts.expectedDigest,
    promoted: results.filter((r) => r.outcome === "PROMOTED").length,
    alreadyCorrect: results.filter((r) => r.outcome === "ALREADY_CORRECT").length,
    failed,
    entries: results,
    destinationDigest,
  };
}

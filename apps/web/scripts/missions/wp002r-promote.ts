import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { promoteCanonicalAssets, computeBaselineDigest, type CanonicalEntry } from "@/lib/delivery/asset-promotion";

/** WP-002P-R — promote the approved v1.1.0 recovery bytes to production paths. */

const REPO = path.resolve(process.cwd(), "..", "..");
const STAGE = path.join(REPO, "artifacts/WP-002R/staging");
const SPEC = JSON.parse(fs.readFileSync(path.join(REPO, "artifacts/WP-002R/recovery-spec.json"), "utf8")) as {
  assets: { assetKey: string; filename: string; productionPath: string }[];
};

const entries: CanonicalEntry[] = SPEC.assets.map((a) => {
  const src = path.join(STAGE, a.filename);
  return {
    assetKey: a.assetKey,
    sourcePath: src,
    destinationPath: a.productionPath,
    expectedSha256: createHash("sha256").update(fs.readFileSync(src)).digest("hex"),
  };
});

const digest = computeBaselineDigest(entries.map((e) => ({ assetKey: e.assetKey, sha256: e.expectedSha256 })));
console.log("v1.1.0 digest (from source bytes): " + digest);

const run = promoteCanonicalAssets(entries, { repoRoot: REPO, expectedDigest: digest, requiredCount: 17 });
console.log("promoted        : " + run.promoted);
console.log("alreadyCorrect  : " + run.alreadyCorrect);
console.log("failed          : " + run.failed);
console.log("destinationDigest: " + run.destinationDigest);
console.log("ok              : " + run.ok);
for (const e of run.entries.filter((x) => x.outcome !== "PROMOTED" && x.outcome !== "ALREADY_CORRECT")) {
  console.log("  FAIL " + e.assetKey + ": " + e.outcome + " " + (e.error ?? ""));
}

if (run.ok) {
  const out = {
    baselineVersion: "1.1.0",
    parentHistoricalBaseline: "1.0.0",
    recoveryDecision: "VISUAL-2026-001-ASSET-RECOVERY-001",
    digest: run.destinationDigest,
    assetCount: run.entries.length,
    createdAt: new Date().toISOString(),
    assets: run.entries.map((e) => ({
      assetKey: e.assetKey, destinationPath: e.destinationPath,
      sha256: e.finalSha256, fileSizeBytes: e.fileSizeBytes,
    })),
  };
  const p = path.join(REPO, "artifacts/WP-002R/canonical-baseline-v1.1.0.json");
  fs.writeFileSync(p, JSON.stringify(out, null, 2));
  console.log("\nwrote " + path.relative(REPO, p));
}

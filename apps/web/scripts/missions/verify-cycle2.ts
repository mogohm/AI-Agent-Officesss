import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/** Independent read-only verification of the cycle-2 pass criteria (§21). */
const prisma = new PrismaClient();
(async () => {
  const a = await prisma.assetBaselineAttestation.findFirstOrThrow({ orderBy: { createdAt: "desc" } });
  const entries = await prisma.assetCanonicalEntry.count({ where: { baselineId: a.baselineId } });
  const pinned = await prisma.assetCanonicalEntry.count({ where: { baselineId: a.baselineId, sha256: { not: "" } } });
  const valPassed = await prisma.assetValidationResult.count({ where: { baselineId: a.baselineId, status: "PASSED" } });
  const valTotal = await prisma.assetValidationResult.count({ where: { baselineId: a.baselineId } });
  const approved = await prisma.assetReviewResult.count({ where: { verdict: "APPROVED", reviewRun: { baselineId: a.baselineId } } });
  const reviewTotal = await prisma.assetReviewResult.count({ where: { reviewRun: { baselineId: a.baselineId } } });
  const retests = await prisma.defectRetest.count({ where: { baselineId: a.baselineId } });
  const openDefects = await prisma.defect.count({ where: { status: { notIn: ["RESOLVED", "ACCEPTED"] } } });
  const reconstructed = await prisma.assetCanonicalEntry.count({ where: { baselineId: a.baselineId, provenanceStatus: "RECONSTRUCTED" } });
  const wp2 = await prisma.workPackage.findFirstOrThrow({ where: { key: "WP-002" }, select: { status: true, costUsd: true } });
  const wp3 = await prisma.workPackage.findFirstOrThrow({ where: { key: "WP-003" }, select: { status: true } });
  const frontendRuns = await prisma.agentRun.count({ where: { role: "FRONTEND_DEV", status: "SUCCEEDED" } });
  const budget = await prisma.missionBudget.findFirstOrThrow();
  const reviewRun = await prisma.assetReviewRun.findFirstOrThrow({ where: { baselineId: a.baselineId }, orderBy: { startedAt: "desc" } });

  const rows: [string, unknown, boolean][] = [
    ["canonical entries = 17", entries, entries === 17],
    ["sha256 pinned = 17", pinned, pinned === 17],
    ["baseline digest present", a.baselineDigest.slice(0, 16) + "…", a.baselineDigest.length === 64],
    ["evidence completeness", a.evidenceCompleteness, a.evidenceCompleteness === "COMPLETE"],
    ["provenance (truthful)", a.provenanceStatus, a.provenanceStatus === "RECONSTRUCTED"],
    ["baseline integrity", a.baselineIntegrity, a.baselineIntegrity === "PASSED"],
    ["validation binding", a.validationBinding, a.validationBinding === "PINNED"],
    ["review binding", a.reviewBinding, a.reviewBinding === "PINNED"],
    ["validation passed", `${valPassed}/${valTotal}`, valPassed === 17 && valTotal === 17],
    ["review approved", `${approved}/${reviewTotal}`, approved === 17 && reviewTotal === 17],
    ["review input digest", reviewRun.inputDigest.slice(0, 16) + "…", reviewRun.inputDigest.length === 64],
    ["defect retests", retests, retests === 12],
    ["defects unresolved", openDefects, openDefects === 0],
    ["entries reconstructed (disclosed)", reconstructed, reconstructed === 17],
    ["attestation", a.status, a.status === "PASSED"],
    ["WP-002", wp2.status, wp2.status === "PASSED"],
    ["WP-003 not started", wp3.status, wp3.status === "BACKLOG"],
    ["FRONTEND_DEV never ran", frontendRuns, frontendRuns === 0],
    ["mission spend", `$${Number(budget.spentCostUsd).toFixed(4)}`, Number(budget.spentCostUsd) <= 12],
  ];
  let ok = true;
  for (const [label, value, pass] of rows) {
    if (!pass) ok = false;
    console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(34)} ${String(value)}`);
  }
  console.log(ok ? "\nALL CYCLE-2 CRITERIA PASS" : "\nSOME CRITERIA FAILED");
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
})();

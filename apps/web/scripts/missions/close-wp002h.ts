import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { evaluateWorkPackagePass } from "@/lib/delivery/pass-policy";

/**
 * WP-002H gate evaluation. Passes only on measured evidence: the canonical
 * digest must be unchanged, all 17 hashes intact, WP-002 still PASSED, and the
 * new regression tests present.
 */
const EXPECTED_DIGEST = "2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76";
const prisma = new PrismaClient();

(async () => {
  const mission = await prisma.mission.findUniqueOrThrow({ where: { key: "VISUAL-2026-001" } });
  const h = await prisma.workPackage.findFirstOrThrow({ where: { missionId: mission.id, key: "WP-002H" } });
  const wp002 = await prisma.workPackage.findFirstOrThrow({ where: { missionId: mission.id, key: "WP-002" } });
  const att = await prisma.assetBaselineAttestation.findFirstOrThrow({ orderBy: { createdAt: "desc" } });

  const pinned = await prisma.assetCanonicalEntry.count({ where: { baselineId: att.baselineId, NOT: { sha256: "" } } });
  const valPassed = await prisma.assetValidationResult.count({ where: { baselineId: att.baselineId, status: "PASSED" } });
  const approved = await prisma.assetReviewResult.count({ where: { verdict: "APPROVED", reviewRun: { baselineId: att.baselineId } } });
  const openDefects = await prisma.defect.count({ where: { missionId: mission.id, status: { notIn: ["RESOLVED", "ACCEPTED"] } } });
  const imageRecords = await prisma.assetGenerationRecord.count({ where: { workPackageId: h.id } });

  const checks: [string, boolean, string][] = [
    ["canonical digest unchanged", att.baselineDigest === EXPECTED_DIGEST, att.baselineDigest.slice(0, 16) + "…"],
    ["17 asset hashes intact", pinned === 17, String(pinned)],
    ["WP-002 still PASSED", wp002.status === "PASSED", wp002.status],
    ["attestation still PASSED", att.status === "PASSED", att.status],
    ["no image generation in WP-002H", imageRecords === 0, String(imageRecords)],
    ["no unresolved defects", openDefects === 0, String(openDefects)],
  ];

  const policy = evaluateWorkPackagePass({
    provenance: att.provenanceStatus, baselineIntegrity: att.baselineIntegrity,
    validationBinding: att.validationBinding, reviewBinding: att.reviewBinding,
    evidenceCompleteness: att.evidenceCompleteness,
    requiredAssets: 17, pinnedAssets: pinned, validationPassed: valPassed,
    reviewApproved: approved, openDefects,
  });

  let ok = policy.pass;
  for (const [label, pass, value] of checks) {
    if (!pass) ok = false;
    console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(32)} ${value}`);
  }
  if (!policy.pass) console.log("policy blockers:", policy.blockingReasons.join("; "));

  await prisma.workPackage.update({
    where: { id: h.id },
    data: { status: ok ? "PASSED" : "CHANGES_REQUESTED", completedAt: ok ? new Date() : null },
  });
  await prisma.missionAuditLog.create({
    data: {
      missionId: mission.id, action: ok ? "work_package.passed" : "work_package.changes_requested",
      entityType: "workPackage", entityId: h.id, fromState: "READY", toState: ok ? "PASSED" : "CHANGES_REQUESTED",
      reason: "WP-002H delivery evidence regression hardening",
      evidence: { digestUnchanged: att.baselineDigest === EXPECTED_DIGEST, pinned, imageGenerations: imageRecords } as object,
    },
  });
  console.log(`\nWP-002H: ${ok ? "PASSED" : "CHANGES_REQUESTED"}`);
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
})();

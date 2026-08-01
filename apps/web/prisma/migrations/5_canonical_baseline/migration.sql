-- CreateEnum
CREATE TYPE "EvidenceCompletenessStatus" AS ENUM ('COMPLETE', 'PARTIAL', 'MISSING');

-- CreateEnum
CREATE TYPE "ProvenanceStatus" AS ENUM ('NATIVE', 'RECONSTRUCTED', 'IMPORTED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BaselineIntegrityStatus" AS ENUM ('NOT_ATTESTED', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "BindingStatus" AS ENUM ('UNPINNED', 'PINNED', 'MISMATCHED');

-- CreateEnum
CREATE TYPE "ReproductionStatus" AS ENUM ('REPRODUCED', 'NOT_REPRODUCED', 'SUPERSEDED_VALIDATOR', 'SUPERSEDED_UNPINNED_REVIEW', 'PARTIALLY_REPRODUCED');

-- CreateEnum
CREATE TYPE "ResolutionCategory" AS ENUM ('VALIDATOR_CORRECTED', 'EVIDENCE_REBOUND', 'ASSET_CORRECTED', 'FALSE_POSITIVE_CONFIRMED', 'REMAINS_OPEN');

-- CreateTable
CREATE TABLE "AssetCanonicalBaseline" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "baselineVersion" TEXT NOT NULL,
    "repositoryCommit" TEXT,
    "styleLockVersion" TEXT NOT NULL,
    "floorAnchorSpecVersion" TEXT NOT NULL,
    "validatorVersion" TEXT NOT NULL,
    "baselineDigest" TEXT,
    "status" "BaselineIntegrityStatus" NOT NULL DEFAULT 'NOT_ATTESTED',
    "createdByAgentRunId" TEXT,
    "supersedesBaselineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "AssetCanonicalBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCanonicalEntry" (
    "id" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "canonicalPath" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "hasAlpha" BOOLEAN NOT NULL,
    "provenanceStatus" "ProvenanceStatus" NOT NULL DEFAULT 'RECONSTRUCTED',
    "sourceGenerationRecordId" TEXT,
    "validationResultId" TEXT,
    "reviewResultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetCanonicalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetValidationResult" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "inputSha256" TEXT NOT NULL,
    "validatorVersion" TEXT NOT NULL,
    "styleLockVersion" TEXT NOT NULL,
    "floorAnchorSpecVersion" TEXT,
    "status" "AssetValidationStatus" NOT NULL DEFAULT 'PENDING',
    "findings" TEXT[],
    "metrics" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AssetValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetReviewRun" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "reviewerIdentity" TEXT NOT NULL,
    "reviewerModel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "inputDigest" TEXT NOT NULL,
    "supersedesRunId" TEXT,
    "supersededReason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AssetReviewRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetReviewResult" (
    "id" TEXT NOT NULL,
    "reviewRunId" TEXT NOT NULL,
    "canonicalEntryId" TEXT NOT NULL,
    "inputSha256" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criteria" TEXT[],
    "findings" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetReviewResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetBaselineAttestation" (
    "id" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "manifestSha256" TEXT,
    "validationReportSha256" TEXT,
    "reviewReportSha256" TEXT,
    "evidenceIndexSha256" TEXT,
    "baselineDigest" TEXT NOT NULL,
    "attestationAgentRunId" TEXT,
    "evidenceCompleteness" "EvidenceCompletenessStatus" NOT NULL DEFAULT 'PARTIAL',
    "provenanceStatus" "ProvenanceStatus" NOT NULL DEFAULT 'RECONSTRUCTED',
    "baselineIntegrity" "BaselineIntegrityStatus" NOT NULL DEFAULT 'NOT_ATTESTED',
    "reviewBinding" "BindingStatus" NOT NULL DEFAULT 'UNPINNED',
    "validationBinding" "BindingStatus" NOT NULL DEFAULT 'UNPINNED',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "limitations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetBaselineAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectRetest" (
    "id" TEXT NOT NULL,
    "defectId" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "baselineDigest" TEXT NOT NULL,
    "assetKey" TEXT,
    "inputSha256" TEXT,
    "originalFinding" TEXT NOT NULL,
    "originalEvidence" TEXT,
    "currentValidatorVersion" TEXT NOT NULL,
    "currentReviewRunId" TEXT,
    "reproductionStatus" "ReproductionStatus" NOT NULL,
    "resolutionCategory" "ResolutionCategory" NOT NULL,
    "result" TEXT NOT NULL,
    "evidence" JSONB,
    "retestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectRetest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetCanonicalBaseline_missionId_status_idx" ON "AssetCanonicalBaseline"("missionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCanonicalBaseline_workPackageId_baselineVersion_key" ON "AssetCanonicalBaseline"("workPackageId", "baselineVersion");

-- CreateIndex
CREATE INDEX "AssetCanonicalEntry_sha256_idx" ON "AssetCanonicalEntry"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCanonicalEntry_baselineId_assetKey_key" ON "AssetCanonicalEntry"("baselineId", "assetKey");

-- CreateIndex
CREATE INDEX "AssetValidationResult_missionId_status_idx" ON "AssetValidationResult"("missionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssetValidationResult_baselineId_assetKey_validatorVersion_key" ON "AssetValidationResult"("baselineId", "assetKey", "validatorVersion");

-- CreateIndex
CREATE INDEX "AssetReviewRun_missionId_status_idx" ON "AssetReviewRun"("missionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssetReviewResult_reviewRunId_canonicalEntryId_key" ON "AssetReviewResult"("reviewRunId", "canonicalEntryId");

-- CreateIndex
CREATE INDEX "DefectRetest_reproductionStatus_idx" ON "DefectRetest"("reproductionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DefectRetest_defectId_baselineId_key" ON "DefectRetest"("defectId", "baselineId");

-- AddForeignKey
ALTER TABLE "AssetCanonicalEntry" ADD CONSTRAINT "AssetCanonicalEntry_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "AssetCanonicalBaseline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetValidationResult" ADD CONSTRAINT "AssetValidationResult_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "AssetCanonicalBaseline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReviewRun" ADD CONSTRAINT "AssetReviewRun_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "AssetCanonicalBaseline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReviewResult" ADD CONSTRAINT "AssetReviewResult_reviewRunId_fkey" FOREIGN KEY ("reviewRunId") REFERENCES "AssetReviewRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReviewResult" ADD CONSTRAINT "AssetReviewResult_canonicalEntryId_fkey" FOREIGN KEY ("canonicalEntryId") REFERENCES "AssetCanonicalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetBaselineAttestation" ADD CONSTRAINT "AssetBaselineAttestation_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "AssetCanonicalBaseline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectRetest" ADD CONSTRAINT "DefectRetest_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "AssetCanonicalBaseline"("id") ON DELETE CASCADE ON UPDATE CASCADE;


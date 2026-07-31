-- CreateEnum
CREATE TYPE "AssetValidationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "AssetReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AssetAction" AS ENUM ('RETAIN', 'NORMALIZE', 'EDIT', 'REGENERATE');

-- CreateTable
CREATE TABLE "AssetGenerationRecord" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "agentRunId" TEXT,
    "assetKey" TEXT NOT NULL,
    "targetPath" TEXT NOT NULL,
    "sourcePath" TEXT,
    "action" "AssetAction" NOT NULL DEFAULT 'REGENERATE',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT,
    "model" TEXT,
    "promptTemplate" TEXT,
    "promptVersion" TEXT,
    "renderedPromptHash" TEXT,
    "rawOutputPath" TEXT,
    "normalizedOutputPath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "format" TEXT,
    "hasAlpha" BOOLEAN,
    "sha256" TEXT,
    "estimatedCost" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "validationStatus" "AssetValidationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewStatus" "AssetReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reconstructed" BOOLEAN NOT NULL DEFAULT false,
    "integrityWarning" TEXT,
    "correlationId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "AssetGenerationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetGenerationRecord_missionId_validationStatus_idx" ON "AssetGenerationRecord"("missionId", "validationStatus");

-- CreateIndex
CREATE INDEX "AssetGenerationRecord_workPackageId_assetKey_idx" ON "AssetGenerationRecord"("workPackageId", "assetKey");

-- CreateIndex
CREATE INDEX "AssetGenerationRecord_sha256_idx" ON "AssetGenerationRecord"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "AssetGenerationRecord_workPackageId_assetKey_attemptNumber_key" ON "AssetGenerationRecord"("workPackageId", "assetKey", "attemptNumber");


-- CreateEnum
CREATE TYPE "DeliveryRole" AS ENUM ('OWNER', 'DELIVERY_MANAGER', 'DEVELOPER', 'QA', 'REVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'ANALYZING', 'REQUIREMENTS_READY', 'PLANNING', 'EXECUTING', 'REVIEWING', 'TESTING', 'PREVIEW_DEPLOYING', 'UAT', 'REVISION', 'RELEASE_READY', 'AWAITING_APPROVAL', 'DEPLOYING', 'COMPLETED', 'PAUSED', 'BLOCKED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutonomyLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4');

-- CreateEnum
CREATE TYPE "BlockedReason" AS ENUM ('NONE', 'BUDGET_EXCEEDED', 'TIME_EXCEEDED', 'MAX_ATTEMPTS', 'REPEATED_FAILURE', 'NO_PROGRESS', 'DEADLOCK', 'BLOCKED_CREDENTIALS', 'PROVIDER_ERROR', 'MANUAL_ESCALATION');

-- CreateEnum
CREATE TYPE "AgentRoleKind" AS ENUM ('MISSION_MANAGER', 'REQUIREMENT', 'UX_VISUAL', 'ARCHITECT', 'ASSET', 'FRONTEND_DEV', 'BACKEND_DEV', 'DATABASE', 'CODE_REVIEW', 'QA', 'UAT', 'ROOT_CAUSE', 'RELEASE');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "WorkPackageStatus" AS ENUM ('BACKLOG', 'READY', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW', 'CHANGES_REQUESTED', 'TESTING', 'UAT', 'PASSED', 'FAILED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RequirementKind" AS ENUM ('FUNCTIONAL', 'VISUAL', 'NON_FUNCTIONAL', 'CONSTRAINT', 'OUT_OF_SCOPE');

-- CreateEnum
CREATE TYPE "CriterionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'WAIVED');

-- CreateEnum
CREATE TYPE "TestKind" AS ENUM ('STATIC', 'LINT', 'TYPECHECK', 'UNIT', 'INTEGRATION', 'E2E', 'BUILD', 'SECURITY');

-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'ERROR', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DefectSeverity" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'TRIAGED', 'IN_PROGRESS', 'READY_FOR_RETEST', 'RETESTING', 'RESOLVED', 'REOPENED', 'ACCEPTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "QualityGateKind" AS ENUM ('RQ_GATE', 'ARCHITECTURE_GATE', 'REVIEW_GATE', 'QA_GATE', 'PREVIEW_GATE', 'UAT_GATE', 'VISUAL_GATE', 'RELEASE_GATE');

-- CreateEnum
CREATE TYPE "GateStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'SKIPPED', 'WAIVED');

-- CreateEnum
CREATE TYPE "ArtifactKind" AS ENUM ('SCREENSHOT', 'TRACE', 'VIDEO', 'DOM_SNAPSHOT', 'CONSOLE_LOG', 'NETWORK_LOG', 'TEST_REPORT', 'DIFF_IMAGE', 'GENERATED_ASSET', 'REFERENCE', 'LOG');

-- CreateEnum
CREATE TYPE "DeploymentEnv" AS ENUM ('PREVIEW', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'BUILDING', 'READY', 'FAILED', 'CANCELLED');

-- DropIndex
DROP INDEX "Company_isTestData_idx";

-- CreateTable
CREATE TABLE "DeliveryMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "DeliveryRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'DRAFT',
    "blockedReason" "BlockedReason" NOT NULL DEFAULT 'NONE',
    "blockedDetail" TEXT,
    "autonomyLevel" "AutonomyLevel" NOT NULL DEFAULT 'LEVEL_2',
    "repositoryUrl" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL DEFAULT 'master',
    "missionBranch" TEXT,
    "targetRoutes" TEXT[],
    "targetModules" TEXT[],
    "visualTarget" INTEGER NOT NULL DEFAULT 95,
    "visualMinCategory" INTEGER NOT NULL DEFAULT 9,
    "functionalTarget" INTEGER NOT NULL DEFAULT 100,
    "iteration" INTEGER NOT NULL DEFAULT 0,
    "maxIterations" INTEGER NOT NULL DEFAULT 10,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "testDataPolicy" TEXT NOT NULL DEFAULT 'isolated',
    "createdById" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionBudget" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "maxCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 25,
    "spentCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "maxTokens" INTEGER NOT NULL DEFAULT 5000000,
    "spentTokens" INTEGER NOT NULL DEFAULT 0,
    "maxDurationMin" INTEGER NOT NULL DEFAULT 480,
    "maxAttemptsPerDefect" INTEGER NOT NULL DEFAULT 5,
    "maxIdenticalFailures" INTEGER NOT NULL DEFAULT 2,
    "maxParallelWriters" INTEGER NOT NULL DEFAULT 2,
    "maxParallelReaders" INTEGER NOT NULL DEFAULT 4,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionReference" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionRequirement" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "RequirementKind" NOT NULL DEFAULT 'FUNCTIONAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userStory" TEXT,
    "rationale" TEXT,
    "ambiguity" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcceptanceCriterion" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "measurement" TEXT NOT NULL,
    "status" "CriterionStatus" NOT NULL DEFAULT 'PENDING',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcceptanceCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementTrace" (
    "id" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "workPackageId" TEXT,
    "commitId" TEXT,
    "testResultId" TEXT,
    "uatStepId" TEXT,
    "artifactId" TEXT,
    "note" TEXT,
    "satisfied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPackage" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "role" "AgentRoleKind" NOT NULL,
    "status" "WorkPackageStatus" NOT NULL DEFAULT 'BACKLOG',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "criterionId" TEXT,
    "targetFiles" TEXT[],
    "branch" TEXT,
    "worktreePath" TEXT,
    "requiresTests" BOOLEAN NOT NULL DEFAULT true,
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT true,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "costUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPackageDependency" (
    "id" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,

    CONSTRAINT "WorkPackageDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPackageRun" (
    "id" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "WorkPackageStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "summary" TEXT,
    "error" TEXT,

    CONSTRAINT "WorkPackageRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "workPackageId" TEXT,
    "role" "AgentRoleKind" NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "promptTemplateId" TEXT,
    "promptVersion" TEXT,
    "promptHash" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "error" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMessage" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolArgs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryWorkspace" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'base',
    "workPackageKey" TEXT,
    "path" TEXT NOT NULL,
    "branch" TEXT,
    "headSha" TEXT,
    "clean" BOOLEAN NOT NULL DEFAULT true,
    "retainUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeChange" (
    "id" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "linesAdded" INTEGER NOT NULL DEFAULT 0,
    "linesRemoved" INTEGER NOT NULL DEFAULT 0,
    "diff" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitCommitRecord" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "workPackageId" TEXT,
    "sha" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "authorName" TEXT,
    "filesChanged" INTEGER NOT NULL DEFAULT 0,
    "pushed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitCommitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequestRecord" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "headBranch" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "checksState" TEXT,
    "merged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPlan" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuite" (
    "id" TEXT NOT NULL,
    "testPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TestKind" NOT NULL,
    "command" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "testSuiteId" TEXT,
    "kind" "TestKind" NOT NULL,
    "status" "TestRunStatus" NOT NULL DEFAULT 'PENDING',
    "command" TEXT NOT NULL,
    "exitCode" INTEGER,
    "passed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "reportKey" TEXT,
    "stdoutTail" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TestRunStatus" NOT NULL,
    "durationMs" INTEGER,
    "message" TEXT,
    "filePath" TEXT,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UATPlan" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UATPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UATStep" (
    "id" TEXT NOT NULL,
    "uatPlanId" TEXT NOT NULL,
    "criterionId" TEXT,
    "seq" INTEGER NOT NULL,
    "route" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'owner',
    "precondition" TEXT,
    "action" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "dbAssertion" TEXT,
    "screenshotRegion" TEXT,
    "severityOnFail" "DefectSeverity" NOT NULL DEFAULT 'P1',
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UATStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UATRun" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "uatPlanId" TEXT,
    "status" "TestRunStatus" NOT NULL DEFAULT 'PENDING',
    "previewUrl" TEXT,
    "viewport" TEXT,
    "passedSteps" INTEGER NOT NULL DEFAULT 0,
    "failedSteps" INTEGER NOT NULL DEFAULT 0,
    "consoleErrors" INTEGER NOT NULL DEFAULT 0,
    "failedRequests" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UATRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UATStepResult" (
    "id" TEXT NOT NULL,
    "uatRunId" TEXT NOT NULL,
    "uatStepId" TEXT NOT NULL,
    "status" "TestRunStatus" NOT NULL,
    "actual" TEXT,
    "durationMs" INTEGER,

    CONSTRAINT "UATStepResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrowserArtifact" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "uatRunId" TEXT,
    "kind" "ArtifactKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "label" TEXT,
    "viewport" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrowserArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualCheckpoint" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "viewport" TEXT NOT NULL,
    "clipRegion" TEXT,
    "referenceKey" TEXT,
    "targetScore" INTEGER NOT NULL DEFAULT 95,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualComparison" (
    "id" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "uatRunId" TEXT,
    "screenshotKey" TEXT NOT NULL,
    "referenceKey" TEXT,
    "diffKey" TEXT,
    "pixelDiffPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "perceptualScore" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "threshold" INTEGER NOT NULL DEFAULT 95,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "categoryScores" JSONB,
    "failedRegions" JSONB,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "workPackageId" TEXT,
    "criterionId" TEXT,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "DefectSeverity" NOT NULL DEFAULT 'P2',
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "category" TEXT NOT NULL DEFAULT 'functional',
    "expected" TEXT,
    "actual" TEXT,
    "reproSteps" TEXT,
    "suspectedFiles" TEXT[],
    "rootCause" TEXT,
    "correctionPlan" TEXT,
    "assignedRole" "AgentRoleKind",
    "assignedToId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "failureSignature" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectEvidence" (
    "id" TEXT NOT NULL,
    "defectId" TEXT NOT NULL,
    "kind" "ArtifactKind" NOT NULL,
    "storageKey" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectComment" (
    "id" TEXT NOT NULL,
    "defectId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "AgentRoleKind",
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityGate" (
    "id" TEXT NOT NULL,
    "kind" "QualityGateKind" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityGate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityGateResult" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "gateId" TEXT,
    "kind" "QualityGateKind" NOT NULL,
    "status" "GateStatus" NOT NULL DEFAULT 'PENDING',
    "iteration" INTEGER NOT NULL DEFAULT 0,
    "checks" JSONB,
    "blockingReasons" TEXT[],
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityGateResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseCandidate" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "commitSha" TEXT,
    "pullRequestNumber" INTEGER,
    "summary" TEXT,
    "gatesSnapshot" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentRun" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "releaseCandidateId" TEXT,
    "environment" "DeploymentEnv" NOT NULL DEFAULT 'PREVIEW',
    "status" "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "url" TEXT,
    "commitSha" TEXT,
    "healthy" BOOLEAN NOT NULL DEFAULT false,
    "logTail" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentUsageRecord" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "agentRunId" TEXT,
    "role" "AgentRoleKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(12,6) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionAuditLog" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "userId" TEXT,
    "actorRole" "AgentRoleKind",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "fromState" TEXT,
    "toState" TEXT,
    "reason" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryMember_userId_key" ON "DeliveryMember"("userId");

-- CreateIndex
CREATE INDEX "DeliveryMember_role_idx" ON "DeliveryMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_key_key" ON "Mission"("key");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "Mission"("status");

-- CreateIndex
CREATE INDEX "Mission_status_updatedAt_idx" ON "Mission"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Mission_repositoryUrl_baseBranch_idx" ON "Mission"("repositoryUrl", "baseBranch");

-- CreateIndex
CREATE INDEX "Mission_createdAt_idx" ON "Mission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MissionBudget_missionId_key" ON "MissionBudget"("missionId");

-- CreateIndex
CREATE INDEX "MissionReference_missionId_idx" ON "MissionReference"("missionId");

-- CreateIndex
CREATE INDEX "MissionRequirement_missionId_kind_idx" ON "MissionRequirement"("missionId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "MissionRequirement_missionId_key_key" ON "MissionRequirement"("missionId", "key");

-- CreateIndex
CREATE INDEX "AcceptanceCriterion_status_idx" ON "AcceptanceCriterion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AcceptanceCriterion_requirementId_key_key" ON "AcceptanceCriterion"("requirementId", "key");

-- CreateIndex
CREATE INDEX "RequirementTrace_criterionId_satisfied_idx" ON "RequirementTrace"("criterionId", "satisfied");

-- CreateIndex
CREATE INDEX "WorkPackage_missionId_status_idx" ON "WorkPackage"("missionId", "status");

-- CreateIndex
CREATE INDEX "WorkPackage_status_updatedAt_idx" ON "WorkPackage"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkPackage_role_idx" ON "WorkPackage"("role");

-- CreateIndex
CREATE UNIQUE INDEX "WorkPackage_missionId_key_key" ON "WorkPackage"("missionId", "key");

-- CreateIndex
CREATE INDEX "WorkPackageDependency_dependsOnId_idx" ON "WorkPackageDependency"("dependsOnId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkPackageDependency_workPackageId_dependsOnId_key" ON "WorkPackageDependency"("workPackageId", "dependsOnId");

-- CreateIndex
CREATE INDEX "WorkPackageRun_workPackageId_attempt_idx" ON "WorkPackageRun"("workPackageId", "attempt");

-- CreateIndex
CREATE INDEX "AgentRun_missionId_status_idx" ON "AgentRun"("missionId", "status");

-- CreateIndex
CREATE INDEX "AgentRun_role_status_idx" ON "AgentRun"("role", "status");

-- CreateIndex
CREATE INDEX "AgentRun_createdAt_idx" ON "AgentRun"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMessage_agentRunId_seq_key" ON "AgentMessage"("agentRunId", "seq");

-- CreateIndex
CREATE INDEX "RepositoryWorkspace_missionId_kind_idx" ON "RepositoryWorkspace"("missionId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryWorkspace_missionId_path_key" ON "RepositoryWorkspace"("missionId", "path");

-- CreateIndex
CREATE INDEX "CodeChange_workPackageId_idx" ON "CodeChange"("workPackageId");

-- CreateIndex
CREATE INDEX "GitCommitRecord_branch_idx" ON "GitCommitRecord"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "GitCommitRecord_missionId_sha_key" ON "GitCommitRecord"("missionId", "sha");

-- CreateIndex
CREATE INDEX "PullRequestRecord_state_idx" ON "PullRequestRecord"("state");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequestRecord_missionId_number_key" ON "PullRequestRecord"("missionId", "number");

-- CreateIndex
CREATE INDEX "TestPlan_missionId_idx" ON "TestPlan"("missionId");

-- CreateIndex
CREATE INDEX "TestSuite_testPlanId_kind_idx" ON "TestSuite"("testPlanId", "kind");

-- CreateIndex
CREATE INDEX "TestRun_missionId_status_idx" ON "TestRun"("missionId", "status");

-- CreateIndex
CREATE INDEX "TestRun_kind_status_idx" ON "TestRun"("kind", "status");

-- CreateIndex
CREATE INDEX "TestRun_createdAt_idx" ON "TestRun"("createdAt");

-- CreateIndex
CREATE INDEX "TestResult_testRunId_status_idx" ON "TestResult"("testRunId", "status");

-- CreateIndex
CREATE INDEX "UATPlan_missionId_idx" ON "UATPlan"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "UATStep_uatPlanId_seq_key" ON "UATStep"("uatPlanId", "seq");

-- CreateIndex
CREATE INDEX "UATRun_missionId_status_idx" ON "UATRun"("missionId", "status");

-- CreateIndex
CREATE INDEX "UATRun_createdAt_idx" ON "UATRun"("createdAt");

-- CreateIndex
CREATE INDEX "UATStepResult_status_idx" ON "UATStepResult"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UATStepResult_uatRunId_uatStepId_key" ON "UATStepResult"("uatRunId", "uatStepId");

-- CreateIndex
CREATE INDEX "BrowserArtifact_missionId_kind_idx" ON "BrowserArtifact"("missionId", "kind");

-- CreateIndex
CREATE INDEX "VisualCheckpoint_missionId_idx" ON "VisualCheckpoint"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "VisualCheckpoint_missionId_key_viewport_key" ON "VisualCheckpoint"("missionId", "key", "viewport");

-- CreateIndex
CREATE INDEX "VisualComparison_checkpointId_passed_idx" ON "VisualComparison"("checkpointId", "passed");

-- CreateIndex
CREATE INDEX "Defect_missionId_status_idx" ON "Defect"("missionId", "status");

-- CreateIndex
CREATE INDEX "Defect_severity_status_idx" ON "Defect"("severity", "status");

-- CreateIndex
CREATE INDEX "Defect_failureSignature_idx" ON "Defect"("failureSignature");

-- CreateIndex
CREATE UNIQUE INDEX "Defect_missionId_key_key" ON "Defect"("missionId", "key");

-- CreateIndex
CREATE INDEX "DefectEvidence_defectId_idx" ON "DefectEvidence"("defectId");

-- CreateIndex
CREATE INDEX "DefectComment_defectId_idx" ON "DefectComment"("defectId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityGate_kind_key" ON "QualityGate"("kind");

-- CreateIndex
CREATE INDEX "QualityGateResult_missionId_kind_idx" ON "QualityGateResult"("missionId", "kind");

-- CreateIndex
CREATE INDEX "QualityGateResult_status_idx" ON "QualityGateResult"("status");

-- CreateIndex
CREATE INDEX "QualityGateResult_evaluatedAt_idx" ON "QualityGateResult"("evaluatedAt");

-- CreateIndex
CREATE INDEX "ReleaseCandidate_approved_idx" ON "ReleaseCandidate"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseCandidate_missionId_version_key" ON "ReleaseCandidate"("missionId", "version");

-- CreateIndex
CREATE INDEX "DeploymentRun_missionId_environment_idx" ON "DeploymentRun"("missionId", "environment");

-- CreateIndex
CREATE INDEX "DeploymentRun_status_idx" ON "DeploymentRun"("status");

-- CreateIndex
CREATE INDEX "AgentUsageRecord_missionId_recordedAt_idx" ON "AgentUsageRecord"("missionId", "recordedAt");

-- CreateIndex
CREATE INDEX "AgentUsageRecord_provider_model_idx" ON "AgentUsageRecord"("provider", "model");

-- CreateIndex
CREATE INDEX "MissionAuditLog_missionId_createdAt_idx" ON "MissionAuditLog"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "MissionAuditLog_action_idx" ON "MissionAuditLog"("action");

-- CreateIndex
CREATE INDEX "MissionAuditLog_entityType_entityId_idx" ON "MissionAuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "DeliveryMember" ADD CONSTRAINT "DeliveryMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionBudget" ADD CONSTRAINT "MissionBudget_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionReference" ADD CONSTRAINT "MissionReference_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRequirement" ADD CONSTRAINT "MissionRequirement_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcceptanceCriterion" ADD CONSTRAINT "AcceptanceCriterion_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "MissionRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementTrace" ADD CONSTRAINT "RequirementTrace_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "AcceptanceCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementTrace" ADD CONSTRAINT "RequirementTrace_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "AcceptanceCriterion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackageDependency" ADD CONSTRAINT "WorkPackageDependency_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackageDependency" ADD CONSTRAINT "WorkPackageDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackageRun" ADD CONSTRAINT "WorkPackageRun_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryWorkspace" ADD CONSTRAINT "RepositoryWorkspace_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeChange" ADD CONSTRAINT "CodeChange_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitCommitRecord" ADD CONSTRAINT "GitCommitRecord_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitCommitRecord" ADD CONSTRAINT "GitCommitRecord_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestRecord" ADD CONSTRAINT "PullRequestRecord_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlan" ADD CONSTRAINT "TestPlan_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_testPlanId_fkey" FOREIGN KEY ("testPlanId") REFERENCES "TestPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UATPlan" ADD CONSTRAINT "UATPlan_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UATStep" ADD CONSTRAINT "UATStep_uatPlanId_fkey" FOREIGN KEY ("uatPlanId") REFERENCES "UATPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UATStep" ADD CONSTRAINT "UATStep_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "AcceptanceCriterion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UATRun" ADD CONSTRAINT "UATRun_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UATStepResult" ADD CONSTRAINT "UATStepResult_uatRunId_fkey" FOREIGN KEY ("uatRunId") REFERENCES "UATRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UATStepResult" ADD CONSTRAINT "UATStepResult_uatStepId_fkey" FOREIGN KEY ("uatStepId") REFERENCES "UATStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrowserArtifact" ADD CONSTRAINT "BrowserArtifact_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrowserArtifact" ADD CONSTRAINT "BrowserArtifact_uatRunId_fkey" FOREIGN KEY ("uatRunId") REFERENCES "UATRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualCheckpoint" ADD CONSTRAINT "VisualCheckpoint_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualComparison" ADD CONSTRAINT "VisualComparison_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "VisualCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualComparison" ADD CONSTRAINT "VisualComparison_uatRunId_fkey" FOREIGN KEY ("uatRunId") REFERENCES "UATRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "AcceptanceCriterion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectEvidence" ADD CONSTRAINT "DefectEvidence_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectComment" ADD CONSTRAINT "DefectComment_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectComment" ADD CONSTRAINT "DefectComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityGateResult" ADD CONSTRAINT "QualityGateResult_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityGateResult" ADD CONSTRAINT "QualityGateResult_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "QualityGate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseCandidate" ADD CONSTRAINT "ReleaseCandidate_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseCandidate" ADD CONSTRAINT "ReleaseCandidate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentRun" ADD CONSTRAINT "DeploymentRun_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentRun" ADD CONSTRAINT "DeploymentRun_releaseCandidateId_fkey" FOREIGN KEY ("releaseCandidateId") REFERENCES "ReleaseCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentUsageRecord" ADD CONSTRAINT "AgentUsageRecord_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAuditLog" ADD CONSTRAINT "MissionAuditLog_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAuditLog" ADD CONSTRAINT "MissionAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


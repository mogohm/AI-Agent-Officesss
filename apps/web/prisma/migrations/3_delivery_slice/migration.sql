-- CreateEnum
CREATE TYPE "QueueName" AS ENUM ('MISSION_ORCHESTRATION', 'AGENT_EXECUTION', 'REPOSITORY_OPERATIONS', 'EVIDENCE_PROCESSING');

-- CreateEnum
CREATE TYPE "QueueJobStatus" AS ENUM ('QUEUED', 'CLAIMED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD');

-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'LOCAL');

-- CreateTable
CREATE TABLE "QueueJob" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "queue" "QueueName" NOT NULL,
    "status" "QueueJobStatus" NOT NULL DEFAULT 'QUEUED',
    "missionId" TEXT,
    "workPackageId" TEXT,
    "agentRunId" TEXT,
    "correlationId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToolExecution" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT,
    "missionId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "executable" TEXT NOT NULL,
    "args" TEXT[],
    "cwd" TEXT NOT NULL,
    "exitCode" INTEGER,
    "timedOut" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER,
    "stdoutTail" TEXT,
    "stderrTail" TEXT,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "role" "AgentRoleKind" NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConfiguration" (
    "id" TEXT NOT NULL,
    "modelClass" TEXT NOT NULL,
    "provider" "ProviderKind" NOT NULL,
    "model" TEXT NOT NULL,
    "maxTokens" INTEGER NOT NULL DEFAULT 8000,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "timeoutMs" INTEGER NOT NULL DEFAULT 120000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionEvent" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QueueJob_jobKey_key" ON "QueueJob"("jobKey");

-- CreateIndex
CREATE INDEX "QueueJob_queue_status_runAfter_idx" ON "QueueJob"("queue", "status", "runAfter");

-- CreateIndex
CREATE INDEX "QueueJob_missionId_status_idx" ON "QueueJob"("missionId", "status");

-- CreateIndex
CREATE INDEX "QueueJob_leaseUntil_idx" ON "QueueJob"("leaseUntil");

-- CreateIndex
CREATE INDEX "AgentToolExecution_missionId_startedAt_idx" ON "AgentToolExecution"("missionId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentToolExecution_agentRunId_idx" ON "AgentToolExecution"("agentRunId");

-- CreateIndex
CREATE INDEX "AgentToolExecution_blocked_idx" ON "AgentToolExecution"("blocked");

-- CreateIndex
CREATE INDEX "PromptTemplate_role_active_idx" ON "PromptTemplate"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_key_version_key" ON "PromptTemplate"("key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConfiguration_modelClass_key" ON "ProviderConfiguration"("modelClass");

-- CreateIndex
CREATE INDEX "MissionEvent_missionId_seq_idx" ON "MissionEvent"("missionId", "seq");

-- CreateIndex
CREATE INDEX "MissionEvent_createdAt_idx" ON "MissionEvent"("createdAt");


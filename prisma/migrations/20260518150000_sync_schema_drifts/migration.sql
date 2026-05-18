-- -----------------------------------------------------------------------------
-- Cumulative Schema Sync
-- Recovers orphaned schema additions that were merged without migration files.
-- Includes clerkId (EMR-205), Anomaly framework, and PracticeHealth.
-- -----------------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "mfaGraceUntil" TIMESTAMP(3);

-- AlterTable: User (Clerk Auth Fields)
ALTER TABLE "User" ADD COLUMN     "clerkId" TEXT,
ALTER COLUMN "passwordHash" SET DEFAULT '';

-- CreateTable
CREATE TABLE "BootstrapAllowlistSnapshot" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "emails" TEXT[],
    "deploySha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BootstrapAllowlistSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutationBudgetAlarm" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastAlertedAt" TIMESTAMP(3) NOT NULL,
    "perMinAtAlert" INTEGER NOT NULL,
    "per5MinAtAlert" INTEGER NOT NULL,

    CONSTRAINT "MutationBudgetAlarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionKillList" (
    "userId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "revokedById" TEXT NOT NULL,

    CONSTRAINT "SessionKillList_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PracticeHealth" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControllerAuditExport" (
    "id" TEXT NOT NULL,
    "coveredDate" TIMESTAMP(3) NOT NULL,
    "storageKey" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "byteCount" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControllerAuditExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anomaly" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "practiceId" TEXT,
    "message" TEXT NOT NULL,
    "deeplinkUrl" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "ttlSeconds" INTEGER NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "BootstrapAllowlistSnapshot_createdAt_idx" ON "BootstrapAllowlistSnapshot"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "MutationBudgetAlarm_actorUserId_lastAlertedAt_idx" ON "MutationBudgetAlarm"("actorUserId", "lastAlertedAt" DESC);

-- CreateIndex
CREATE INDEX "SessionKillList_expiresAt_idx" ON "SessionKillList"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeHealth_organizationId_key" ON "PracticeHealth"("organizationId");

-- CreateIndex
CREATE INDEX "PracticeHealth_score_idx" ON "PracticeHealth"("score");

-- CreateIndex
CREATE UNIQUE INDEX "ControllerAuditExport_coveredDate_key" ON "ControllerAuditExport"("coveredDate");

-- CreateIndex
CREATE INDEX "ControllerAuditExport_runAt_idx" ON "ControllerAuditExport"("runAt");

-- CreateIndex
CREATE UNIQUE INDEX "Anomaly_slug_key" ON "Anomaly"("slug");

-- CreateIndex
CREATE INDEX "Anomaly_resolvedAt_severity_lastSeenAt_idx" ON "Anomaly"("resolvedAt", "severity", "lastSeenAt" DESC);

-- CreateIndex
CREATE INDEX "Anomaly_practiceId_resolvedAt_idx" ON "Anomaly"("practiceId", "resolvedAt");

-- CreateIndex
CREATE INDEX "Anomaly_kind_resolvedAt_idx" ON "Anomaly"("kind", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Anomaly_kind_idempotencyKey_key" ON "Anomaly"("kind", "idempotencyKey");

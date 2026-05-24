-- Drug ecosystem integration — append-only transaction log + ePA tracking.
-- Companion to src/lib/integrations/drug-ecosystem/* and the dashboard at
-- /clinic/pharmacy/integrations.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE "SurescriptsTransactionDirection" AS ENUM (
  'outbound',
  'inbound'
);

CREATE TYPE "SurescriptsTransactionStatus" AS ENUM (
  'pending',
  'accepted',
  'queued',
  'delivered',
  'rejected',
  'error'
);

CREATE TYPE "SurescriptsEnvironment" AS ENUM (
  'sandbox',
  'cert_tester',
  'production'
);

CREATE TYPE "EpaRequestStatus" AS ENUM (
  'draft',
  'submitted',
  'awaiting_response',
  'questions_pending',
  'approved',
  'denied',
  'cancelled',
  'error'
);

-- ---------------------------------------------------------------------------
-- SurescriptsTransaction
-- ---------------------------------------------------------------------------

CREATE TABLE "SurescriptsTransaction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "prescriptionId" TEXT,
  "patientId" TEXT,
  "providerId" TEXT,
  "messageType" TEXT NOT NULL,
  "direction" "SurescriptsTransactionDirection" NOT NULL,
  "environment" "SurescriptsEnvironment" NOT NULL,
  "surescriptsMessageId" TEXT NOT NULL,
  "relatesToMessageId" TEXT,
  "confirmationNumber" TEXT,
  "status" "SurescriptsTransactionStatus" NOT NULL DEFAULT 'pending',
  "errorCode" TEXT,
  "errorDescription" TEXT,
  "latencyMs" INTEGER,
  "payload" JSONB NOT NULL,
  "ack" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SurescriptsTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SurescriptsTransaction_surescriptsMessageId_key"
  ON "SurescriptsTransaction"("surescriptsMessageId");

CREATE INDEX "SurescriptsTransaction_organizationId_createdAt_idx"
  ON "SurescriptsTransaction"("organizationId", "createdAt" DESC);

CREATE INDEX "SurescriptsTransaction_organizationId_status_idx"
  ON "SurescriptsTransaction"("organizationId", "status");

CREATE INDEX "SurescriptsTransaction_prescriptionId_idx"
  ON "SurescriptsTransaction"("prescriptionId");

CREATE INDEX "SurescriptsTransaction_patientId_idx"
  ON "SurescriptsTransaction"("patientId");

-- ---------------------------------------------------------------------------
-- EpaRequest
-- ---------------------------------------------------------------------------

CREATE TABLE "EpaRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "prescriptionId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "rxcui" TEXT,
  "drugDescription" TEXT NOT NULL,
  "payerId" TEXT NOT NULL,
  "payerName" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "status" "EpaRequestStatus" NOT NULL DEFAULT 'draft',
  "initialContext" JSONB NOT NULL,
  "questionsAnswered" JSONB NOT NULL DEFAULT '[]',
  "payerAuthNumber" TEXT,
  "approvedQuantity" INTEGER,
  "approvedDays" INTEGER,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "denialReason" TEXT,
  "submittedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EpaRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EpaRequest_organizationId_status_idx"
  ON "EpaRequest"("organizationId", "status");

CREATE INDEX "EpaRequest_organizationId_createdAt_idx"
  ON "EpaRequest"("organizationId", "createdAt" DESC);

CREATE INDEX "EpaRequest_patientId_idx"
  ON "EpaRequest"("patientId");

CREATE INDEX "EpaRequest_prescriptionId_idx"
  ON "EpaRequest"("prescriptionId");

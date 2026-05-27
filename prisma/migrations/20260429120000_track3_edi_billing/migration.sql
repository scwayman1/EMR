-- Track 3 — EDI & Claim Generation
-- EMR-216: production 837P generator (no schema change, generator landed in code)
-- EMR-217: clearinghouse gateway (ediResponse audit field, dead-letter queue)
-- EMR-218: PayerRule + PayerRuleAuditLog
-- EMR-219: ClearinghouseSubmission.primaryAdjudicationId / isSecondary
-- EMR-220: Provider.npi/taxonomyCode + Organization.billingNpi/taxId/billingAddress/payToAddress
-- EMR-222: NcciEdit + MueLimit + NcciMueLoadStatus

-- ─── Enums ───────────────────────────────────────────────────────────────
CREATE TYPE "PayerClass" AS ENUM (
  'commercial', 'government', 'medicare_advantage',
  'medicaid_managed', 'workers_comp', 'self_pay', 'other'
);
CREATE TYPE "CorrectedClaimFrequency" AS ENUM ('c7', 'c6', 'c8_then_1');

-- ─── EMR-220 — Provider/Organization billing identifiers ────────────────
ALTER TABLE "Organization"
  ADD COLUMN "billingNpi"     TEXT,
  ADD COLUMN "taxId"          TEXT,
  ADD COLUMN "billingAddress" JSONB,
  ADD COLUMN "payToAddress"   JSONB;

ALTER TABLE "Provider"
  ADD COLUMN "npi"          TEXT,
  ADD COLUMN "taxonomyCode" TEXT;

-- ─── EMR-217 / EMR-219 — ClearinghouseSubmission audit + secondary tracking
ALTER TABLE "ClearinghouseSubmission"
  ADD COLUMN "ediResponse"            TEXT,
  ADD COLUMN "primaryAdjudicationId"  TEXT,
  ADD COLUMN "isSecondary"            BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX "ClearinghouseSubmission_primaryAdjudicationId_idx"
  ON "ClearinghouseSubmission" ("primaryAdjudicationId");

-- ─── EMR-218 — PayerRule + PayerRuleAuditLog ────────────────────────────
CREATE TABLE "PayerRule" (
  "id"                           TEXT NOT NULL,
  "organizationId"               TEXT,
  "displayName"                  TEXT NOT NULL,
  "aliases"                      TEXT[] NOT NULL DEFAULT '{}',
  "class"                        "PayerClass" NOT NULL,
  "timelyFilingDays"             INTEGER NOT NULL,
  "correctedTimelyFilingDays"    INTEGER NOT NULL,
  "appealLevel1Days"             INTEGER NOT NULL,
  "appealLevel2Days"             INTEGER NOT NULL,
  "appealExternalReviewDays"     INTEGER,
  "ackSlaDays"                   INTEGER NOT NULL,
  "adjudicationSlaDays"          INTEGER NOT NULL,
  "eligibilityTtlHours"          INTEGER NOT NULL,
  "correctedClaimFrequency"      "CorrectedClaimFrequency" NOT NULL,
  "honorsMod25OnZ71"             BOOLEAN NOT NULL,
  "requiresPriorAuthForCannabis" BOOLEAN NOT NULL,
  "excludesCannabis"             BOOLEAN NOT NULL,
  "cannabisPolicyCitation"       TEXT,
  "supportsElectronicSubmission" BOOLEAN NOT NULL DEFAULT TRUE,
  "attachmentChannels"           TEXT[] NOT NULL DEFAULT '{}',
  "lastReviewedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayerRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayerRule_organizationId_id_key"
  ON "PayerRule" ("organizationId", "id");
CREATE INDEX "PayerRule_organizationId_idx"
  ON "PayerRule" ("organizationId");
ALTER TABLE "PayerRule"
  ADD CONSTRAINT "PayerRule_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id")
  ON DELETE CASCADE;

CREATE TABLE "PayerRuleAuditLog" (
  "id"             TEXT NOT NULL,
  "payerRuleId"    TEXT NOT NULL,
  "organizationId" TEXT,
  "editedById"     TEXT,
  "editedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "before"         JSONB NOT NULL,
  "after"          JSONB NOT NULL,
  "changedFields"  TEXT[] NOT NULL DEFAULT '{}',
  "reason"         TEXT,
  CONSTRAINT "PayerRuleAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayerRuleAuditLog_payerRuleId_editedAt_idx"
  ON "PayerRuleAuditLog" ("payerRuleId", "editedAt");
ALTER TABLE "PayerRuleAuditLog"
  ADD CONSTRAINT "PayerRuleAuditLog_payerRuleId_fkey"
  FOREIGN KEY ("payerRuleId") REFERENCES "PayerRule" ("id")
  ON DELETE CASCADE;

-- ─── EMR-222 — NCCI / MUE reference tables ──────────────────────────────
CREATE TABLE "NcciEdit" (
  "id"                TEXT NOT NULL,
  "column1Code"       TEXT NOT NULL,
  "column2Code"       TEXT NOT NULL,
  "modifierIndicator" INTEGER NOT NULL,
  "rationale"         TEXT,
  "effectiveDate"     TIMESTAMP(3) NOT NULL,
  "deletionDate"      TIMESTAMP(3),
  "quarter"           TEXT NOT NULL,
  "loadedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NcciEdit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NcciEdit_column1Code_column2Code_quarter_key"
  ON "NcciEdit" ("column1Code", "column2Code", "quarter");
CREATE INDEX "NcciEdit_column1Code_idx" ON "NcciEdit" ("column1Code");
CREATE INDEX "NcciEdit_quarter_idx"     ON "NcciEdit" ("quarter");

CREATE TABLE "MueLimit" (
  "id"            TEXT NOT NULL,
  "hcpcsCode"     TEXT NOT NULL,
  "mueValue"      INTEGER NOT NULL,
  "adjudication"  INTEGER NOT NULL,
  "rationale"     TEXT,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "quarter"       TEXT NOT NULL,
  "loadedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MueLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MueLimit_hcpcsCode_quarter_key"
  ON "MueLimit" ("hcpcsCode", "quarter");
CREATE INDEX "MueLimit_hcpcsCode_idx" ON "MueLimit" ("hcpcsCode");
CREATE INDEX "MueLimit_quarter_idx"   ON "MueLimit" ("quarter");

CREATE TABLE "NcciMueLoadStatus" (
  "id"         TEXT NOT NULL,
  "table"      TEXT NOT NULL,
  "quarter"    TEXT NOT NULL,
  "rowCount"   INTEGER NOT NULL,
  "source"     TEXT,
  "loadedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "loadedById" TEXT,
  CONSTRAINT "NcciMueLoadStatus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NcciMueLoadStatus_table_key" ON "NcciMueLoadStatus" ("table");

-- ─── EMR-217 — Clearinghouse dead-letter queue ──────────────────────────
CREATE TABLE "ClearinghouseDeadLetter" (
  "id"              TEXT NOT NULL,
  "submissionId"    TEXT,
  "claimId"         TEXT,
  "organizationId"  TEXT NOT NULL,
  "gatewayName"     TEXT NOT NULL,
  "failureCategory" TEXT NOT NULL,
  "errorMessage"    TEXT NOT NULL,
  "requestPayload"  TEXT,
  "responseBody"    TEXT,
  "attemptCount"    INTEGER NOT NULL DEFAULT 1,
  "firstFailedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastFailedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"      TIMESTAMP(3),
  "resolvedById"    TEXT,
  "resolutionNote"  TEXT,
  CONSTRAINT "ClearinghouseDeadLetter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClearinghouseDeadLetter_organizationId_resolvedAt_idx"
  ON "ClearinghouseDeadLetter" ("organizationId", "resolvedAt");
CREATE INDEX "ClearinghouseDeadLetter_claimId_idx"
  ON "ClearinghouseDeadLetter" ("claimId");

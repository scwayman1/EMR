-- EMR-409 — Practice configuration (specialty-adaptive shell)
-- Durable configuration record every shell, workflow, and module reads at runtime.

-- ─── Enums ───────────────────────────────────────────────────────────────
CREATE TYPE "PracticeConfigurationStatus" AS ENUM ('draft', 'published', 'archived');

-- ─── Practice ────────────────────────────────────────────────────────────
CREATE TABLE "Practice" (
  "id"             TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "legalName"      TEXT NOT NULL,
  "brandName"      TEXT,
  "npi"            TEXT,
  "address"        JSONB,
  "timezone"       TEXT NOT NULL DEFAULT 'America/New_York',
  "primaryContact" JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Practice_organizationId_idx" ON "Practice" ("organizationId");

-- ─── PracticeConfiguration ───────────────────────────────────────────────
CREATE TABLE "PracticeConfiguration" (
  "id"                        TEXT PRIMARY KEY,
  "organizationId"            TEXT NOT NULL,
  "practiceId"                TEXT NOT NULL,
  "selectedSpecialty"         TEXT,
  "careModel"                 TEXT,
  "enabledModalities"         TEXT[] NOT NULL DEFAULT '{}',
  "disabledModalities"        TEXT[] NOT NULL DEFAULT '{}',
  "workflowTemplateIds"       TEXT[] NOT NULL DEFAULT '{}',
  "chartingTemplateIds"       TEXT[] NOT NULL DEFAULT '{}',
  "rolePermissionTemplateIds" TEXT[] NOT NULL DEFAULT '{}',
  "physicianShellTemplateId"  TEXT,
  "patientShellTemplateId"    TEXT,
  "migrationProfileId"        TEXT,
  "regulatoryFlags"           JSONB NOT NULL DEFAULT '{}',
  "status"                    "PracticeConfigurationStatus" NOT NULL DEFAULT 'draft',
  "version"                   INTEGER NOT NULL DEFAULT 1,
  "publishedAt"               TIMESTAMP(3),
  "publishedBy"               TEXT,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PracticeConfiguration_practiceId_status_idx" ON "PracticeConfiguration" ("practiceId", "status");
CREATE INDEX "PracticeConfiguration_organizationId_idx" ON "PracticeConfiguration" ("organizationId");

-- ─── PracticeConfigurationVersion ────────────────────────────────────────
CREATE TABLE "PracticeConfigurationVersion" (
  "id"              TEXT PRIMARY KEY,
  "configurationId" TEXT NOT NULL,
  "version"         INTEGER NOT NULL,
  "snapshot"        JSONB NOT NULL,
  "publishedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedBy"     TEXT NOT NULL
);
CREATE UNIQUE INDEX "PracticeConfigurationVersion_configurationId_version_key" ON "PracticeConfigurationVersion" ("configurationId", "version");
CREATE INDEX "PracticeConfigurationVersion_configurationId_idx" ON "PracticeConfigurationVersion" ("configurationId");

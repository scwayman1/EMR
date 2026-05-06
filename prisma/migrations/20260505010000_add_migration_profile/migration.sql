-- EMR-453 — Migration profile attached to a PracticeConfiguration.
-- The categories JSON array carries the per-domain mapping plan that the
-- migration job runner (EMR-456) executes when a practice imports records
-- from a previous EMR. Field-mapping detail lands in EMR-454; runtime
-- import execution lands in EMR-456.

-- ─── MigrationProfile ────────────────────────────────────────────────────
CREATE TABLE "MigrationProfile" (
  "id"              TEXT PRIMARY KEY,
  "configurationId" TEXT NOT NULL,
  "sourceType"      TEXT,
  "categories"      JSONB NOT NULL DEFAULT '[]',
  "status"          TEXT NOT NULL DEFAULT 'draft',
  "createdBy"       TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  "archivedAt"      TIMESTAMP(3)
);
CREATE INDEX "MigrationProfile_configurationId_idx" ON "MigrationProfile" ("configurationId");
CREATE INDEX "MigrationProfile_status_idx" ON "MigrationProfile" ("status");

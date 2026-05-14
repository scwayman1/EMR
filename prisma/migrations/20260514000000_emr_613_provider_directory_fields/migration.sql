-- EMR-613 — Provider directory search needs practiceAddress + hospital
-- affiliations to be searchable. Existing rows backfill cleanly:
-- practiceAddress is nullable, hospitalAffiliations defaults to an empty
-- array. No data migration required.

ALTER TABLE "Provider"
  ADD COLUMN "practiceAddress"      TEXT,
  ADD COLUMN "hospitalAffiliations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

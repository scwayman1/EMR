-- EMR-431 — Template versioning + immutability of published references
-- Add `selectedSpecialtyVersion` to PracticeConfiguration so a published
-- practice records the EXACT manifest version it was published against.
-- Templates can evolve in the registry without silently re-rendering existing
-- configurations; an explicit admin-gated upgrade is required to advance.
--
-- Nullable: existing rows pre-EMR-431 do not have a recorded version. The
-- publish handler populates this field from the manifest at publish time;
-- drafts created via apply-specialty may also persist it via PATCH.

ALTER TABLE "PracticeConfiguration"
  ADD COLUMN "selectedSpecialtyVersion" TEXT;

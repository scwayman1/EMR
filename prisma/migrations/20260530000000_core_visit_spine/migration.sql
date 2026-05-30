-- Add the same-day visit-spine states while preserving legacy in_progress.
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'checked_in';
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'info_incomplete';
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'rooming';
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'roomed';
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'in_visit';
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'wrap_up';
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'no_show';

ALTER TABLE "Encounter"
  ADD COLUMN IF NOT EXISTS "appointmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "roomingStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "roomedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "wrapUpAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "noShowAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Encounter_appointmentId_key"
  ON "Encounter"("appointmentId");

CREATE INDEX IF NOT EXISTS "Encounter_organizationId_status_scheduledFor_idx"
  ON "Encounter"("organizationId", "status", "scheduledFor");

ALTER TABLE "Encounter"
  ADD CONSTRAINT "Encounter_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

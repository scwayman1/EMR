-- AlterTable: add organizationId to Payment so the idempotency key can be scoped per tenant.
-- Kept nullable so existing application code that creates Payments without org context
-- continues to work; billing-ingest callers populate it to participate in idempotency.
ALTER TABLE "Payment" ADD COLUMN "organizationId" TEXT;

-- Backfill organizationId from the parent Claim for existing rows so the scoped unique
-- index can meaningfully protect historical data as well.
UPDATE "Payment" p
SET "organizationId" = c."organizationId"
FROM "Claim" c
WHERE p."claimId" = c."id"
  AND p."organizationId" IS NULL;

-- AddForeignKey
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: per-tenant uniqueness on Payment.reference.
-- Postgres treats NULLs as distinct in UNIQUE indexes, so rows missing either
-- organizationId or reference (e.g. legacy rows without an idempotency key) are
-- not blocked from co-existing. This is the desired behavior: only fully-keyed
-- (organizationId, reference) pairs are deduplicated.
CREATE UNIQUE INDEX "Payment_organizationId_reference_key" ON "Payment"("organizationId", "reference");

-- EMR-915 — persisted hash of the kiosk→phone hand-off "claim ticket".
-- Stores only the SHA-256 of the HMAC-signed token; single-use via redeemedAt.
CREATE TABLE IF NOT EXISTS "KioskHandoffToken" (
  "id"             TEXT NOT NULL,
  "patientId"      TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tokenHash"      TEXT NOT NULL,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "redeemedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KioskHandoffToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KioskHandoffToken_tokenHash_key" ON "KioskHandoffToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "KioskHandoffToken_patientId_idx" ON "KioskHandoffToken"("patientId");
CREATE INDEX IF NOT EXISTS "KioskHandoffToken_expiresAt_idx" ON "KioskHandoffToken"("expiresAt");

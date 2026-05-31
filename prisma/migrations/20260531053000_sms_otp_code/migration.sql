-- EMR-915 — one-time SMS codes for the kiosk→phone hand-off identity challenge.
-- Hash-at-rest (never plaintext); minutes-lived; `purpose`-scoped to one flow.
CREATE TABLE IF NOT EXISTS "SmsOtpCode" (
  "id"          TEXT NOT NULL,
  "patientId"   TEXT NOT NULL,
  "purpose"     TEXT NOT NULL,
  "codeHash"    TEXT NOT NULL,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "attempts"    INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "consumedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmsOtpCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SmsOtpCode_patientId_purpose_idx" ON "SmsOtpCode"("patientId", "purpose");
CREATE INDEX IF NOT EXISTS "SmsOtpCode_expiresAt_idx" ON "SmsOtpCode"("expiresAt");

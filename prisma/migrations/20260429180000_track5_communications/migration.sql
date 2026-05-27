-- Track 5 — Clinical Communications & Telehealth
-- EMR-033: Physician-to-Physician Secure Portal (ProviderMessageThread + Message + Participant)
-- EMR-034: Phone & Video icons in messaging (CallLog)
-- EMR-037: End-to-End Communications Overlay (CallLog + CallTranscript + FaxRecord)
-- EMR-143: HIPAA-compliant Zoom integration (CallLog Zoom columns)
-- EMR-146: HIPAA voicemail with transcript (Voicemail)
-- (Bonus) Outreach campaigns — practice-level SMS/email broadcasts

-- ─── Enums ───────────────────────────────────────────────────────────────
CREATE TYPE "CommChannel" AS ENUM ('phone', 'video', 'fax', 'sms');
CREATE TYPE "CallDirection" AS ENUM ('inbound', 'outbound');
CREATE TYPE "CallStatus" AS ENUM (
  'initiated', 'ringing', 'in_progress', 'completed', 'missed', 'failed', 'cancelled'
);
CREATE TYPE "TranscriptStatus" AS ENUM ('pending_review', 'approved', 'rejected');
CREATE TYPE "FaxDirection" AS ENUM ('inbound', 'outbound');
CREATE TYPE "FaxStatus" AS ENUM ('queued', 'sending', 'delivered', 'failed', 'received');
CREATE TYPE "OutreachChannel" AS ENUM ('sms', 'email');
CREATE TYPE "OutreachStatus" AS ENUM (
  'draft', 'scheduled', 'sending', 'completed', 'cancelled', 'failed'
);
CREATE TYPE "OutreachRecipientStatus" AS ENUM (
  'pending', 'sent', 'delivered', 'failed', 'unsubscribed'
);
CREATE TYPE "VoicemailStatus" AS ENUM ('new', 'listened', 'archived');

-- ─── EMR-033: Provider-to-Provider Secure Portal ─────────────────────────
CREATE TABLE "ProviderMessageThread" (
  "id"             TEXT        NOT NULL,
  "organizationId" TEXT        NOT NULL,
  "subject"        TEXT        NOT NULL,
  "patientId"      TEXT,
  "createdById"    TEXT        NOT NULL,
  "lastMessageAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderMessageThread_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProviderMessageThread_organizationId_lastMessageAt_idx"
  ON "ProviderMessageThread"("organizationId", "lastMessageAt");
CREATE INDEX "ProviderMessageThread_patientId_idx"
  ON "ProviderMessageThread"("patientId");
ALTER TABLE "ProviderMessageThread"
  ADD CONSTRAINT "ProviderMessageThread_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "ProviderMessageThread_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "ProviderMessageThread_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE NO ACTION;

CREATE TABLE "ProviderThreadParticipant" (
  "id"         TEXT        NOT NULL,
  "threadId"   TEXT        NOT NULL,
  "userId"     TEXT        NOT NULL,
  "joinedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReadAt" TIMESTAMP(3),
  CONSTRAINT "ProviderThreadParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProviderThreadParticipant_threadId_userId_key"
  ON "ProviderThreadParticipant"("threadId", "userId");
CREATE INDEX "ProviderThreadParticipant_userId_threadId_idx"
  ON "ProviderThreadParticipant"("userId", "threadId");
ALTER TABLE "ProviderThreadParticipant"
  ADD CONSTRAINT "ProviderThreadParticipant_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "ProviderMessageThread"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "ProviderThreadParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE TABLE "ProviderMessage" (
  "id"           TEXT        NOT NULL,
  "threadId"     TEXT        NOT NULL,
  "senderUserId" TEXT        NOT NULL,
  "bodyCipher"   TEXT        NOT NULL,
  "bodyLength"   INTEGER     NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProviderMessage_threadId_createdAt_idx"
  ON "ProviderMessage"("threadId", "createdAt");
ALTER TABLE "ProviderMessage"
  ADD CONSTRAINT "ProviderMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "ProviderMessageThread"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "ProviderMessage_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE NO ACTION;

-- ─── EMR-034 / EMR-037: CallLog ──────────────────────────────────────────
CREATE TABLE "CallLog" (
  "id"                       TEXT          NOT NULL,
  "organizationId"           TEXT          NOT NULL,
  "channel"                  "CommChannel" NOT NULL,
  "direction"                "CallDirection" NOT NULL,
  "status"                   "CallStatus"  NOT NULL DEFAULT 'initiated',
  "initiatorUserId"          TEXT,
  "patientId"                TEXT,
  "providerUserId"           TEXT,
  "externalNumber"           TEXT,
  "messageThreadId"          TEXT,
  "providerMessageThreadId"  TEXT,
  "startedAt"                TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt"                  TIMESTAMP(3),
  "durationSeconds"          INTEGER,
  "externalSessionId"        TEXT,
  -- EMR-143 — HIPAA-compliant Zoom integration
  "zoomMeetingId"            TEXT,
  "zoomTopic"                TEXT,
  "zoomJoinUrl"              TEXT,
  "zoomHostJoinUrl"          TEXT,
  -- Passcode is stored as an AES-256-GCM envelope (base64 of iv||tag||ct)
  -- so it is encrypted at rest. Decrypt only when surfacing to the host.
  "zoomPasscodeCipher"       TEXT,
  "zoomScheduledAt"          TIMESTAMP(3),
  "zoomDurationMinutes"      INTEGER,
  "notes"                    TEXT,
  CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CallLog_organizationId_startedAt_idx"
  ON "CallLog"("organizationId", "startedAt");
CREATE INDEX "CallLog_patientId_startedAt_idx"
  ON "CallLog"("patientId", "startedAt");
CREATE INDEX "CallLog_initiatorUserId_startedAt_idx"
  ON "CallLog"("initiatorUserId", "startedAt");
CREATE INDEX "CallLog_organizationId_zoomScheduledAt_idx"
  ON "CallLog"("organizationId", "zoomScheduledAt");
-- Postgres treats NULLs as distinct by default, so a plain UNIQUE allows
-- many rows with no Zoom meeting and still enforces uniqueness when set.
CREATE UNIQUE INDEX "CallLog_zoomMeetingId_key"
  ON "CallLog"("zoomMeetingId");
ALTER TABLE "CallLog"
  ADD CONSTRAINT "CallLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "CallLog_initiatorUserId_fkey"
    FOREIGN KEY ("initiatorUserId") REFERENCES "User"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "CallLog_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "CallLog_providerUserId_fkey"
    FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "CallLog_messageThreadId_fkey"
    FOREIGN KEY ("messageThreadId") REFERENCES "MessageThread"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "CallLog_providerMessageThreadId_fkey"
    FOREIGN KEY ("providerMessageThreadId") REFERENCES "ProviderMessageThread"("id") ON DELETE SET NULL;

-- ─── EMR-037 / EMR-146: CallTranscript review queue ──────────────────────
CREATE TABLE "CallTranscript" (
  "id"                    TEXT               NOT NULL,
  "callLogId"             TEXT               NOT NULL,
  "organizationId"        TEXT               NOT NULL,
  "pertinentSummary"      TEXT               NOT NULL,
  "clinicalBullets"       TEXT[]             NOT NULL DEFAULT ARRAY[]::TEXT[],
  "redactedCategories"    TEXT[]             NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"                "TranscriptStatus" NOT NULL DEFAULT 'pending_review',
  "reviewedByUserId"      TEXT,
  "reviewedAt"            TIMESTAMP(3),
  "reviewerNote"          TEXT,
  "attachedToEncounterId" TEXT,
  "createdAt"             TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CallTranscript_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CallTranscript_callLogId_key" ON "CallTranscript"("callLogId");
CREATE INDEX "CallTranscript_organizationId_status_createdAt_idx"
  ON "CallTranscript"("organizationId", "status", "createdAt");
ALTER TABLE "CallTranscript"
  ADD CONSTRAINT "CallTranscript_callLogId_fkey"
    FOREIGN KEY ("callLogId") REFERENCES "CallLog"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "CallTranscript_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "CallTranscript_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL;

-- ─── EMR-037: FaxRecord ──────────────────────────────────────────────────
CREATE TABLE "FaxRecord" (
  "id"                 TEXT           NOT NULL,
  "organizationId"     TEXT           NOT NULL,
  "direction"          "FaxDirection" NOT NULL,
  "status"             "FaxStatus"    NOT NULL DEFAULT 'queued',
  "fromNumber"         TEXT           NOT NULL,
  "toNumber"           TEXT           NOT NULL,
  "pageCount"          INTEGER,
  "documentStorageKey" TEXT,
  "patientId"          TEXT,
  "initiatorUserId"    TEXT,
  "externalRef"        TEXT,
  "errorMessage"       TEXT,
  "createdAt"          TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"        TIMESTAMP(3),
  CONSTRAINT "FaxRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FaxRecord_organizationId_createdAt_idx"
  ON "FaxRecord"("organizationId", "createdAt");
CREATE INDEX "FaxRecord_patientId_createdAt_idx"
  ON "FaxRecord"("patientId", "createdAt");
ALTER TABLE "FaxRecord"
  ADD CONSTRAINT "FaxRecord_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "FaxRecord_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "FaxRecord_initiatorUserId_fkey"
    FOREIGN KEY ("initiatorUserId") REFERENCES "User"("id") ON DELETE SET NULL;

-- ─── EMR-143: OutreachCampaign + OutreachRecipient ───────────────────────
CREATE TABLE "OutreachCampaign" (
  "id"             TEXT              NOT NULL,
  "organizationId" TEXT              NOT NULL,
  "name"           TEXT              NOT NULL,
  "channel"        "OutreachChannel" NOT NULL,
  "bodyTemplate"   TEXT              NOT NULL,
  "audienceFilter" JSONB,
  "status"         "OutreachStatus"  NOT NULL DEFAULT 'draft',
  "scheduledFor"   TIMESTAMP(3),
  "createdById"    TEXT              NOT NULL,
  "createdAt"      TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt"      TIMESTAMP(3),
  "completedAt"    TIMESTAMP(3),
  CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutreachCampaign_organizationId_status_createdAt_idx"
  ON "OutreachCampaign"("organizationId", "status", "createdAt");
ALTER TABLE "OutreachCampaign"
  ADD CONSTRAINT "OutreachCampaign_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "OutreachCampaign_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE NO ACTION;

CREATE TABLE "OutreachRecipient" (
  "id"           TEXT                      NOT NULL,
  "campaignId"   TEXT                      NOT NULL,
  "patientId"    TEXT                      NOT NULL,
  "status"       "OutreachRecipientStatus" NOT NULL DEFAULT 'pending',
  "sentAt"       TIMESTAMP(3),
  "deliveredAt"  TIMESTAMP(3),
  "errorMessage" TEXT,
  CONSTRAINT "OutreachRecipient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OutreachRecipient_campaignId_patientId_key"
  ON "OutreachRecipient"("campaignId", "patientId");
CREATE INDEX "OutreachRecipient_campaignId_status_idx"
  ON "OutreachRecipient"("campaignId", "status");
ALTER TABLE "OutreachRecipient"
  ADD CONSTRAINT "OutreachRecipient_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "OutreachRecipient_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE;

-- ─── EMR-146: HIPAA voicemail with transcript ───────────────────────────
-- Each row pairs an inbound CallLog (channel='phone', status='missed') with
-- a recording reference and a redacted transcript. Raw transcripts are
-- stored ciphered; only the redacted summary + clinical bullets are kept
-- in plaintext for clinician review (mirrors the CallTranscript pattern).
CREATE TABLE "Voicemail" (
  "id"                   TEXT              NOT NULL,
  "callLogId"            TEXT              NOT NULL,
  "organizationId"       TEXT              NOT NULL,
  "fromNumber"           TEXT              NOT NULL,
  "patientId"            TEXT,
  "audioStorageKey"      TEXT,
  "durationSeconds"      INTEGER,
  -- AES-256-GCM envelope of the raw transcript text — never plaintext.
  "rawTranscriptCipher"  TEXT,
  "pertinentSummary"     TEXT              NOT NULL DEFAULT '',
  "clinicalBullets"      TEXT[]            NOT NULL DEFAULT ARRAY[]::TEXT[],
  "redactedCategories"   TEXT[]            NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"               "VoicemailStatus" NOT NULL DEFAULT 'new',
  "assignedToUserId"     TEXT,
  "listenedByUserId"     TEXT,
  "listenedAt"           TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Voicemail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Voicemail_callLogId_key" ON "Voicemail"("callLogId");
CREATE INDEX "Voicemail_organizationId_status_createdAt_idx"
  ON "Voicemail"("organizationId", "status", "createdAt");
CREATE INDEX "Voicemail_assignedToUserId_status_idx"
  ON "Voicemail"("assignedToUserId", "status");
CREATE INDEX "Voicemail_patientId_createdAt_idx"
  ON "Voicemail"("patientId", "createdAt");
ALTER TABLE "Voicemail"
  ADD CONSTRAINT "Voicemail_callLogId_fkey"
    FOREIGN KEY ("callLogId") REFERENCES "CallLog"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "Voicemail_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "Voicemail_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "Voicemail_assignedToUserId_fkey"
    FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "Voicemail_listenedByUserId_fkey"
    FOREIGN KEY ("listenedByUserId") REFERENCES "User"("id") ON DELETE SET NULL;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'practice_admin';
ALTER TYPE "Role" ADD VALUE 'implementation_admin';
ALTER TYPE "Role" ADD VALUE 'super_admin';

-- DropForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_initiatorUserId_fkey";

-- DropForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_messageThreadId_fkey";

-- DropForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_patientId_fkey";

-- DropForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_providerMessageThreadId_fkey";

-- DropForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_providerUserId_fkey";

-- DropForeignKey
ALTER TABLE "CallTranscript" DROP CONSTRAINT "CallTranscript_callLogId_fkey";

-- DropForeignKey
ALTER TABLE "CallTranscript" DROP CONSTRAINT "CallTranscript_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "CallTranscript" DROP CONSTRAINT "CallTranscript_reviewedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "Dispensary" DROP CONSTRAINT "Dispensary_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "DispensaryReimbursement" DROP CONSTRAINT "DispensaryReimbursement_dispensaryId_fkey";

-- DropForeignKey
ALTER TABLE "DispensaryReimbursement" DROP CONSTRAINT "DispensaryReimbursement_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "DispensaryReimbursement" DROP CONSTRAINT "DispensaryReimbursement_patientId_fkey";

-- DropForeignKey
ALTER TABLE "DispensarySku" DROP CONSTRAINT "DispensarySku_dispensaryId_fkey";

-- DropForeignKey
ALTER TABLE "DispensarySku" DROP CONSTRAINT "DispensarySku_strainId_fkey";

-- DropForeignKey
ALTER TABLE "FaxRecord" DROP CONSTRAINT "FaxRecord_initiatorUserId_fkey";

-- DropForeignKey
ALTER TABLE "FaxRecord" DROP CONSTRAINT "FaxRecord_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "FaxRecord" DROP CONSTRAINT "FaxRecord_patientId_fkey";

-- DropForeignKey
ALTER TABLE "OutreachCampaign" DROP CONSTRAINT "OutreachCampaign_createdById_fkey";

-- DropForeignKey
ALTER TABLE "OutreachCampaign" DROP CONSTRAINT "OutreachCampaign_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OutreachRecipient" DROP CONSTRAINT "OutreachRecipient_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "OutreachRecipient" DROP CONSTRAINT "OutreachRecipient_patientId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderMessage" DROP CONSTRAINT "ProviderMessage_senderUserId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderMessage" DROP CONSTRAINT "ProviderMessage_threadId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderMessageThread" DROP CONSTRAINT "ProviderMessageThread_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ProviderMessageThread" DROP CONSTRAINT "ProviderMessageThread_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderMessageThread" DROP CONSTRAINT "ProviderMessageThread_patientId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderThreadParticipant" DROP CONSTRAINT "ProviderThreadParticipant_threadId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderThreadParticipant" DROP CONSTRAINT "ProviderThreadParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "SupplyProduct" DROP CONSTRAINT "SupplyProduct_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Voicemail" DROP CONSTRAINT "Voicemail_assignedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "Voicemail" DROP CONSTRAINT "Voicemail_callLogId_fkey";

-- DropForeignKey
ALTER TABLE "Voicemail" DROP CONSTRAINT "Voicemail_listenedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "Voicemail" DROP CONSTRAINT "Voicemail_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Voicemail" DROP CONSTRAINT "Voicemail_patientId_fkey";

-- AlterTable
ALTER TABLE "ControllerAuditLog" ALTER COLUMN "actorRoles" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "npi" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "primaryContactEmail" TEXT,
ADD COLUMN     "primaryContactName" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "timeZone" TEXT;

-- AlterTable
ALTER TABLE "Practice" DROP COLUMN "address",
DROP COLUMN "brandName",
DROP COLUMN "legalName",
DROP COLUMN "primaryContact",
DROP COLUMN "timezone",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "specialtyHint" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "timeZone" TEXT;

-- CreateIndex
CREATE INDEX "Practice_name_idx" ON "Practice"("name");

-- AddForeignKey
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMessageThread" ADD CONSTRAINT "ProviderMessageThread_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMessageThread" ADD CONSTRAINT "ProviderMessageThread_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMessageThread" ADD CONSTRAINT "ProviderMessageThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderThreadParticipant" ADD CONSTRAINT "ProviderThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ProviderMessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderThreadParticipant" ADD CONSTRAINT "ProviderThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMessage" ADD CONSTRAINT "ProviderMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ProviderMessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMessage" ADD CONSTRAINT "ProviderMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_initiatorUserId_fkey" FOREIGN KEY ("initiatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "MessageThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_providerMessageThreadId_fkey" FOREIGN KEY ("providerMessageThreadId") REFERENCES "ProviderMessageThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTranscript" ADD CONSTRAINT "CallTranscript_callLogId_fkey" FOREIGN KEY ("callLogId") REFERENCES "CallLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTranscript" ADD CONSTRAINT "CallTranscript_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTranscript" ADD CONSTRAINT "CallTranscript_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaxRecord" ADD CONSTRAINT "FaxRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaxRecord" ADD CONSTRAINT "FaxRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaxRecord" ADD CONSTRAINT "FaxRecord_initiatorUserId_fkey" FOREIGN KEY ("initiatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachCampaign" ADD CONSTRAINT "OutreachCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachCampaign" ADD CONSTRAINT "OutreachCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachRecipient" ADD CONSTRAINT "OutreachRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachRecipient" ADD CONSTRAINT "OutreachRecipient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voicemail" ADD CONSTRAINT "Voicemail_callLogId_fkey" FOREIGN KEY ("callLogId") REFERENCES "CallLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voicemail" ADD CONSTRAINT "Voicemail_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voicemail" ADD CONSTRAINT "Voicemail_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voicemail" ADD CONSTRAINT "Voicemail_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voicemail" ADD CONSTRAINT "Voicemail_listenedByUserId_fkey" FOREIGN KEY ("listenedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispensary" ADD CONSTRAINT "Dispensary_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensarySku" ADD CONSTRAINT "DispensarySku_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "Dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensarySku" ADD CONSTRAINT "DispensarySku_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "Strain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyProduct" ADD CONSTRAINT "SupplyProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensaryReimbursement" ADD CONSTRAINT "DispensaryReimbursement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensaryReimbursement" ADD CONSTRAINT "DispensaryReimbursement_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "Dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensaryReimbursement" ADD CONSTRAINT "DispensaryReimbursement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;


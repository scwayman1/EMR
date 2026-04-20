-- CreateEnum
CREATE TYPE "VoiceEnrollmentStatus" AS ENUM ('pending', 'enrolled', 'failed');

-- CreateTable
CREATE TABLE "VoiceEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "VoiceEnrollmentStatus" NOT NULL DEFAULT 'pending',
    "sampleAudioUrl" TEXT,
    "embeddingRef" TEXT,
    "enrolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceEnrollment_organizationId_status_idx" ON "VoiceEnrollment"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceEnrollment_userId_organizationId_key" ON "VoiceEnrollment"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "VoiceEnrollment" ADD CONSTRAINT "VoiceEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceEnrollment" ADD CONSTRAINT "VoiceEnrollment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "StreakActivityKind" AS ENUM ('dose_log', 'emoji_checkin', 'weekly_outcome');

-- CreateTable
CREATE TABLE "StreakRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "activityKind" "StreakActivityKind" NOT NULL,
    "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
    "longestStreakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreakRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreakRecord_patientId_activityKind_key" ON "StreakRecord"("patientId", "activityKind");

-- CreateIndex
CREATE INDEX "StreakRecord_patientId_idx" ON "StreakRecord"("patientId");

-- AddForeignKey
ALTER TABLE "StreakRecord" ADD CONSTRAINT "StreakRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

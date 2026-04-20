-- CreateEnum
CREATE TYPE "TreatmentGoalMetric" AS ENUM ('pain_reduction', 'sleep_hours', 'anxiety_reduction', 'mood_improvement', 'custom');

-- CreateTable
CREATE TABLE "TreatmentGoal" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetMetric" "TreatmentGoalMetric" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByClinicianId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreatmentGoal_patientId_startedAt_idx" ON "TreatmentGoal"("patientId", "startedAt");

-- CreateIndex
CREATE INDEX "TreatmentGoal_organizationId_idx" ON "TreatmentGoal"("organizationId");

-- CreateIndex
CREATE INDEX "TreatmentGoal_targetMetric_idx" ON "TreatmentGoal"("targetMetric");

-- AddForeignKey
ALTER TABLE "TreatmentGoal" ADD CONSTRAINT "TreatmentGoal_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentGoal" ADD CONSTRAINT "TreatmentGoal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentGoal" ADD CONSTRAINT "TreatmentGoal_createdByClinicianId_fkey" FOREIGN KEY ("createdByClinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

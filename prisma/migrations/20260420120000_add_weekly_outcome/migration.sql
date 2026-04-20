-- CreateTable
CREATE TABLE "WeeklyOutcome" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "painScore" INTEGER NOT NULL,
    "sleepScore" INTEGER NOT NULL,
    "anxietyScore" INTEGER NOT NULL,
    "moodScore" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyOutcome_organizationId_weekStartDate_idx" ON "WeeklyOutcome"("organizationId", "weekStartDate");

-- CreateIndex
CREATE INDEX "WeeklyOutcome_patientId_weekStartDate_idx" ON "WeeklyOutcome"("patientId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyOutcome_patientId_weekStartDate_key" ON "WeeklyOutcome"("patientId", "weekStartDate");

-- AddForeignKey
ALTER TABLE "WeeklyOutcome" ADD CONSTRAINT "WeeklyOutcome_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyOutcome" ADD CONSTRAINT "WeeklyOutcome_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SideEffectCode" AS ENUM (
  'dry_mouth',
  'drowsiness',
  'dizziness',
  'anxiety',
  'headache',
  'nausea',
  'red_eyes',
  'memory_fog',
  'increased_appetite',
  'other'
);

-- CreateTable
CREATE TABLE "SideEffectReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "effect" "SideEffectCode" NOT NULL,
    "customEffect" TEXT,
    "severity" INTEGER NOT NULL,
    "note" TEXT,
    "productId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SideEffectReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SideEffectReport_patientId_occurredAt_idx" ON "SideEffectReport"("patientId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "SideEffectReport_organizationId_occurredAt_idx" ON "SideEffectReport"("organizationId", "occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "SideEffectReport" ADD CONSTRAINT "SideEffectReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideEffectReport" ADD CONSTRAINT "SideEffectReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideEffectReport" ADD CONSTRAINT "SideEffectReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CannabisProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

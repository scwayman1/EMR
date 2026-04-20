-- CreateEnum
CREATE TYPE "ProductOutcomeFeeling" AS ENUM ('great', 'good', 'ok', 'bad', 'awful');

-- CreateTable
CREATE TABLE "ProductOutcome" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "feeling" "ProductOutcomeFeeling" NOT NULL,
    "effectivenessScore" INTEGER NOT NULL,
    "sideEffects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductOutcome_patientId_productId_loggedAt_idx" ON "ProductOutcome"("patientId", "productId", "loggedAt" DESC);

-- CreateIndex
CREATE INDEX "ProductOutcome_organizationId_loggedAt_idx" ON "ProductOutcome"("organizationId", "loggedAt" DESC);

-- AddForeignKey
ALTER TABLE "ProductOutcome" ADD CONSTRAINT "ProductOutcome_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOutcome" ADD CONSTRAINT "ProductOutcome_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EMR-238: Outcome Event Recorder Service.
-- Durable log of patient/product interactions that the future ranking
-- engine (EMR-230) reads. No FKs — events are append-only and may
-- outlive the entities they reference (a deleted patient still has
-- de-identifiable outcome data via patientId; the ranking engine
-- joins on its own when it queries).

-- CreateEnum
CREATE TYPE "MarketplaceEventType" AS ENUM ('purchase', 'regimen_start', 'regimen_end', 'pro_submission', 'adverse_event', 'refund', 'return_initiated');

-- CreateTable
CREATE TABLE "MarketplaceEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT,
    "productId" TEXT,
    "lotId" TEXT,
    "vendorId" TEXT,
    "eventType" "MarketplaceEventType" NOT NULL,
    "outcomeScores" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceEvent_organizationId_eventType_createdAt_idx" ON "MarketplaceEvent"("organizationId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceEvent_productId_createdAt_idx" ON "MarketplaceEvent"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceEvent_patientId_createdAt_idx" ON "MarketplaceEvent"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceEvent_vendorId_createdAt_idx" ON "MarketplaceEvent"("vendorId", "createdAt");

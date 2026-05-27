-- EMR-242: COA expiration tracking + product link.
-- VendorDocument gains expiresAt (when the COA stops being valid)
-- and publicUrl (buyer-facing URL — COAs are publicly readable, not
-- secret like W-9s). Product gains coaDocumentId so multiple products
-- can share one COA per batch.

-- AlterTable
ALTER TABLE "VendorDocument" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "VendorDocument" ADD COLUMN "publicUrl" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "coaDocumentId" TEXT;

-- CreateIndex (covers the cron's "find COAs expiring in N days" query)
CREATE INDEX "VendorDocument_documentType_expiresAt_idx" ON "VendorDocument"("documentType", "expiresAt");

-- CreateIndex (covers the auto-delist sweep that walks products by COA)
CREATE INDEX "Product_coaDocumentId_idx" ON "Product"("coaDocumentId");

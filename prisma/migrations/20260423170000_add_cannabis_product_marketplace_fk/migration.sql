-- AlterTable
ALTER TABLE "CannabisProduct" ADD COLUMN "marketplaceProductId" TEXT;

-- CreateIndex
CREATE INDEX "CannabisProduct_marketplaceProductId_idx" ON "CannabisProduct"("marketplaceProductId");

-- AddForeignKey
ALTER TABLE "CannabisProduct" ADD CONSTRAINT "CannabisProduct_marketplaceProductId_fkey" FOREIGN KEY ("marketplaceProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

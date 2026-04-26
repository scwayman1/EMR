-- AlterTable: add Leafmart storefront display + outcome columns to Product.
-- All columns are nullable so existing rows remain valid; the UI mapper
-- (src/lib/leafmart/products.ts) falls back to derived defaults when null.
ALTER TABLE "Product" ADD COLUMN "bgColor" TEXT;
ALTER TABLE "Product" ADD COLUMN "deepColor" TEXT;
ALTER TABLE "Product" ADD COLUMN "displayShape" TEXT;
ALTER TABLE "Product" ADD COLUMN "doseLabel" TEXT;
ALTER TABLE "Product" ADD COLUMN "outcomePct" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "outcomeSampleSize" INTEGER;

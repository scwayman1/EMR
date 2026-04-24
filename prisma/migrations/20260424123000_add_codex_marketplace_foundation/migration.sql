-- EMR-233 / EMR-245 follow-up: ships the schema additions introduced in
-- PR #82 (codex) that didn't come with a migration file. Adds Vendor +
-- VendorDocument tables, VendorType / VendorStatus / VendorDocumentType /
-- VendorDocumentStatus enums, Patient.ageVerifiedAt, and Product.requires21Plus.

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('hemp_brand', 'licensed_dispensary');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('pending', 'active', 'suspended', 'offboarded');

-- CreateEnum
CREATE TYPE "VendorDocumentType" AS ENUM ('insurance', 'w9', 'coa');

-- CreateEnum
CREATE TYPE "VendorDocumentStatus" AS ENUM ('missing', 'submitted', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "ageVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "requires21Plus" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendorType" "VendorType" NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productLines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "takeRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "foundingPartnerFlag" BOOLEAN NOT NULL DEFAULT false,
    "foundingPartnerExpiresAt" TIMESTAMP(3),
    "payoutSchedule" TEXT NOT NULL DEFAULT 'weekly',
    "reservePct" DOUBLE PRECISION DEFAULT 0.10,
    "reserveDays" INTEGER DEFAULT 14,
    "status" "VendorStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "documentType" "VendorDocumentType" NOT NULL,
    "fileUrl" TEXT,
    "status" "VendorDocumentStatus" NOT NULL DEFAULT 'missing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_status_idx" ON "Vendor"("organizationId", "status");

-- CreateIndex
CREATE INDEX "VendorDocument_organizationId_status_idx" ON "VendorDocument"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorDocument_vendorId_documentType_key" ON "VendorDocument"("vendorId", "documentType");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

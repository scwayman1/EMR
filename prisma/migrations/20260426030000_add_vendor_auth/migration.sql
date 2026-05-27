-- EMR-249: vendor portal auth realm.
-- Distinct table from User so a vendor session cannot authenticate to
-- clinical routes. Different cookie name AND different DB lookup.

-- CreateEnum
CREATE TYPE "VendorPortalRole" AS ENUM ('owner', 'catalog_manager', 'fulfillment', 'finance');

-- CreateEnum
CREATE TYPE "VendorUserStatus" AS ENUM ('invited', 'active', 'suspended');

-- CreateTable
CREATE TABLE "VendorUser" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "VendorPortalRole" NOT NULL,
    "status" "VendorUserStatus" NOT NULL DEFAULT 'invited',
    "totpSecret" TEXT,
    "totpEnabledAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSession" (
    "id" TEXT NOT NULL,
    "vendorUserId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorUser_vendorId_email_key" ON "VendorUser"("vendorId", "email");

-- CreateIndex
CREATE INDEX "VendorUser_email_idx" ON "VendorUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSession_sessionTokenHash_key" ON "VendorSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "VendorSession_expiresAt_idx" ON "VendorSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "VendorUser" ADD CONSTRAINT "VendorUser_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSession" ADD CONSTRAINT "VendorSession_vendorUserId_fkey" FOREIGN KEY ("vendorUserId") REFERENCES "VendorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

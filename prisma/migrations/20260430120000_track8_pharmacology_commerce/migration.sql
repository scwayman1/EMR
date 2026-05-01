-- Track 8 — Pharmacology & Commerce
-- EMR-002: Dispensary integration + SKU sync
-- EMR-007: AI supply store catalog
-- EMR-017: Dispensary locator (geo data on Dispensary)
-- EMR-018: Strain reference catalog (Leafly-style)
-- EMR-039: Affiliate partner registry
-- EMR-145: Cannabis dispensary billing + $500 reimbursement records
-- EMR-151: Symptom/diagnosis supplement combo wheel data

-- ─── Enums ───────────────────────────────────────────────────────────────
CREATE TYPE "DispensaryFormatDb" AS ENUM (
  'flower', 'preroll', 'vape', 'concentrate', 'edible',
  'tincture', 'topical', 'capsule', 'beverage', 'other'
);
CREATE TYPE "DispensaryStatus" AS ENUM ('active', 'pending', 'inactive');
CREATE TYPE "StrainClassification" AS ENUM ('indica', 'sativa', 'hybrid', 'cbd', 'na');
CREATE TYPE "AffiliatePartnerStatus" AS ENUM ('active', 'paused', 'archived');
CREATE TYPE "SupplyProductCategory" AS ENUM (
  'cough_cold', 'sleep', 'pain', 'digestive', 'vitamins_supplements',
  'dme', 'topical', 'oral_care', 'mental_health', 'womens_health', 'general_wellness'
);
CREATE TYPE "DispensaryReimbursementStatus" AS ENUM (
  'draft', 'submitted', 'approved', 'paid', 'denied'
);
CREATE TYPE "SupplementCompoundEvidence" AS ENUM ('strong', 'moderate', 'emerging');

-- ─── EMR-018 — Strain reference catalog ─────────────────────────────────
CREATE TABLE "Strain" (
  "id"              TEXT PRIMARY KEY,
  "slug"            TEXT NOT NULL UNIQUE,
  "name"            TEXT NOT NULL,
  "classification"  "StrainClassification" NOT NULL,
  "thcPercent"      DOUBLE PRECISION,
  "cbdPercent"      DOUBLE PRECISION,
  "cbgPercent"      DOUBLE PRECISION,
  "cbnPercent"      DOUBLE PRECISION,
  "dominantTerpene" TEXT,
  "terpeneProfile"  JSONB,
  "symptoms"        TEXT[] NOT NULL DEFAULT '{}',
  "effects"         TEXT[] NOT NULL DEFAULT '{}',
  "flavors"         TEXT[] NOT NULL DEFAULT '{}',
  "description"    TEXT,
  "origin"         TEXT,
  "parentStrains"  TEXT[] NOT NULL DEFAULT '{}',
  "leaflyId"       TEXT,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Strain_classification_active_idx" ON "Strain" ("classification", "active");
CREATE INDEX "Strain_leaflyId_idx" ON "Strain" ("leaflyId");

-- ─── EMR-002 / EMR-017 — Dispensary + SKU ───────────────────────────────
CREATE TABLE "Dispensary" (
  "id"             TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "vendorId"       TEXT UNIQUE,
  "name"           TEXT NOT NULL,
  "slug"           TEXT NOT NULL UNIQUE,
  "licenseNumber"  TEXT,
  "licenseState"   TEXT NOT NULL,
  "status"         "DispensaryStatus" NOT NULL DEFAULT 'active',
  "addressLine1"   TEXT NOT NULL,
  "addressLine2"   TEXT,
  "city"           TEXT NOT NULL,
  "state"          TEXT NOT NULL,
  "postalCode"     TEXT NOT NULL,
  "latitude"       DOUBLE PRECISION NOT NULL,
  "longitude"      DOUBLE PRECISION NOT NULL,
  "phone"          TEXT,
  "websiteUrl"     TEXT,
  "hoursLine"      TEXT,
  "lastSyncedAt"   TIMESTAMP(3),
  "syncSource"     TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispensary_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization" ("id") ON DELETE CASCADE
);
CREATE INDEX "Dispensary_organizationId_status_idx" ON "Dispensary" ("organizationId", "status");
CREATE INDEX "Dispensary_licenseState_idx" ON "Dispensary" ("licenseState");

CREATE TABLE "DispensarySku" (
  "id"             TEXT PRIMARY KEY,
  "dispensaryId"   TEXT NOT NULL,
  "sku"            TEXT NOT NULL,
  "upc"            TEXT,
  "name"           TEXT NOT NULL,
  "brand"          TEXT,
  "format"         "DispensaryFormatDb" NOT NULL,
  "strainType"     "StrainClassification" NOT NULL DEFAULT 'na',
  "strainId"       TEXT,
  "thcMgPerUnit"   DOUBLE PRECISION,
  "cbdMgPerUnit"   DOUBLE PRECISION,
  "thcPercent"     DOUBLE PRECISION,
  "cbdPercent"     DOUBLE PRECISION,
  "packSize"       TEXT,
  "priceCents"     INTEGER NOT NULL,
  "inStock"        BOOLEAN NOT NULL DEFAULT TRUE,
  "inventoryCount" INTEGER,
  "imageUrl"       TEXT,
  "coaUrl"         TEXT,
  "description"    TEXT,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DispensarySku_dispensaryId_fkey" FOREIGN KEY ("dispensaryId")
    REFERENCES "Dispensary" ("id") ON DELETE CASCADE,
  CONSTRAINT "DispensarySku_strainId_fkey" FOREIGN KEY ("strainId")
    REFERENCES "Strain" ("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "DispensarySku_dispensaryId_sku_key" ON "DispensarySku" ("dispensaryId", "sku");
CREATE INDEX "DispensarySku_dispensaryId_active_inStock_idx"
  ON "DispensarySku" ("dispensaryId", "active", "inStock");
CREATE INDEX "DispensarySku_format_idx" ON "DispensarySku" ("format");
CREATE INDEX "DispensarySku_strainId_idx" ON "DispensarySku" ("strainId");

-- ─── EMR-007 — Supply Store catalog ─────────────────────────────────────
CREATE TABLE "SupplyProduct" (
  "id"                TEXT PRIMARY KEY,
  "organizationId"    TEXT NOT NULL,
  "slug"              TEXT NOT NULL UNIQUE,
  "name"              TEXT NOT NULL,
  "brand"             TEXT,
  "category"          "SupplyProductCategory" NOT NULL,
  "description"       TEXT NOT NULL,
  "shortDescription"  TEXT,
  "imageUrl"          TEXT,
  "priceCents"        INTEGER NOT NULL,
  "symptoms"          TEXT[] NOT NULL DEFAULT '{}',
  "conditions"        TEXT[] NOT NULL DEFAULT '{}',
  "contraindications" TEXT[] NOT NULL DEFAULT '{}',
  "isOTC"             BOOLEAN NOT NULL DEFAULT TRUE,
  "requiresRx"        BOOLEAN NOT NULL DEFAULT FALSE,
  "fsaEligible"       BOOLEAN NOT NULL DEFAULT FALSE,
  "externalUrl"       TEXT,
  "externalPartner"   TEXT,
  "active"            BOOLEAN NOT NULL DEFAULT TRUE,
  "featured"          BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplyProduct_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization" ("id") ON DELETE CASCADE
);
CREATE INDEX "SupplyProduct_organizationId_active_idx" ON "SupplyProduct" ("organizationId", "active");
CREATE INDEX "SupplyProduct_category_active_idx" ON "SupplyProduct" ("category", "active");

-- ─── EMR-039 — Affiliate partner registry ───────────────────────────────
CREATE TABLE "AffiliatePartner" (
  "id"                TEXT PRIMARY KEY,
  "slug"              TEXT NOT NULL UNIQUE,
  "name"              TEXT NOT NULL,
  "domain"            TEXT NOT NULL,
  "websiteUrl"        TEXT NOT NULL,
  "description"       TEXT NOT NULL,
  "category"          TEXT NOT NULL,
  "logoUrl"           TEXT,
  "status"            "AffiliatePartnerStatus" NOT NULL DEFAULT 'active',
  "disclaimerText"    TEXT,
  "jointDecisionNote" TEXT,
  "utmSource"         TEXT,
  "sortOrder"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AffiliatePartner_status_sortOrder_idx" ON "AffiliatePartner" ("status", "sortOrder");

-- ─── EMR-145 — Dispensary reimbursement records ─────────────────────────
CREATE TABLE "DispensaryReimbursement" (
  "id"                   TEXT PRIMARY KEY,
  "organizationId"       TEXT NOT NULL,
  "dispensaryId"         TEXT NOT NULL,
  "patientId"            TEXT NOT NULL,
  "serviceMonth"         TIMESTAMP(3) NOT NULL,
  "documentedSpendCents" INTEGER NOT NULL,
  "reimbursableCents"    INTEGER NOT NULL,
  "capCents"             INTEGER NOT NULL DEFAULT 50000,
  "notes"                TEXT,
  "status"               "DispensaryReimbursementStatus" NOT NULL DEFAULT 'draft',
  "submittedAt"          TIMESTAMP(3),
  "paidAt"               TIMESTAMP(3),
  "paymentReference"     TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DispensaryReimbursement_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization" ("id") ON DELETE CASCADE,
  CONSTRAINT "DispensaryReimbursement_dispensaryId_fkey" FOREIGN KEY ("dispensaryId")
    REFERENCES "Dispensary" ("id") ON DELETE CASCADE,
  CONSTRAINT "DispensaryReimbursement_patientId_fkey" FOREIGN KEY ("patientId")
    REFERENCES "Patient" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "DispensaryReimbursement_patientId_serviceMonth_key"
  ON "DispensaryReimbursement" ("patientId", "serviceMonth");
CREATE INDEX "DispensaryReimbursement_organizationId_status_idx"
  ON "DispensaryReimbursement" ("organizationId", "status");
CREATE INDEX "DispensaryReimbursement_dispensaryId_serviceMonth_idx"
  ON "DispensaryReimbursement" ("dispensaryId", "serviceMonth");

-- ─── EMR-151 — Supplement compound catalog ──────────────────────────────
CREATE TABLE "SupplementCompound" (
  "id"                  TEXT PRIMARY KEY,
  "name"                TEXT NOT NULL,
  "category"            TEXT NOT NULL,
  "color"               TEXT NOT NULL,
  "evidence"            "SupplementCompoundEvidence" NOT NULL,
  "description"         TEXT NOT NULL,
  "symptoms"            TEXT[] NOT NULL,
  "benefits"            TEXT[] NOT NULL,
  "risks"               TEXT[] NOT NULL,
  "cannabisInteraction" TEXT,
  "sortOrder"           INTEGER NOT NULL DEFAULT 0,
  "active"              BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL
);
CREATE INDEX "SupplementCompound_category_active_sortOrder_idx"
  ON "SupplementCompound" ("category", "active", "sortOrder");

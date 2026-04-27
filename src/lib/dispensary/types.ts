// EMR-002 — Dispensary integration types.
//
// Dispensaries are a specialized Vendor (Vendor.vendorType = "licensed_dispensary").
// SKUs are ProductVariants belonging to a dispensary's products. This module
// defines the ingestion contract — what a dispensary's POS or inventory
// system sends us when syncing their catalog.

export type DispensaryFormat =
  | "flower"
  | "preroll"
  | "vape"
  | "concentrate"
  | "edible"
  | "tincture"
  | "topical"
  | "capsule"
  | "beverage"
  | "other";

export interface DispensaryGeo {
  lat: number;
  lng: number;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
  hoursLine?: string;
  websiteUrl?: string;
}

export interface DispensarySkuPayload {
  sku: string;
  upc?: string;
  name: string;
  brand?: string;
  format: DispensaryFormat;
  strainType?: "indica" | "sativa" | "hybrid" | "n/a";
  thcMgPerUnit?: number;
  cbdMgPerUnit?: number;
  thcPercent?: number;
  cbdPercent?: number;
  packSize?: string;
  priceCents: number;
  inStock: boolean;
  inventoryCount?: number;
  imageUrl?: string;
  coaUrl?: string;
  description?: string;
}

export interface DispensaryIngestRequest {
  dispensaryId: string;
  syncedAt: string;
  skus: DispensarySkuPayload[];
}

export interface DispensaryIngestSummary {
  dispensaryId: string;
  syncedAt: string;
  received: number;
  created: number;
  updated: number;
  delisted: number;
  errors: { sku: string; reason: string }[];
}

export interface NearbyDispensaryRow {
  id: string;
  slug: string;
  name: string;
  geo: DispensaryGeo;
  distanceMiles: number;
  skuCount: number;
}

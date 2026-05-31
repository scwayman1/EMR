// EMR-002 — Dispensary Integration & Product SKU Scanning.
//
// Ingests dispensary product catalogs (SKU-level), finds products within a
// geographic radius of the patient, and recommends the SKUs that best match a
// patient's prescribed cannabinoid regimen. Pure, deterministic logic backed
// by a mock catalog so it runs without a live POS connection.

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DispensaryLocation extends GeoPoint {
  id: string;
  name: string;
  address: string;
}

export interface ProductSKU {
  id: string;
  name: string;
  dispensaryId: string;
  /** mg per unit, keyed by cannabinoid (THC, CBD, CBN, …). */
  cannabinoidProfile: Record<string, number>;
  inStock: boolean;
  price: number;
}

/** A patient's prescribed regimen target, used to rank SKUs. */
export interface RegimenTarget {
  /** Target mg per dose, keyed by cannabinoid. */
  cannabinoids: Record<string, number>;
}

export interface SkuRecommendation {
  sku: ProductSKU;
  dispensary: DispensaryLocation;
  distanceMiles: number;
  /** 0–100 fit score against the regimen target. */
  matchScore: number;
}

// ── Geo ──────────────────────────────────────────────────────────────────

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance between two points, in miles. */
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_DISPENSARIES: DispensaryLocation[] = [
  { id: "disp-1", name: "Green Cross — Irvine", address: "2600 Main St, Irvine, CA", lat: 33.6846, lng: -117.8265 },
  { id: "disp-2", name: "Coastal Leaf — Newport", address: "120 Pacific Ave, Newport Beach, CA", lat: 33.6189, lng: -117.9298 },
  { id: "disp-3", name: "Harbor Wellness — Long Beach", address: "500 Ocean Blvd, Long Beach, CA", lat: 33.7701, lng: -118.1937 },
  { id: "disp-4", name: "High Desert Rx — Riverside", address: "900 University Ave, Riverside, CA", lat: 33.9806, lng: -117.3755 },
];

const MOCK_CATALOG: ProductSKU[] = [
  { id: "sku-101", name: "Balanced 1:1 Tincture 10mg/10mg", dispensaryId: "disp-1", cannabinoidProfile: { THC: 10, CBD: 10 }, inStock: true, price: 45 },
  { id: "sku-102", name: "CBD Softgel 25mg", dispensaryId: "disp-1", cannabinoidProfile: { CBD: 25 }, inStock: true, price: 38 },
  { id: "sku-103", name: "Indica Gummy 5mg THC", dispensaryId: "disp-2", cannabinoidProfile: { THC: 5 }, inStock: true, price: 22 },
  { id: "sku-104", name: "CBN Sleep Drops 5mg", dispensaryId: "disp-2", cannabinoidProfile: { CBN: 5, CBD: 5 }, inStock: false, price: 40 },
  { id: "sku-105", name: "20:1 CBD:THC Capsule", dispensaryId: "disp-3", cannabinoidProfile: { CBD: 20, THC: 1 }, inStock: true, price: 50 },
  { id: "sku-106", name: "High-THC Distillate Cart 2.5mg/puff", dispensaryId: "disp-4", cannabinoidProfile: { THC: 2.5 }, inStock: true, price: 35 },
];

// ── Matching ─────────────────────────────────────────────────────────────

/**
 * Score how well a SKU matches a regimen target (0–100). Closer per-cannabinoid
 * mg means a higher score; out-of-stock SKUs are penalised but not excluded.
 */
export function scoreSkuAgainstRegimen(
  sku: ProductSKU,
  target: RegimenTarget,
): number {
  const keys = Object.keys(target.cannabinoids);
  if (keys.length === 0) return 0;

  let total = 0;
  for (const key of keys) {
    const want = target.cannabinoids[key];
    const have = sku.cannabinoidProfile[key] ?? 0;
    if (want <= 0) continue;
    // Relative error → similarity in [0,1].
    const err = Math.min(Math.abs(have - want) / want, 1);
    total += 1 - err;
  }
  let score = (total / keys.length) * 100;
  if (!sku.inStock) score *= 0.5;
  return Math.round(score);
}

export class DispensarySyncClient {
  constructor(
    private catalog: ProductSKU[] = MOCK_CATALOG,
    private dispensaries: DispensaryLocation[] = MOCK_DISPENSARIES,
  ) {}

  /** Sync (ingest) a dispensary's SKU catalog from its POS system. */
  async syncCatalog(dispensaryId: string): Promise<ProductSKU[]> {
    return this.catalog.filter((s) => s.dispensaryId === dispensaryId);
  }

  /** Find in-stock SKUs at dispensaries within `radiusMiles` of a point. */
  async findProductsInRadius(
    lat: number,
    lng: number,
    radiusMiles = 30,
  ): Promise<ProductSKU[]> {
    const origin: GeoPoint = { lat, lng };
    const nearbyIds = new Set(
      this.dispensaries
        .filter((d) => haversineMiles(origin, d) <= radiusMiles)
        .map((d) => d.id),
    );
    return this.catalog.filter((s) => nearbyIds.has(s.dispensaryId) && s.inStock);
  }

  /**
   * Recommend SKUs near a patient that best match their prescribed regimen,
   * ranked by match score then distance. Powers the in-app purchasing flow.
   */
  async recommendForRegimen(
    origin: GeoPoint,
    target: RegimenTarget,
    radiusMiles = 30,
  ): Promise<SkuRecommendation[]> {
    const dispById = new Map(this.dispensaries.map((d) => [d.id, d]));
    const recs: SkuRecommendation[] = [];

    for (const sku of this.catalog) {
      const dispensary = dispById.get(sku.dispensaryId);
      if (!dispensary) continue;
      const distanceMiles = haversineMiles(origin, dispensary);
      if (distanceMiles > radiusMiles) continue;
      const matchScore = scoreSkuAgainstRegimen(sku, target);
      if (matchScore <= 0) continue;
      recs.push({ sku, dispensary, distanceMiles: Math.round(distanceMiles * 10) / 10, matchScore });
    }

    return recs.sort(
      (a, b) => b.matchScore - a.matchScore || a.distanceMiles - b.distanceMiles,
    );
  }
}

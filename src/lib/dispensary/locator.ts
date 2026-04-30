// EMR-002 / EMR-017 — Dispensary locator queries.
//
// Two flavors:
//   1. nearbyDispensaries(origin, radius)  — simple geographic filter
//   2. matchesForRegimen(...)              — geo + product matching for
//                                             a patient's prescribed regimen

import { haversineMiles } from "./geo";
import type { NearbyDispensaryRow } from "./types";

export interface DispensaryRow {
  id: string;
  slug: string;
  name: string;
  status: "active" | "pending" | "inactive";
  latitude: number;
  longitude: number;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  phone: string | null;
  websiteUrl: string | null;
  hoursLine: string | null;
  lastSyncedAt: Date | null;
  skuCount: number;
}

const DEFAULT_RADIUS_MILES = 30; // Dr. Patel's 30-mile spec from EMR-002

export function filterNearby(
  rows: DispensaryRow[],
  origin: { lat: number; lng: number },
  radiusMiles: number = DEFAULT_RADIUS_MILES,
): NearbyDispensaryRow[] {
  return rows
    .filter((r) => r.status === "active")
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      geo: {
        lat: r.latitude,
        lng: r.longitude,
        addressLine1: r.addressLine1,
        addressLine2: r.addressLine2 ?? undefined,
        city: r.city,
        state: r.state,
        postalCode: r.postalCode,
        phone: r.phone ?? undefined,
        hoursLine: r.hoursLine ?? undefined,
        websiteUrl: r.websiteUrl ?? undefined,
      },
      distanceMiles: haversineMiles(origin, {
        lat: r.latitude,
        lng: r.longitude,
      }),
      skuCount: r.skuCount,
    }))
    .filter((r) => r.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}

export interface RegimenMatchInput {
  /** What the patient's regimen calls for. */
  format?: string; // e.g. "tincture", "vape"
  thcMgPerDose?: number;
  cbdMgPerDose?: number;
  thcCbdRatio?: string; // "1:1", "20:1"
  /** Patient's home location for distance ranking. */
  origin: { lat: number; lng: number };
  radiusMiles?: number;
}

export interface SkuCandidate {
  id: string;
  dispensaryId: string;
  sku: string;
  name: string;
  brand?: string;
  format: string;
  thcMgPerUnit?: number;
  cbdMgPerUnit?: number;
  thcPercent?: number;
  cbdPercent?: number;
  priceCents: number;
  inStock: boolean;
}

export interface RegimenMatchScore {
  skuId: string;
  dispensaryId: string;
  score: number; // 0..1 quality score
  reasons: string[];
}

/**
 * Score a candidate SKU against the regimen target. Higher score =
 * better match. The scoring is deliberately simple and explicit so a
 * clinician can sanity-check why a SKU was recommended.
 */
export function scoreRegimenMatch(
  candidate: SkuCandidate,
  target: { format?: string; thcMgPerDose?: number; cbdMgPerDose?: number; thcCbdRatio?: string },
): RegimenMatchScore {
  const reasons: string[] = [];
  let score = 0;

  if (!candidate.inStock) {
    return { skuId: candidate.id, dispensaryId: candidate.dispensaryId, score: 0, reasons: ["out of stock"] };
  }

  if (target.format && candidate.format === target.format.toLowerCase()) {
    score += 0.4;
    reasons.push(`format match (${candidate.format})`);
  }

  if (target.thcMgPerDose !== undefined && candidate.thcMgPerUnit !== undefined) {
    const ratio = candidate.thcMgPerUnit / Math.max(target.thcMgPerDose, 0.1);
    // Within ±25% is a strong match; ±50% is a moderate match.
    if (ratio >= 0.75 && ratio <= 1.25) {
      score += 0.3;
      reasons.push("THC mg in target range");
    } else if (ratio >= 0.5 && ratio <= 1.5) {
      score += 0.15;
      reasons.push("THC mg near target");
    }
  }

  if (target.cbdMgPerDose !== undefined && candidate.cbdMgPerUnit !== undefined) {
    const ratio = candidate.cbdMgPerUnit / Math.max(target.cbdMgPerDose, 0.1);
    if (ratio >= 0.75 && ratio <= 1.25) {
      score += 0.2;
      reasons.push("CBD mg in target range");
    } else if (ratio >= 0.5 && ratio <= 1.5) {
      score += 0.1;
      reasons.push("CBD mg near target");
    }
  }

  if (target.thcCbdRatio && candidate.thcMgPerUnit && candidate.cbdMgPerUnit) {
    const targetRatio = parseRatio(target.thcCbdRatio);
    if (targetRatio !== null) {
      const candidateRatio = candidate.thcMgPerUnit / Math.max(candidate.cbdMgPerUnit, 0.1);
      const delta = Math.abs(candidateRatio - targetRatio) / Math.max(targetRatio, 0.1);
      if (delta < 0.25) {
        score += 0.1;
        reasons.push("ratio within 25% of target");
      }
    }
  }

  return {
    skuId: candidate.id,
    dispensaryId: candidate.dispensaryId,
    score: Math.min(1, score),
    reasons,
  };
}

function parseRatio(s: string): number | null {
  // "20:1" → 20, "1:1" → 1, "1:20" → 0.05
  const m = s.match(/^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = parseFloat(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

export const LOCATOR_DEFAULTS = {
  radiusMiles: DEFAULT_RADIUS_MILES,
};

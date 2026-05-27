import { describe, it, expect } from "vitest";
import { filterNearby, scoreRegimenMatch, type DispensaryRow, type SkuCandidate } from "./locator";
import { haversineMiles } from "./geo";

const SF: { lat: number; lng: number } = { lat: 37.7749, lng: -122.4194 };
const OAKLAND: { lat: number; lng: number } = { lat: 37.8044, lng: -122.2712 };
const LA: { lat: number; lng: number } = { lat: 34.0522, lng: -118.2437 };

const row = (overrides: Partial<DispensaryRow>): DispensaryRow => ({
  id: "r1",
  slug: "r1",
  name: "Row",
  status: "active",
  latitude: SF.lat,
  longitude: SF.lng,
  addressLine1: "1 Main",
  addressLine2: null,
  city: "San Francisco",
  state: "CA",
  postalCode: "94110",
  phone: null,
  websiteUrl: null,
  hoursLine: null,
  lastSyncedAt: null,
  skuCount: 0,
  ...overrides,
});

describe("haversineMiles", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineMiles(SF, SF)).toBeLessThan(0.01);
  });

  it("approximates SF→Oakland at ~9 miles", () => {
    const d = haversineMiles(SF, OAKLAND);
    expect(d).toBeGreaterThan(7);
    expect(d).toBeLessThan(11);
  });

  it("returns hundreds of miles for SF→LA", () => {
    expect(haversineMiles(SF, LA)).toBeGreaterThan(330);
  });
});

describe("filterNearby", () => {
  it("includes only rows within radius and sorts by distance", () => {
    const rows: DispensaryRow[] = [
      row({ id: "sf", latitude: SF.lat, longitude: SF.lng, name: "SF" }),
      row({ id: "oak", latitude: OAKLAND.lat, longitude: OAKLAND.lng, name: "OAK" }),
      row({ id: "la", latitude: LA.lat, longitude: LA.lng, name: "LA" }),
    ];
    const out = filterNearby(rows, SF, 30);
    expect(out.map((r) => r.id)).toEqual(["sf", "oak"]);
    expect(out[0].distanceMiles).toBeLessThan(out[1].distanceMiles);
  });

  it("excludes inactive dispensaries", () => {
    const rows: DispensaryRow[] = [
      row({ id: "sf", status: "inactive" }),
      row({ id: "oak", latitude: OAKLAND.lat, longitude: OAKLAND.lng, status: "active" }),
    ];
    const out = filterNearby(rows, SF, 30);
    expect(out.map((r) => r.id)).toEqual(["oak"]);
  });

  it("uses 30 mile default", () => {
    const rows: DispensaryRow[] = [row({ id: "la", latitude: LA.lat, longitude: LA.lng })];
    expect(filterNearby(rows, SF)).toEqual([]);
  });
});

describe("scoreRegimenMatch", () => {
  const candidate: SkuCandidate = {
    id: "sku-1",
    dispensaryId: "d1",
    sku: "TINC-5",
    name: "Sleep 5mg",
    format: "tincture",
    thcMgPerUnit: 5,
    cbdMgPerUnit: 5,
    priceCents: 4500,
    inStock: true,
  };

  it("returns 0 when out of stock", () => {
    const result = scoreRegimenMatch({ ...candidate, inStock: false }, { format: "tincture" });
    expect(result.score).toBe(0);
    expect(result.reasons).toContain("out of stock");
  });

  it("rewards format match", () => {
    const result = scoreRegimenMatch(candidate, { format: "tincture" });
    expect(result.score).toBeGreaterThanOrEqual(0.4);
    expect(result.reasons.some((r) => r.includes("format"))).toBe(true);
  });

  it("rewards THC mg in target range", () => {
    const result = scoreRegimenMatch(candidate, { format: "tincture", thcMgPerDose: 5 });
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });

  it("partial credit when THC mg is near but not in target", () => {
    const result = scoreRegimenMatch(candidate, { thcMgPerDose: 9 });
    // 5 / 9 = 0.55, in moderate band
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0.4);
  });

  it("rewards 1:1 ratio match", () => {
    const result = scoreRegimenMatch(candidate, { thcCbdRatio: "1:1" });
    expect(result.reasons.some((r) => r.includes("ratio"))).toBe(true);
  });

  it("caps score at 1", () => {
    const result = scoreRegimenMatch(candidate, {
      format: "tincture",
      thcMgPerDose: 5,
      cbdMgPerDose: 5,
      thcCbdRatio: "1:1",
    });
    expect(result.score).toBeLessThanOrEqual(1);
  });
});

import { describe, expect, it } from "vitest";
import { haversineMiles, withinRadius } from "./geo";

describe("haversineMiles", () => {
  it("returns ~0 for identical points", () => {
    const p = { lat: 42.36, lng: -71.06 };
    expect(haversineMiles(p, p)).toBeLessThan(0.001);
  });

  it("Boston → Cambridge is ~2-4 miles", () => {
    const boston = { lat: 42.3601, lng: -71.0589 };
    const cambridge = { lat: 42.3736, lng: -71.1097 };
    const d = haversineMiles(boston, cambridge);
    expect(d).toBeGreaterThan(1.5);
    expect(d).toBeLessThan(5);
  });

  it("Boston → Worcester is ~38-42 miles", () => {
    const boston = { lat: 42.3601, lng: -71.0589 };
    const worcester = { lat: 42.2626, lng: -71.8023 };
    const d = haversineMiles(boston, worcester);
    expect(d).toBeGreaterThan(35);
    expect(d).toBeLessThan(45);
  });
});

describe("withinRadius", () => {
  it("excludes points outside the radius", () => {
    const boston = { lat: 42.3601, lng: -71.0589 };
    const worcester = { lat: 42.2626, lng: -71.8023 };
    expect(withinRadius(boston, worcester, 30)).toBe(false);
    expect(withinRadius(boston, worcester, 50)).toBe(true);
  });
});

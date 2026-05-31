import { describe, it, expect } from "vitest";
import {
  buildMapEmbedUrl,
  directionsUrl,
  placeSearchUrl,
  pinsWithinRadius,
  ALL_PINS,
  DISPENSARY_PINS,
} from "./dispensary-locator";

const IRVINE = { lat: 33.6846, lng: -117.8265 };

describe("dispensary-locator", () => {
  it("returns null embed URL without an API key", () => {
    expect(buildMapEmbedUrl(undefined)).toBeNull();
    expect(buildMapEmbedUrl("")).toBeNull();
  });

  it("builds a Google Maps Embed URL with a key", () => {
    const url = buildMapEmbedUrl("test-key", "dispensary");
    expect(url).toContain("https://www.google.com/maps/embed/v1/search");
    expect(url).toContain("key=test-key");
    expect(url).toContain("q=dispensary");
  });

  it("builds keyless directions + place-search links", () => {
    const pin = DISPENSARY_PINS[0];
    expect(directionsUrl(pin)).toContain("https://www.google.com/maps/dir/?api=1&destination=");
    expect(placeSearchUrl(pin)).toContain("https://www.google.com/maps/search/?api=1&query=");
  });

  it("filters and sorts pins by distance within a radius", () => {
    const near = pinsWithinRadius(IRVINE, 30);
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThanOrEqual(ALL_PINS.length);
    for (let i = 1; i < near.length; i++) {
      expect(near[i - 1].distanceMiles).toBeLessThanOrEqual(near[i].distanceMiles);
    }
  });
});

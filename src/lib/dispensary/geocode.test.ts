import { describe, it, expect } from "vitest";
import { geocodeAddress } from "./geocode";

describe("geocodeAddress", () => {
  it("resolves from mock dictionary when no API key is present", async () => {
    const coords = await geocodeAddress("Seattle, WA");
    expect(coords).toEqual({ lat: 47.6062, lng: -122.3321 });
  });

  it("falls back to a default coordinate if address is unrecognized in mock mode", async () => {
    const coords = await geocodeAddress("Unknown City");
    expect(coords).toEqual({ lat: 45.5152, lng: -122.6784 });
  });
});

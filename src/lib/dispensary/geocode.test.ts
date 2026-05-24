import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  describe("with GOOGLE_MAPS_API_KEY set", () => {
    const originalKey = process.env.GOOGLE_MAPS_API_KEY;

    beforeEach(() => {
      process.env.GOOGLE_MAPS_API_KEY = "test-api-key";
    });

    afterEach(() => {
      if (originalKey === undefined) {
        delete process.env.GOOGLE_MAPS_API_KEY;
      } else {
        process.env.GOOGLE_MAPS_API_KEY = originalKey;
      }
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("returns coordinates from a successful Google Geocoding API response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => ({
          results: [
            {
              geometry: {
                location: { lat: 40.7128, lng: -74.006 },
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const coords = await geocodeAddress("New York, NY");

      expect(coords).toEqual({ lat: 40.7128, lng: -74.006 });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://maps.googleapis.com/maps/api/geocode/json"),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("address=New%20York%2C%20NY"),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("key=test-api-key"),
      );
    });

    it("falls back to default coordinates when Google API returns no results", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => ({ results: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const coords = await geocodeAddress("Nowhere, XX");

      expect(coords).toEqual({ lat: 45.5152, lng: -122.6784 });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("falls back to default coordinates when Google API response omits results entirely", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => ({ status: "ZERO_RESULTS" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const coords = await geocodeAddress("Nowhere, XX");

      expect(coords).toEqual({ lat: 45.5152, lng: -122.6784 });
    });

    it("falls back to default coordinates when fetch throws an error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error("network failure"));
      vi.stubGlobal("fetch", mockFetch);

      const coords = await geocodeAddress("Anywhere");

      expect(coords).toEqual({ lat: 45.5152, lng: -122.6784 });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Geocoding failed, falling back to default coords",
        expect.any(Error),
      );
    });
  });
});

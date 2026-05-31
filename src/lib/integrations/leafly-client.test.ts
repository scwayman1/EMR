import { describe, it, expect, vi } from "vitest";
import {
  fetchLeaflyStrains,
  matchStrainsToSymptom,
  normalizeSymptom,
  listCoveredConditions,
  STRAIN_CATALOG,
} from "./leafly-client";

global.fetch = vi.fn();

describe("Leafly API Client", () => {
  it("should fetch and return a list of strains", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { slug: "blue-dream", name: "Blue Dream", category: "Hybrid", thcLevel: 18, cbdLevel: 0.1, dominantTerpene: "Myrcene", effects: ["Happy", "Relaxed"] }
        ]
      })
    } as any);

    const strains = await fetchLeaflyStrains();
    expect(strains).toHaveLength(1);
    expect(strains[0].name).toBe("Blue Dream");
  });

  it("falls back to the curated catalog when the API fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    const strains = await fetchLeaflyStrains();
    expect(strains.length).toBeGreaterThan(0);
    expect(strains).toBe(STRAIN_CATALOG);
  });
});

describe("Symptom → strain matcher (EMR-018)", () => {
  it("normalizes natural-language symptoms to canonical conditions", () => {
    expect(normalizeSymptom("can't sleep")).toBe("insomnia");
    expect(normalizeSymptom("Anxious")).toBe("anxiety");
    expect(normalizeSymptom("  ")).toBeNull();
  });

  it("ranks sleep strains highest for insomnia", () => {
    const matches = matchStrainsToSymptom("insomnia");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].helpsWith).toContain("insomnia");
    // Scores are sorted descending.
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].matchScore).toBeGreaterThanOrEqual(matches[i].matchScore);
    }
  });

  it("returns high-CBD cultivars for seizures", () => {
    const matches = matchStrainsToSymptom("seizures");
    expect(matches.some((m) => m.slug === "charlottes-web")).toBe(true);
  });

  it("returns nothing for an unknown symptom with no synonym/effect overlap", () => {
    expect(matchStrainsToSymptom("teleportation")).toEqual([]);
  });

  it("exposes the covered conditions for UI chips", () => {
    const conditions = listCoveredConditions();
    expect(conditions).toContain("pain");
    expect(conditions).toContain("anxiety");
  });
});

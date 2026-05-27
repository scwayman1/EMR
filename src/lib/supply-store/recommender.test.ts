import { describe, expect, it } from "vitest";
import {
  recommend,
  scoreSupplyProduct,
  type PatientContext,
  type SupplyProductCandidate,
} from "./recommender";

const candidate = (overrides: Partial<SupplyProductCandidate> = {}): SupplyProductCandidate => ({
  id: overrides.id ?? "p1",
  slug: overrides.slug ?? "p1",
  name: overrides.name ?? "Generic",
  brand: overrides.brand,
  category: overrides.category ?? "general_wellness",
  description: overrides.description ?? "",
  shortDescription: overrides.shortDescription,
  imageUrl: overrides.imageUrl,
  priceCents: overrides.priceCents ?? 1500,
  symptoms: overrides.symptoms ?? [],
  conditions: overrides.conditions ?? [],
  contraindications: overrides.contraindications ?? [],
  isOTC: overrides.isOTC ?? true,
  requiresRx: overrides.requiresRx ?? false,
  fsaEligible: overrides.fsaEligible ?? false,
  externalUrl: overrides.externalUrl,
  externalPartner: overrides.externalPartner,
});

describe("scoreSupplyProduct", () => {
  it("scores zero when no overlap", () => {
    const r = scoreSupplyProduct(candidate({ symptoms: ["cough"] }), {
      symptoms: ["insomnia"],
      conditions: [],
      contraindications: [],
    });
    expect(r.score).toBe(0);
  });

  it("rewards symptom overlap", () => {
    const r = scoreSupplyProduct(
      candidate({ symptoms: ["cough", "sore throat"] }),
      { symptoms: ["cough", "sore throat"], conditions: [], contraindications: [] },
    );
    expect(r.matchedSymptoms.length).toBe(2);
    expect(r.score).toBeGreaterThan(0.4);
  });

  it("blocks on contraindication", () => {
    const r = scoreSupplyProduct(
      candidate({ contraindications: ["warfarin"], symptoms: ["pain"] }),
      { symptoms: ["pain"], conditions: [], contraindications: ["Warfarin"] },
    );
    expect(r.score).toBe(0);
    expect(r.blockedReason).toMatch(/warfarin/i);
  });

  it("normalizes case for matching", () => {
    const r = scoreSupplyProduct(
      candidate({ symptoms: ["INSOMNIA"] }),
      { symptoms: ["insomnia"], conditions: [], contraindications: [] },
    );
    expect(r.matchedSymptoms.length).toBe(1);
  });
});

describe("recommend", () => {
  const ctx: PatientContext = {
    symptoms: ["cough", "sore throat"],
    conditions: [],
    contraindications: [],
  };

  it("returns ranked, non-blocked products", () => {
    const catalog = [
      candidate({ id: "a", symptoms: ["cough", "sore throat"], category: "cough_cold" }),
      candidate({ id: "b", symptoms: ["cough"], category: "cough_cold" }),
      candidate({ id: "c", symptoms: ["pain"], category: "pain" }),
      candidate({
        id: "d",
        symptoms: ["cough"],
        contraindications: ["pregnant"],
        category: "cough_cold",
      }),
    ];
    const ranked = recommend(catalog, {
      ...ctx,
      contraindications: ["pregnant"],
    });
    expect(ranked.map((r) => r.product.id)).toEqual(["a", "b"]);
  });

  it("respects category filter", () => {
    const catalog = [
      candidate({ id: "a", symptoms: ["cough"], category: "cough_cold" }),
      candidate({ id: "b", symptoms: ["cough"], category: "general_wellness" }),
    ];
    const ranked = recommend(catalog, {
      ...ctx,
      categoryFilter: ["cough_cold"],
    });
    expect(ranked.map((r) => r.product.id)).toEqual(["a"]);
  });

  it("respects the limit", () => {
    const catalog = Array.from({ length: 30 }, (_, i) =>
      candidate({ id: `p${i}`, symptoms: ["cough"], category: "cough_cold" }),
    );
    expect(recommend(catalog, ctx, 5)).toHaveLength(5);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    product: { findUnique: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import { terpeneProfileMatcherAgent } from "./terpene-profile-matcher-agent";

const makeCtx = () =>
  ({ log: vi.fn() }) as unknown as Parameters<
    typeof terpeneProfileMatcherAgent.run
  >[1];

beforeEach(() => {
  hoisted.mockPrisma.product.findUnique.mockReset();
});

describe("terpeneProfileMatcher", () => {
  it("returns empty hints when the profile is empty", async () => {
    const result = await terpeneProfileMatcherAgent.run(
      { terpeneProfile: {} },
      makeCtx(),
    );
    expect(result.dominantTerpenes).toEqual([]);
    expect(result.therapeuticHints).toEqual([]);
  });

  it("ranks dominant terpenes desc by concentration + aggregates hints", async () => {
    const result = await terpeneProfileMatcherAgent.run(
      {
        terpeneProfile: {
          myrcene: 0.9,
          linalool: 0.4,
          limonene: 0.1,
        },
      },
      makeCtx(),
    );

    expect(result.dominantTerpenes.map((t) => t.terpene)).toEqual([
      "myrcene",
      "linalool",
      "limonene",
    ]);
    // myrcene + linalool both contribute "supports restful sleep" — aggregated
    // to one hint with both supporting terpenes, sorted.
    const sleepHint = result.therapeuticHints.find(
      (h) => h.hint === "supports restful sleep",
    );
    expect(sleepHint?.supportingTerpenes).toEqual(["linalool", "myrcene"]);
    expect(sleepHint?.evidenceLevel).toBe("preclinical");
  });

  it("filters unknown terpenes without crashing", async () => {
    const result = await terpeneProfileMatcherAgent.run(
      {
        terpeneProfile: {
          madeUpTerpene: 0.7,
          myrcene: 0.5,
        },
      },
      makeCtx(),
    );

    expect(result.dominantTerpenes).toHaveLength(2);
    // Only myrcene contributes to hints
    expect(
      result.therapeuticHints.every((h) =>
        h.supportingTerpenes.every((t) => t === "myrcene"),
      ),
    ).toBe(true);
  });

  it("maps unicode/hyphen/underscore terpene names (β-caryophyllene, beta_caryophyllene)", async () => {
    const unicode = await terpeneProfileMatcherAgent.run(
      { terpeneProfile: { "β-caryophyllene": 0.6 } },
      makeCtx(),
    );
    expect(unicode.therapeuticHints.length).toBeGreaterThan(0);

    const underscore = await terpeneProfileMatcherAgent.run(
      { terpeneProfile: { beta_caryophyllene: 0.6 } },
      makeCtx(),
    );
    expect(underscore.therapeuticHints.length).toBeGreaterThan(0);
  });

  it("fetches the product when only a productId is provided", async () => {
    hoisted.mockPrisma.product.findUnique.mockResolvedValue({
      terpeneProfile: { pinene: 0.8 },
    });

    const result = await terpeneProfileMatcherAgent.run(
      { productId: "p1" },
      makeCtx(),
    );

    expect(result.resolvedFrom).toBe("product_fetch");
    expect(result.therapeuticHints.some((h) => h.hint.includes("focus"))).toBe(
      true,
    );
  });

  it("sorts hints by evidence level then by top supporting concentration", async () => {
    const result = await terpeneProfileMatcherAgent.run(
      {
        terpeneProfile: {
          // Two preclinical hits at equal concentration — tiebreak on name
          myrcene: 0.5,
          linalool: 0.5,
          // Anecdotal-only hit ranks below preclinical ones regardless of
          // concentration.
          ocimene: 0.99,
        },
      },
      makeCtx(),
    );

    const first = result.therapeuticHints[0];
    expect(first.evidenceLevel).toBe("preclinical");

    const anecdotalIdx = result.therapeuticHints.findIndex(
      (h) => h.hint === "supports alertness",
    );
    const lastPreclinicalIdx = [...result.therapeuticHints]
      .map((h, i) => ({ i, e: h.evidenceLevel }))
      .filter((x) => x.e === "preclinical")
      .pop()?.i;
    expect(anecdotalIdx).toBeGreaterThan(lastPreclinicalIdx ?? -1);
  });
});

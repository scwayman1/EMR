import { describe, expect, it } from "vitest";

import {
  RxNormClient,
  RxNormError,
  createMockRxNormTransport,
} from "./rxnorm";

describe("RxNormClient.findRxcui", () => {
  it("returns the first matching RXCUI", async () => {
    const client = new RxNormClient({
      fetchImpl: createMockRxNormTransport({
        knownDrugs: { "Tylenol 500mg": "1738139" },
      }),
    });
    expect(await client.findRxcui("Tylenol 500mg")).toBe("1738139");
  });

  it("returns null when nothing matches", async () => {
    const client = new RxNormClient({
      fetchImpl: createMockRxNormTransport({ knownDrugs: {} }),
    });
    expect(await client.findRxcui("Unicorn Tears")).toBeNull();
  });

  it("returns null for empty input without making a request", async () => {
    let called = false;
    const client = new RxNormClient({
      fetchImpl: async () => {
        called = true;
        return { ok: true, status: 200, text: async () => "{}" };
      },
    });
    expect(await client.findRxcui("   ")).toBeNull();
    expect(called).toBe(false);
  });
});

describe("RxNormClient.lookupRxcui", () => {
  it("returns concept properties and related codes", async () => {
    const client = new RxNormClient({
      fetchImpl: createMockRxNormTransport({
        knownConcepts: {
          "1738139": {
            rxcui: "1738139",
            name: "acetaminophen 500 MG Oral Tablet",
            tty: "SCD",
            related: [
              { rxcui: "161", name: "Acetaminophen", tty: "IN" },
              { rxcui: "202433", name: "Tylenol", tty: "BN" },
            ],
          },
        },
      }),
    });
    const result = await client.lookupRxcui("1738139");
    expect(result?.name).toBe("acetaminophen 500 MG Oral Tablet");
    expect(result?.related.map((r) => r.tty)).toEqual(["IN", "BN"]);
  });

  it("returns null for unknown RXCUIs", async () => {
    const client = new RxNormClient({
      fetchImpl: createMockRxNormTransport({}),
    });
    expect(await client.lookupRxcui("999999")).toBeNull();
  });
});

describe("RxNormClient.findInteractions", () => {
  it("short-circuits for single-drug lists", async () => {
    let called = false;
    const client = new RxNormClient({
      fetchImpl: async () => {
        called = true;
        return { ok: true, status: 200, text: async () => "{}" };
      },
    });
    expect(await client.findInteractions(["161"])).toEqual([]);
    expect(called).toBe(false);
  });

  it("returns parsed interaction pairs", async () => {
    const client = new RxNormClient({
      fetchImpl: createMockRxNormTransport({
        interactions: [
          {
            source: "DrugBank",
            drugs: [
              { rxcui: "161", name: "Acetaminophen" },
              { rxcui: "11289", name: "Warfarin" },
            ],
            severity: "high",
            description: "Potentiates anticoagulation.",
          },
        ],
      }),
    });
    const interactions = await client.findInteractions(["161", "11289"]);
    expect(interactions).toHaveLength(1);
    expect(interactions[0].severity).toBe("high");
    expect(interactions[0].drugs.map((d) => d.name)).toEqual([
      "Acetaminophen",
      "Warfarin",
    ]);
  });
});

describe("RxNormClient error mapping", () => {
  it("wraps non-200 responses in RxNormError", async () => {
    const client = new RxNormClient({
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        text: async () => "down",
      }),
    });
    await expect(client.findRxcui("Aspirin")).rejects.toBeInstanceOf(
      RxNormError,
    );
  });
});

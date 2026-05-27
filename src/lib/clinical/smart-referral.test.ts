import { describe, expect, it } from "vitest";
import {
  buildReferralPacket,
  type ChartFact,
} from "./smart-referral";

// EMR-078 — smart referral packet builder

const NOW = new Date("2026-05-12T00:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

function facts(): ChartFact[] {
  return [
    {
      id: "p1",
      kind: "problem",
      label: "Atrial fibrillation",
      recordedAt: daysAgo(30),
      code: "I48.91",
    },
    {
      id: "m1",
      kind: "medication",
      label: "Apixaban 5mg BID",
      recordedAt: daysAgo(60),
    },
    {
      id: "l1",
      kind: "lab",
      label: "BNP 1200",
      recordedAt: daysAgo(14),
    },
    {
      id: "v1",
      kind: "vital",
      label: "BP 158/94",
      recordedAt: daysAgo(7),
    },
    {
      id: "s1",
      kind: "social",
      label: "Cannabis use, daily",
      recordedAt: daysAgo(45),
      sensitive: true,
    },
    {
      id: "c1",
      kind: "cannabis_use",
      label: "Indica cannabis tincture 5mg HS",
      recordedAt: daysAgo(45),
      sensitive: true,
    },
    {
      id: "old",
      kind: "imaging",
      label: "Knee MRI 2019",
      recordedAt: daysAgo(1800), // > recency window
    },
  ];
}

describe("buildReferralPacket — cardiology", () => {
  it("keeps high-relevance facts and excludes stale imaging", () => {
    const r = buildReferralPacket({
      facts: facts(),
      specialty: "cardiology",
      reasonForReferral: "atrial fibrillation management",
      now: NOW,
    });
    const ids = r.curated.map((c) => c.fact.id);
    expect(ids).toContain("p1"); // problem matches
    expect(ids).toContain("m1"); // medication included
    expect(ids).toContain("v1"); // vital relevant + recent
    expect(ids).not.toContain("old"); // stale, low relevance
  });

  it("sorts curated facts descending by relevance", () => {
    const r = buildReferralPacket({
      facts: facts(),
      specialty: "cardiology",
      reasonForReferral: "atrial fibrillation",
      now: NOW,
    });
    for (let i = 1; i < r.curated.length; i++) {
      expect(r.curated[i - 1]!.relevance).toBeGreaterThanOrEqual(
        r.curated[i]!.relevance,
      );
    }
  });

  it("redacts sensitive cannabis_use by default and flags consent", () => {
    const r = buildReferralPacket({
      facts: facts(),
      specialty: "cardiology",
      reasonForReferral: "atrial fibrillation",
      now: NOW,
    });
    const curatedIds = r.curated.map((c) => c.fact.id);
    expect(curatedIds).not.toContain("c1");
    expect(r.needsConsentRelease.map((f) => f.id)).toContain("c1");
    expect(r.redactionNotes.some((n) => /cannabis|sensitive/i.test(n))).toBe(true);
  });
});

describe("buildReferralPacket — sensitivity overrides", () => {
  it("includes sensitive facts when defaultRedactSensitive is false", () => {
    // Psychiatry has a high baseline interest in cannabis_use (0.85),
    // so disabling redaction makes a recent cannabis fact pass the
    // relevance threshold even when the reason text doesn't mention it.
    const r = buildReferralPacket({
      facts: facts(),
      specialty: "psychiatry",
      reasonForReferral: "mood disorder workup",
      defaultRedactSensitive: false,
      now: NOW,
    });
    const ids = r.curated.map((c) => c.fact.id);
    expect(ids).toContain("c1");
  });

  it("forceInclude overrides relevance threshold", () => {
    const r = buildReferralPacket({
      facts: facts(),
      specialty: "cardiology",
      reasonForReferral: "AAA followup",
      forceInclude: ["old"],
      now: NOW,
    });
    const ids = r.curated.map((c) => c.fact.id);
    expect(ids).toContain("old");
  });

  it("forceInclude wins over sensitive redaction", () => {
    const r = buildReferralPacket({
      facts: facts(),
      specialty: "cardiology",
      reasonForReferral: "atrial fibrillation",
      forceInclude: ["c1"],
      now: NOW,
    });
    const ids = r.curated.map((c) => c.fact.id);
    expect(ids).toContain("c1");
  });
});

describe("buildReferralPacket — psychiatry weighting", () => {
  it("retains cannabis_use when reason mentions cannabis", () => {
    const r = buildReferralPacket({
      facts: facts(),
      specialty: "psychiatry",
      // reason mentions cannabis → reasonBoost > 0 → sensitive isn't auto-redacted
      reasonForReferral: "cannabis use disorder evaluation, depressed mood",
      now: NOW,
    });
    const ids = r.curated.map((c) => c.fact.id);
    expect(ids).toContain("c1");
  });
});

describe("buildReferralPacket — page estimate", () => {
  it("returns at least one page even for tiny packets", () => {
    const r = buildReferralPacket({
      facts: [],
      specialty: "primary_care",
      reasonForReferral: "annual exam",
      now: NOW,
    });
    expect(r.estimatedPages).toBeGreaterThanOrEqual(1);
  });

  it("scales pages with curated content", () => {
    const many: ChartFact[] = Array.from({ length: 30 }, (_, i) => ({
      id: `f${i}`,
      kind: "problem",
      label: `Problem ${i}`,
      recordedAt: daysAgo(10),
    }));
    const r = buildReferralPacket({
      facts: many,
      specialty: "primary_care",
      reasonForReferral: "annual exam",
      now: NOW,
    });
    expect(r.estimatedPages).toBeGreaterThanOrEqual(2);
  });
});

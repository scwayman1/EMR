import { describe, expect, it } from "vitest";
import {
  fillMetrics,
  offerWaves,
  rankWaitlist,
  type OpenSlot,
  type ScoredWaitlistEntry,
  type WaitlistEntry,
} from "./waitlist";

// A Friday 10:00 local slot. (2026-05-29 is a Friday.)
const slot: OpenSlot = {
  slotId: "slot-1",
  providerId: "prov-1",
  startAt: new Date("2026-05-29T10:00:00.000"),
  endAt: new Date("2026-05-29T10:30:00.000"),
  modality: "video",
  visitType: "follow_up",
};

function entry(overrides: Partial<WaitlistEntry> = {}): WaitlistEntry {
  return {
    patientId: "p-base",
    displayName: "Base Patient",
    addedAt: new Date("2026-05-28T10:00:00.000"),
    visitType: "follow_up",
    preferredProviderId: null,
    acceptableWeekdays: [],
    acceptableHourRange: null,
    urgency: "routine",
    overdueDays: 0,
    riskTier: "low",
    flexibilityScore: 0.5,
    vip: false,
    contactChannel: "sms",
    ...overrides,
  };
}

describe("rankWaitlist filtering", () => {
  it("filters out a visit-type mismatch", () => {
    const ranked = rankWaitlist([entry({ visitType: "intake" })], slot);
    expect(ranked).toHaveLength(0);
  });

  it("filters out a patient whose acceptable weekdays exclude the slot day", () => {
    // Slot is a Friday (day 5); patient only takes Mon/Tue.
    const ranked = rankWaitlist([entry({ acceptableWeekdays: [1, 2] })], slot);
    expect(ranked).toHaveLength(0);
  });

  it("keeps a patient whose acceptable weekdays include the slot day", () => {
    const ranked = rankWaitlist([entry({ acceptableWeekdays: [5] })], slot);
    expect(ranked).toHaveLength(1);
  });

  it("filters out a slot hour outside the acceptable hour range", () => {
    const ranked = rankWaitlist(
      [entry({ acceptableHourRange: { earliestHour: 13, latestHour: 17 } })],
      slot,
    );
    expect(ranked).toHaveLength(0);
  });

  it("hard-filters a provider preference mismatch by default", () => {
    const ranked = rankWaitlist([entry({ preferredProviderId: "prov-9" })], slot);
    expect(ranked).toHaveLength(0);
  });

  it("allows a provider mismatch when honorProviderPreferenceAsHard is false", () => {
    const ranked = rankWaitlist([entry({ preferredProviderId: "prov-9" })], slot, {
      honorProviderPreferenceAsHard: false,
    });
    expect(ranked).toHaveLength(1);
  });
});

describe("rankWaitlist ordering", () => {
  it("ranks an urgent overdue patient above a routine on-time patient", () => {
    const urgent = entry({
      patientId: "urgent",
      urgency: "urgent",
      overdueDays: 20,
    });
    const routine = entry({ patientId: "routine", urgency: "routine", overdueDays: 0 });

    const ranked = rankWaitlist([routine, urgent], slot);
    expect(ranked.map((r) => r.entry.patientId)).toEqual(["urgent", "routine"]);
    expect(ranked[0].reasons).toContain("Urgent clinical need");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("prefers a low-risk patient over an otherwise-identical high-risk one", () => {
    const lowRisk = entry({ patientId: "low", riskTier: "low" });
    const highRisk = entry({ patientId: "high", riskTier: "high" });

    const ranked = rankWaitlist([highRisk, lowRisk], slot);
    expect(ranked[0].entry.patientId).toBe("low");
  });

  it("rewards a longer wait time", () => {
    const longWait = entry({
      patientId: "long",
      addedAt: new Date("2026-05-01T10:00:00.000"),
    });
    const shortWait = entry({
      patientId: "short",
      addedAt: new Date("2026-05-28T10:00:00.000"),
    });

    const ranked = rankWaitlist([shortWait, longWait], slot);
    expect(ranked[0].entry.patientId).toBe("long");
    expect(ranked[0].reasons.some((r) => r.startsWith("Waiting"))).toBe(true);
  });

  it("respects the limit option", () => {
    const ranked = rankWaitlist(
      [entry({ patientId: "a" }), entry({ patientId: "b" }), entry({ patientId: "c" })],
      slot,
      { limit: 2 },
    );
    expect(ranked).toHaveLength(2);
  });
});

describe("offerWaves", () => {
  function scored(id: string): ScoredWaitlistEntry {
    return { entry: entry({ patientId: id }), score: 0.5, reasons: [] };
  }

  it("buckets ranked entries into 3/5/blast waves with staggered offsets", () => {
    const ranked = Array.from({ length: 11 }, (_, i) => scored(`p-${i}`));
    const waves = offerWaves(ranked);

    expect(waves).toHaveLength(3);
    expect(waves[0]).toMatchObject({ wave: 1, offsetMinutes: 0 });
    expect(waves[0].entries).toHaveLength(3);
    expect(waves[1]).toMatchObject({ wave: 2, offsetMinutes: 15 });
    expect(waves[1].entries).toHaveLength(5);
    expect(waves[2]).toMatchObject({ wave: 3, offsetMinutes: 45 });
    expect(waves[2].entries).toHaveLength(3);
  });

  it("omits empty trailing waves", () => {
    const waves = offerWaves([scored("a"), scored("b")]);
    expect(waves).toHaveLength(1);
    expect(waves[0].entries).toHaveLength(2);
  });

  it("returns no waves for an empty ranking", () => {
    expect(offerWaves([])).toEqual([]);
  });
});

describe("fillMetrics", () => {
  it("computes fill rate and median fill time over filled events only", () => {
    const metrics = fillMetrics([
      {
        cancelledAt: new Date("2026-05-28T10:00:00.000Z"),
        filledAt: new Date("2026-05-28T10:10:00.000Z"), // 10 min
      },
      {
        cancelledAt: new Date("2026-05-28T11:00:00.000Z"),
        filledAt: new Date("2026-05-28T11:30:00.000Z"), // 30 min
      },
      {
        cancelledAt: new Date("2026-05-28T12:00:00.000Z"),
        filledAt: null, // unfilled
      },
    ]);

    expect(metrics.total).toBe(3);
    expect(metrics.filled).toBe(2);
    expect(metrics.fillRate).toBeCloseTo(0.667, 3);
    expect(metrics.medianFillMinutes).toBe(20); // mean of 10 and 30
  });

  it("returns zeros for an empty event list", () => {
    expect(fillMetrics([])).toEqual({
      fillRate: 0,
      medianFillMinutes: 0,
      filled: 0,
      total: 0,
    });
  });
});

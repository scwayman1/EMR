import { describe, expect, it } from "vitest";
import { rankSlots, type CandidateSlot, type PatientContext } from "./slot-recommender";

const basePatient: PatientContext = {
  patientId: "patient-1",
  preferredProviderId: null,
  lastVisitProviderId: null,
  riskTier: "low",
  preferredDaysOfWeek: [],
  preferredHours: null,
  preferredModality: null,
  dueAt: null,
  overdueGraceDays: 0,
  providerLockedTo: null,
};

const slot = (
  slotId: string,
  overrides: Partial<CandidateSlot> = {},
): CandidateSlot => ({
  slotId,
  providerId: "provider-a",
  startAt: new Date("2026-05-18T15:00:00.000Z"),
  endAt: new Date("2026-05-18T15:30:00.000Z"),
  modality: "video",
  slotValue: 0.5,
  ...overrides,
});

describe("rankSlots", () => {
  it("prioritizes same-clinician continuity for physician follow-up", () => {
    const results = rankSlots(
      [
        slot("other-provider-prime", { providerId: "provider-b", slotValue: 1 }),
        slot("last-provider", { providerId: "provider-a", slotValue: 0.4 }),
      ],
      { ...basePatient, lastVisitProviderId: "provider-a", riskTier: "medium" },
    );

    expect(results[0].slotId).toBe("last-provider");
    expect(results[0].reasons).toContain("Same provider as last visit");
  });

  it("filters out slots that violate provider lock or required modality hard constraints", () => {
    const results = rankSlots(
      [
        slot("wrong-provider", { providerId: "provider-a", modality: "in_person" }),
        slot("wrong-modality", { providerId: "provider-locked", modality: "phone" }),
        slot("eligible", { providerId: "provider-locked", modality: "in_person" }),
      ],
      { ...basePatient, providerLockedTo: "provider-locked" },
      { requiredModality: "in_person" },
    );

    expect(results.map((s) => s.slotId)).toEqual(["eligible"]);
  });

  it("steers high no-show-risk patients toward lower-value slots", () => {
    const results = rankSlots(
      [
        slot("prime-slot", { slotValue: 1 }),
        slot("cheap-slot", { slotValue: 0.05 }),
      ],
      { ...basePatient, riskTier: "high" },
    );

    expect(results[0].slotId).toBe("cheap-slot");
    expect(results[0].reasons).toContain("Slot value matches risk tier");
  });

  it("rewards patient stated preferences and cadence-fit reasons", () => {
    const results = rankSlots(
      [
        slot("generic", {
          providerId: "provider-b",
          startAt: new Date("2026-05-22T18:00:00.000Z"),
          endAt: new Date("2026-05-22T18:30:00.000Z"),
          modality: "phone",
          slotValue: 0.5,
        }),
        slot("preferred", {
          providerId: "provider-a",
          startAt: new Date("2026-05-20T14:00:00.000Z"),
          endAt: new Date("2026-05-20T14:30:00.000Z"),
          modality: "video",
          slotValue: 0.5,
        }),
      ],
      {
        ...basePatient,
        preferredProviderId: "provider-a",
        preferredDaysOfWeek: [3],
        // Broad enough to avoid making this regression test depend on the
        // machine timezone used by Date#getHours().
        preferredHours: { earliestHour: 0, latestHour: 24 },
        preferredModality: "video",
        dueAt: new Date("2026-05-20T14:00:00.000Z"),
        overdueGraceDays: 2,
        riskTier: "medium",
      },
    );

    expect(results[0].slotId).toBe("preferred");
    expect(results[0].reasons).toEqual(
      expect.arrayContaining([
        "Preferred provider",
        "Matches modality preference (video)",
        "Within preferred hours",
        "Preferred day of week",
        "Lands on cadence due date",
      ]),
    );
  });

  it("honors return limits after ranking", () => {
    const results = rankSlots(
      [slot("one", { slotValue: 1 }), slot("two", { slotValue: 0.8 }), slot("three", { slotValue: 0.6 })],
      basePatient,
      { limit: 2 },
    );

    expect(results).toHaveLength(2);
    expect(results.map((s) => s.slotId)).toEqual(["one", "two"]);
  });
});

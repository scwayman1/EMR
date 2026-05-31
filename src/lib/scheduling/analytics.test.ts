import { describe, expect, it } from "vitest";
import {
  actionTriggers,
  computeMetrics,
  detectBottlenecks,
  forecastDemand,
  forecastWindows,
  percentile,
  sliceBy,
  type AppointmentRecord,
} from "./analytics";

const NOW = new Date("2026-05-28T12:00:00.000Z");

function appt(overrides: Partial<AppointmentRecord> & Pick<AppointmentRecord, "id">): AppointmentRecord {
  return {
    providerId: "p1",
    startAt: new Date("2026-05-20T15:00:00.000Z"),
    endAt: new Date("2026-05-20T16:00:00.000Z"),
    status: "completed",
    modality: "video",
    createdAt: new Date("2026-05-13T15:00:00.000Z"),
    ...overrides,
  };
}

describe("computeMetrics", () => {
  const fixture: AppointmentRecord[] = [
    // Past: completed (new patient, billed), no_show, cancelled.
    appt({
      id: "a-completed",
      status: "completed",
      cohort: "new",
      revenue: 200,
      visitType: "intake",
      payer: "aetna",
      startAt: new Date("2026-05-20T15:00:00.000Z"),
      endAt: new Date("2026-05-20T16:00:00.000Z"),
      createdAt: new Date("2026-05-18T15:00:00.000Z"), // 2 day lead
    }),
    appt({
      id: "a-noshow",
      status: "no_show",
      cohort: "recurring",
      revenue: null,
      startAt: new Date("2026-05-21T15:00:00.000Z"),
      endAt: new Date("2026-05-21T16:00:00.000Z"),
      createdAt: new Date("2026-05-17T15:00:00.000Z"), // 4 day lead
    }),
    appt({
      id: "a-cancelled",
      status: "cancelled",
      cohort: "recurring",
      startAt: new Date("2026-05-22T15:00:00.000Z"),
      endAt: new Date("2026-05-22T16:00:00.000Z"),
      createdAt: new Date("2026-05-12T15:00:00.000Z"),
    }),
    // Future: confirmed (booked) + requested (not booked).
    appt({
      id: "a-future-confirmed",
      status: "confirmed",
      cohort: "recurring",
      startAt: new Date("2026-06-10T15:00:00.000Z"),
      endAt: new Date("2026-06-10T16:30:00.000Z"), // 1.5h
      createdAt: new Date("2026-05-27T15:00:00.000Z"),
    }),
    appt({
      id: "a-future-requested",
      status: "requested",
      startAt: new Date("2026-06-12T15:00:00.000Z"),
      endAt: new Date("2026-06-12T16:00:00.000Z"),
      createdAt: new Date("2026-05-27T15:00:00.000Z"),
    }),
  ];

  it("computes rates over past appointments only and guards division", () => {
    const m = computeMetrics(fixture, NOW);

    // attended denom = completed(1) + no_show(1) = 2
    expect(m.fillRate).toBe(0.5);
    expect(m.noShowRate).toBe(0.5);
    // cancelled(1) / past(3)
    expect(m.cancelRate).toBeCloseTo(1 / 3, 6);

    expect(m.counts.past).toBe(3);
    expect(m.counts.future).toBe(2);
    expect(m.counts.booked).toBe(3); // completed + no_show + confirmed
    expect(m.counts.requested).toBe(1);
  });

  it("computes new-patient conversion and mean revenue over completed slots", () => {
    const m = computeMetrics(fixture, NOW);
    // 1 booked-new, 1 completed-new
    expect(m.newPatientConversion).toBe(1);
    // only one completed appt has numeric revenue (200)
    expect(m.revenuePerSlot).toBe(200);
  });

  it("computes provider utilization against the capacity option", () => {
    const m = computeMetrics(fixture, NOW, { capacityHours: 10 });
    const p1 = m.providerUtilization.find((p) => p.providerId === "p1");
    // booked durations: completed 1h + no_show 1h + confirmed 1.5h = 3.5h
    expect(p1?.bookedHours).toBe(3.5);
    expect(p1?.util).toBeCloseTo(0.35, 6);
  });

  it("returns zeroed rates instead of NaN for an empty input", () => {
    const m = computeMetrics([], NOW);
    expect(m.fillRate).toBe(0);
    expect(m.noShowRate).toBe(0);
    expect(m.cancelRate).toBe(0);
    expect(m.newPatientConversion).toBe(0);
    expect(m.revenuePerSlot).toBe(0);
    expect(m.leadTimeDaysP50).toBe(0);
    expect(m.providerUtilization).toEqual([]);
  });
});

describe("percentile", () => {
  it("interpolates p50 and p90 over lead times", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(values, 0.5)).toBeCloseTo(5.5, 6);
    expect(percentile(values, 0.9)).toBeCloseTo(9.1, 6);
  });

  it("handles single-element and empty inputs", () => {
    expect(percentile([42], 0.9)).toBe(42);
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe("sliceBy", () => {
  const appts: AppointmentRecord[] = [
    appt({ id: "s1", providerId: "dr-a", status: "completed", startAt: new Date("2026-05-20T15:00:00.000Z"), endAt: new Date("2026-05-20T16:00:00.000Z") }),
    appt({ id: "s2", providerId: "dr-a", status: "no_show", startAt: new Date("2026-05-21T15:00:00.000Z"), endAt: new Date("2026-05-21T16:00:00.000Z") }),
    appt({ id: "s3", providerId: "dr-b", status: "completed", startAt: new Date("2026-05-22T15:00:00.000Z"), endAt: new Date("2026-05-22T16:00:00.000Z") }),
  ];

  it("groups metrics by provider with deterministic key ordering", () => {
    const slices = sliceBy(appts, "provider", NOW);
    expect(slices.map((s) => s.key)).toEqual(["dr-a", "dr-b"]);

    const drA = slices.find((s) => s.key === "dr-a");
    expect(drA?.metrics.fillRate).toBe(0.5); // 1 completed, 1 no_show
    const drB = slices.find((s) => s.key === "dr-b");
    expect(drB?.metrics.fillRate).toBe(1);
  });
});

describe("forecastDemand", () => {
  const appts: AppointmentRecord[] = [
    // 7 bookings inside the trailing 14d window ending at NOW.
    ...Array.from({ length: 7 }, (_, i) =>
      appt({
        id: `recent-${i}`,
        createdAt: new Date(`2026-05-2${i % 7}T09:00:00.000Z`),
      }),
    ),
    // Old booking outside the window — should not count.
    appt({ id: "old", createdAt: new Date("2026-01-01T09:00:00.000Z") }),
  ];

  it("scales projected demand linearly with horizon", () => {
    const f30 = forecastDemand(appts, NOW, 30);
    const f60 = forecastDemand(appts, NOW, 60);
    // 7 bookings / 14 days = 0.5 / day
    expect(f30.perDay).toBeCloseTo(0.5, 6);
    expect(f30.projected).toBeCloseTo(15, 6);
    expect(f60.projected).toBeCloseTo(30, 6);
  });

  it("exposes the three standard windows", () => {
    const w = forecastWindows(appts, NOW);
    expect(w.d30.projected).toBeCloseTo(15, 6);
    expect(w.d90.projected).toBeCloseTo(45, 6);
  });
});

describe("detectBottlenecks", () => {
  it("flags providers over the utilization threshold, hottest first", () => {
    const m = computeMetrics(
      [
        appt({ id: "b1", providerId: "hot", status: "completed", startAt: new Date("2026-05-20T08:00:00.000Z"), endAt: new Date("2026-05-20T18:00:00.000Z") }),
        appt({ id: "b2", providerId: "cool", status: "completed", startAt: new Date("2026-05-21T08:00:00.000Z"), endAt: new Date("2026-05-21T09:00:00.000Z") }),
      ],
      NOW,
      { capacityHours: 10 },
    );
    const flagged = detectBottlenecks(m); // hot util = 1.0, cool = 0.1
    expect(flagged.map((b) => b.providerId)).toEqual(["hot"]);
    expect(flagged[0].severity).toBe("critical");
  });
});

describe("actionTriggers", () => {
  it("fires when fill rate is below 0.70 for two consecutive weeks", () => {
    const triggers = actionTriggers([0.9, 0.65, 0.6, 0.8]);
    const rule = triggers[0];
    expect(rule.fired).toBe(true);
    expect(rule.rule).toContain("0.7");
  });

  it("does not fire on a single sub-floor week", () => {
    const triggers = actionTriggers([0.9, 0.65, 0.8, 0.62]);
    expect(triggers[0].fired).toBe(false);
  });
});

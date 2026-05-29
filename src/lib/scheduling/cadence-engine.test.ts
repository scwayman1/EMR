import { describe, expect, it } from "vitest";
import { nextDueDate, recommendCadence, type CadenceRecommendation } from "./cadence-engine";

describe("recommendCadence", () => {
  it("uses the chronic-pain maintenance standard cadence for routine physician follow-up", () => {
    const rec = recommendCadence({
      condition: "chronic_pain",
      phase: "maintenance",
      patientState: "CA",
      daysSinceCertIssued: 100,
    });

    expect(rec).toMatchObject({
      intervalDays: 90,
      modality: "video",
      inPersonRequired: false,
      overdueGraceDays: 30,
    });
    expect(rec.rationale).toContain("Chronic Pain");
    expect(rec.rationale).toContain("maintenance");
  });

  it("pulls required-renewal states into an in-person visit before certification expiry", () => {
    const rec = recommendCadence({
      condition: "chronic_pain",
      phase: "maintenance",
      patientState: "FL",
      daysSinceCertIssued: 350,
    });

    expect(rec.intervalDays).toBe(15);
    expect(rec.modality).toBe("in_person");
    expect(rec.inPersonRequired).toBe(true);
    expect(rec.rationale).toContain("Pulled in for cert renewal in FL");
  });

  it("never schedules renewal squeeze visits less than seven days out", () => {
    const rec = recommendCadence({
      condition: "epilepsy",
      phase: "maintenance",
      patientState: "PA",
      daysSinceCertIssued: 364,
    });

    expect(rec.intervalDays).toBe(7);
    expect(rec.modality).toBe("in_person");
    expect(rec.inPersonRequired).toBe(true);
  });

  it("respects positive clinician override days without dropping table grace-window policy", () => {
    const rec = recommendCadence({
      condition: "anxiety",
      phase: "titration",
      patientState: "CA",
      daysSinceCertIssued: 30,
      clinicianOverrideDays: 21,
    });

    expect(rec.intervalDays).toBe(21);
    expect(rec.modality).toBe("video");
    expect(rec.overdueGraceDays).toBe(5);
    expect(rec.rationale).toContain("Clinician override: 21 days");
  });
});

describe("nextDueDate", () => {
  const rec: CadenceRecommendation = {
    intervalDays: 14,
    modality: "video",
    inPersonRequired: false,
    rationale: "test cadence",
    overdueGraceDays: 3,
  };

  it("computes the next due date and stays inside the grace window", () => {
    const result = nextDueDate(
      new Date("2026-05-01T12:00:00.000Z"),
      rec,
      new Date("2026-05-17T12:00:00.000Z"),
    );

    expect(result.dueAt.toISOString()).toBe("2026-05-15T12:00:00.000Z");
    expect(result.overdue).toBe(false);
    expect(result.daysOverdue).toBe(2);
  });

  it("marks patients overdue only after the grace window has elapsed", () => {
    const result = nextDueDate(
      new Date("2026-05-01T12:00:00.000Z"),
      rec,
      new Date("2026-05-19T12:00:00.000Z"),
    );

    expect(result.overdue).toBe(true);
    expect(result.daysOverdue).toBe(4);
  });
});

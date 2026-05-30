import { describe, expect, it } from "vitest";
import { summarizeVisitReadiness } from "./visit-readiness";

const TODAY = new Date("2026-05-29T15:00:00.000Z");

function enc(briefingContext: Record<string, unknown> | null, over: Record<string, unknown> = {}) {
  return {
    status: "scheduled" as const,
    scheduledFor: TODAY,
    startedAt: null,
    briefingContext: briefingContext as never,
    ...over,
  };
}

describe("summarizeVisitReadiness", () => {
  it("reports no encounter when given null", () => {
    const r = summarizeVisitReadiness(null);
    expect(r.hasEncounter).toBe(false);
    expect(r.handoffLine).toMatch(/no.*encounter|not.*scheduled/i);
  });

  it("surfaces rooming/pre-visit signals from briefingContext", () => {
    const r = summarizeVisitReadiness(
      enc({
        intakeCompleted: true,
        patientConfirmedAt: "2026-05-28T10:00:00.000Z",
        patientSummary: "62yo with chronic low back pain...",
        patientDemeanor: "calm",
        reminderSentAt: "2026-05-29T08:00:00.000Z",
      }),
    );
    expect(r.hasEncounter).toBe(true);
    expect(r.intakeCompleted).toBe(true);
    expect(r.patientConfirmed).toBe(true);
    expect(r.briefingReady).toBe(true);
    expect(r.patientDemeanor).toBe("calm");
    expect(r.reminderSent).toBe(true);
  });

  it("treats a started encounter as started", () => {
    const r = summarizeVisitReadiness(enc(null, { status: "in_progress", startedAt: TODAY }));
    expect(r.started).toBe(true);
  });

  it("does not invent signals when briefingContext is empty", () => {
    const r = summarizeVisitReadiness(enc({}));
    expect(r.intakeCompleted).toBe(false);
    expect(r.patientConfirmed).toBe(false);
    expect(r.briefingReady).toBe(false);
    expect(r.patientDemeanor).toBeNull();
    expect(r.reminderSent).toBe(false);
  });

  it("checks the actual field, not mere presence of other context", () => {
    // Context has rooming data but NO patientSummary → briefing is not ready,
    // and an empty-string summary must not count as ready either.
    const r = summarizeVisitReadiness(
      enc({ patientDemeanor: "calm", intakeCompleted: true, patientSummary: "" }),
    );
    expect(r.briefingReady).toBe(false);
    expect(r.intakeCompleted).toBe(true);
    expect(r.patientDemeanor).toBe("calm");
  });

  it("builds a human handoff line mentioning the ready items", () => {
    const r = summarizeVisitReadiness(
      enc({ intakeCompleted: true, patientSummary: "x", patientDemeanor: "anxious" }),
    );
    expect(r.handoffLine.toLowerCase()).toContain("intake");
    expect(r.handoffLine.toLowerCase()).toContain("briefing");
    expect(r.handoffLine.toLowerCase()).toContain("anxious");
  });
});

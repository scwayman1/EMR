import { describe, expect, it } from "vitest";
import { DEMO_FACTS, renderReport, type ReportSpec } from "./reports";

describe("renderReport", () => {
  it("counts unique patients for patient_count metric", () => {
    const report = renderReport({
      id: "r1",
      title: "Patients by condition",
      kind: "bar",
      dimension: "conditions",
      metric: "patient_count",
    });
    const sumOfRows = report.rows.reduce((a, r) => a + r.value, 0);
    const uniquePatients = new Set(DEMO_FACTS.map((f) => f.patientId)).size;
    expect(sumOfRows).toBe(uniquePatients);
  });

  it("averages pain reduction per condition", () => {
    const report = renderReport({
      id: "r2",
      title: "Pain reduction by condition",
      kind: "bar",
      dimension: "conditions",
      metric: "avg_pain_reduction",
    });
    const chronicPain = report.rows.find((r) => r.label === "Chronic pain");
    expect(chronicPain).toBeDefined();
    expect(chronicPain!.value).toBeGreaterThan(0);
  });

  it("sorts month dimension chronologically", () => {
    const report = renderReport({
      id: "r3",
      title: "Monthly rx count",
      kind: "line",
      dimension: "month",
      metric: "rx_count",
    });
    const labels = report.rows.map((r) => r.label);
    const sorted = [...labels].sort();
    expect(labels).toEqual(sorted);
  });

  it("appends forecast rows for projection reports", () => {
    const spec: ReportSpec = {
      id: "r4",
      title: "Revenue projection",
      kind: "projection",
      dimension: "month",
      metric: "revenue_cents",
      horizonMonths: 3,
    };
    const report = renderReport(spec);
    const forecasts = report.rows.filter((r) => r.forecast);
    expect(forecasts.length).toBe(3);
    expect(forecasts[0].forecast).toBe(true);
  });

  it("computes total / mean / stddev from observed rows only", () => {
    const report = renderReport({
      id: "r5",
      title: "Revenue projection w/ stats",
      kind: "projection",
      dimension: "month",
      metric: "revenue_cents",
      horizonMonths: 2,
    });
    expect(report.total).toBeGreaterThan(0);
    expect(report.mean).toBeGreaterThan(0);
    expect(report.stddev).toBeGreaterThanOrEqual(0);
  });
});

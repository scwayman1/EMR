import { describe, it, expect } from "vitest";
import { analyzeForMips } from "../mips-agent";

describe("MIPS Data Extrapolation Agent (EMR-042)", () => {
  it("should extract met measures from clinical notes", async () => {
    const notes = [
      "Patient is a 45yo male.",
      "Vitals: BMI 24.5, BP 120/80.",
      "Patient denies tobacco use."
    ];
    
    const report = await analyzeForMips("pat_123", notes);
    
    expect(report.patientId).toBe("pat_123");
    expect(report.eligibleMeasures).toBe(3);
    expect(report.metMeasures).toBe(2);
    expect(report.overallScore).toBe(67);
    
    const bmiMeasure = report.measures.find(m => m.id === "MIPS-128");
    expect(bmiMeasure?.isMet).toBe(true);
    
    const fallMeasure = report.measures.find(m => m.id === "MIPS-318");
    expect(fallMeasure?.isMet).toBe(false);
  });
});

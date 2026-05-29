import { describe, expect, it } from "vitest";
import {
  coerceVitals,
  composeObjectiveBody,
  formatVitalsLine,
  isObjectiveEmpty,
  type Vitals,
} from "../objective-vitals";

const full: Vitals = {
  systolic: 120,
  diastolic: 80,
  heartRate: 72,
  temperature: 98.6,
  tempUnit: "F",
  respiratoryRate: 16,
  spo2: 98,
  weight: 180,
  weightUnit: "lb",
  pain: 3,
};

describe("formatVitalsLine", () => {
  it("formats a complete set of vitals", () => {
    expect(formatVitalsLine(full)).toBe(
      "BP 120/80 · HR 72 · Temp 98.6°F · RR 16 · SpO2 98% · Wt 180 lb · Pain 3/10",
    );
  });

  it("omits blank fields", () => {
    expect(formatVitalsLine({ heartRate: 72, spo2: 98 })).toBe("HR 72 · SpO2 98%");
  });

  it("renders a one-sided BP when only systolic is present", () => {
    expect(formatVitalsLine({ systolic: 120 })).toBe("BP 120/–");
  });

  it("honors metric units", () => {
    expect(formatVitalsLine({ temperature: 37, tempUnit: "C", weight: 80, weightUnit: "kg" })).toBe(
      "Temp 37°C · Wt 80 kg",
    );
  });

  it("returns empty string when nothing is recorded", () => {
    expect(formatVitalsLine({})).toBe("");
  });
});

describe("composeObjectiveBody", () => {
  it("leads with a bold vitals line, then the exam", () => {
    expect(composeObjectiveBody({ vitals: { heartRate: 72 }, exam: "Alert, NAD." })).toBe(
      "**Vitals:** HR 72\n\nAlert, NAD.",
    );
  });

  it("renders exam alone when no vitals were taken", () => {
    expect(composeObjectiveBody({ vitals: {}, exam: "Lungs clear." })).toBe("Lungs clear.");
  });

  it("renders vitals alone when there's no exam text", () => {
    expect(composeObjectiveBody({ vitals: { spo2: 99 }, exam: "  " })).toBe("**Vitals:** SpO2 99%");
  });

  it("is empty when nothing is provided", () => {
    expect(composeObjectiveBody({ vitals: {}, exam: "" })).toBe("");
  });
});

describe("isObjectiveEmpty", () => {
  it("is true only when both vitals and exam are blank", () => {
    expect(isObjectiveEmpty({ vitals: {}, exam: "" })).toBe(true);
    expect(isObjectiveEmpty({ vitals: { heartRate: 72 }, exam: "" })).toBe(false);
    expect(isObjectiveEmpty({ vitals: {}, exam: "note" })).toBe(false);
  });
});

describe("coerceVitals", () => {
  it("narrows a metadata-shaped object and defaults units", () => {
    const v = coerceVitals({ systolic: 118, diastolic: 76, spo2: 97 });
    expect(v.systolic).toBe(118);
    expect(v.diastolic).toBe(76);
    expect(v.spo2).toBe(97);
    expect(v.tempUnit).toBe("F");
    expect(v.weightUnit).toBe("lb");
    expect(v.heartRate).toBeNull();
  });

  it("drops non-finite/garbage values to null", () => {
    const v = coerceVitals({ heartRate: "fast", systolic: NaN, pain: 4 });
    expect(v.heartRate).toBeNull();
    expect(v.systolic).toBeNull();
    expect(v.pain).toBe(4);
  });

  it("returns empties for non-object input", () => {
    expect(coerceVitals(null).systolic).toBeNull();
    expect(coerceVitals("nope").heartRate).toBeNull();
  });
});

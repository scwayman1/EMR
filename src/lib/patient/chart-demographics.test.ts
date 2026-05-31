import { describe, expect, it } from "vitest";
import {
  formatDemographicValue,
  formatEmergencyContact,
  formatInsuranceMemberId,
  formatInsurancePlan,
} from "./chart-demographics";

describe("chart demographics display helpers", () => {
  it("formats structured insurance without returning a React-hostile object", () => {
    const plan = formatInsurancePlan({
      insurance: {
        providerName: "Blue Shield",
        planName: "Gold PPO",
        memberId: "MEM-123",
      },
    });

    expect(plan).toBe("Blue Shield - Gold PPO");
  });

  it("finds a member id inside structured insurance", () => {
    expect(
      formatInsuranceMemberId({
        insurance: { providerName: "Blue Shield", memberId: "MEM-123" },
      }),
    ).toBe("MEM-123");
  });

  it("keeps demographic text renderable when intake stores arrays or objects", () => {
    expect(formatDemographicValue(["Asian", "White"])).toBe("Asian, White");
    expect(formatDemographicValue({ label: "Declined" })).toBe("Declined");
    expect(formatDemographicValue({ unexpected: true })).toBe("Not recorded");
  });

  it("formats structured emergency contacts defensively", () => {
    expect(formatEmergencyContact({ name: "Ava", phone: "555-0100" })).toBe(
      "Ava - 555-0100",
    );
    expect(formatEmergencyContact({ name: "Ava" })).toBe("Ava");
  });
});

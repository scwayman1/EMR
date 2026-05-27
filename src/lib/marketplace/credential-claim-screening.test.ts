import { describe, it, expect } from "vitest";
import { screenCredentialClaims } from "./credential-claim-screening";

describe("screenCredentialClaims", () => {
  it("returns clean for empty input", () => {
    const result = screenCredentialClaims("");
    expect(result.verdict).toBe("clean");
    expect(result.flags).toEqual([]);
  });

  it("returns clean for safer alternative phrasing", () => {
    const result = screenCredentialClaims(
      "Curated by our medical desk for product quality and lab transparency.",
    );
    expect(result.verdict).toBe("clean");
  });

  it.each([
    ["This product is doctor recommended for sleep.", "doctor recommended"],
    ["Try our doctor-recommended blend.", "doctor-recommended"],
    ["Backed by a doctor's recommendation.", "doctor's recommendation"],
    ["Backed by a doctor’s recommendation.", "doctor’s recommendation"],
    ["A clinician-approved formulation.", "clinician-approved"],
    ["Physician formulated for evening calm.", "Physician formulated"],
    ["Used in my practice with great results.", "used in my practice"],
    ["I recommend this to my patients regularly.", "I recommend this to my patients"],
  ])("flags banned credential phrase: %s", (input, expectedTerm) => {
    const result = screenCredentialClaims(input);
    expect(result.verdict).toBe("flagged");
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.flags[0].term.toLowerCase()).toContain(expectedTerm.toLowerCase());
    expect(result.flags[0].saferAlternative).toBeTruthy();
  });

  it("flags drug-claim phrasing inside the credential screener too", () => {
    const result = screenCredentialClaims("This product cures chronic pain.");
    expect(result.verdict).toBe("flagged");
    expect(result.flags[0].saferAlternative).toMatch(/normal bodily functions|routines/i);
  });

  it("returns multiple flags when multiple banned phrases appear", () => {
    const result = screenCredentialClaims(
      "Doctor recommended. I recommend this to my patients. Used in my practice.",
    );
    expect(result.flags.length).toBeGreaterThanOrEqual(3);
  });
});

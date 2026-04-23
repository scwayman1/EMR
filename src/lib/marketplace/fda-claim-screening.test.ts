import { describe, expect, it } from "vitest";

import { screenProductDescription } from "./fda-claim-screening";

const PROHIBITED_CASES = [
  "Our formula treats anxiety disorder quickly.",
  "Clinically shown to cure depression symptoms.",
  "Prevents seizures while you sleep.",
  "Diagnoses ADHD early through daily use.",
  "Mitigates chronic pain flare-ups overnight.",
  "Helps heal arthritis pain in joints.",
  "Natural remedy for Crohn's and colitis.",
  "Alleviates Parkinson's tremors in 30 minutes.",
  "Eliminates migraine disorder attacks.",
  "Promotes relief of chronic pain and inflammation.",
];

const ALLOWED_CASES = [
  "Supports a healthy stress response and calm mood.",
  "Promotes restful sleep and nightly wind-down.",
  "Helps support post-workout recovery and balance.",
  "Maintains everyday focus and emotional wellness.",
  "May help with relaxation after a long day.",
];

const EDGE_CASES = [
  "Our founder beat cancer years ago; this product supports relaxation.",
  "Learn how to prevent burnout by sleeping better.",
  "Encourages calm and may help with occasional tension.",
  "Customers mention relief after workouts.",
  "Supports healthy inflammatory response for active adults.",
];

describe("screenProductDescription", () => {
  it("flags every prohibited corpus phrase (zero false negatives)", () => {
    for (const sample of PROHIBITED_CASES) {
      const result = screenProductDescription(sample);
      expect(result.verdict, sample).toBe("flagged");
      expect(result.flags.length, sample).toBeGreaterThan(0);
    }
  });

  it("keeps allowed framing mostly clean (<20% false positives)", () => {
    const flagged = ALLOWED_CASES.map((sample) => screenProductDescription(sample)).filter(
      (result) => result.verdict === "flagged",
    );

    expect(flagged.length / ALLOWED_CASES.length).toBeLessThan(0.2);
  });

  it("exercises edge corpus without crashing and keeps high precision", () => {
    const flagged = EDGE_CASES.map((sample) => screenProductDescription(sample)).filter(
      (result) => result.verdict === "flagged",
    );

    expect(flagged.length).toBeLessThanOrEqual(2);
  });

  it("returns offsets and categories for flagged phrases", () => {
    const sample = "This tincture treats anxiety disorder naturally.";
    const result = screenProductDescription(sample);

    expect(result.verdict).toBe("flagged");
    expect(result.flags.some((f) => f.category === "prohibited_verb")).toBe(true);
    expect(result.flags.some((f) => f.category === "prohibited_condition")).toBe(true);
    expect(result.flags.every((f) => f.offset >= 0 && f.length > 0)).toBe(true);
  });
});

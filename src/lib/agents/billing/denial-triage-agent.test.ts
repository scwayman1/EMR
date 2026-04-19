import { describe, expect, it } from "vitest";
import {
  buildDenialTriagePlan,
  dueDaysForUrgency,
  isTriageEligible,
  TRIAGE_ELIGIBLE_STATUSES,
} from "./denial-triage-agent";
import { classifyDenial, NEXT_ACTION_LABEL } from "@/lib/billing/denials";

// ---------------------------------------------------------------------------
// Denial Triage Agent — pure helper tests
// ---------------------------------------------------------------------------
// The Prisma-heavy run() method is skipped; these tests cover the two
// extracted decision helpers (dueDaysForUrgency, isTriageEligible,
// buildDenialTriagePlan) plus the underlying classifyDenial rules
// the agent relies on.

describe("classifyDenial (CARC/denial reason mapping)", () => {
  it("classifies auth-flavored reasons into authorization / high urgency", () => {
    const entry = classifyDenial("Prior auth not on file for this service");
    expect(entry.category).toBe("authorization");
    expect(entry.urgency).toBe("high");
    expect(entry.suggestedAction).toBe("obtain_authorization");
  });

  it("classifies eligibility denials", () => {
    const entry = classifyDenial("Patient not eligible on date of service");
    expect(entry.category).toBe("eligibility");
    expect(entry.urgency).toBe("high");
  });

  it("classifies medical necessity denials into submit_appeal", () => {
    const entry = classifyDenial("Service does not meet medical necessity");
    expect(entry.category).toBe("medical_necessity");
    expect(entry.suggestedAction).toBe("submit_appeal");
  });

  it("classifies timely filing as low urgency", () => {
    const entry = classifyDenial("Past timely filing window");
    expect(entry.category).toBe("timely_filing");
    expect(entry.urgency).toBe("low");
  });

  it("classifies duplicate denials into contact_payer", () => {
    const entry = classifyDenial("Duplicate claim — already processed");
    expect(entry.category).toBe("duplicate");
    expect(entry.suggestedAction).toBe("contact_payer");
  });

  it("classifies non-covered services into transfer_to_patient", () => {
    const entry = classifyDenial("Service is a plan exclusion (not covered)");
    expect(entry.category).toBe("non_covered_service");
    expect(entry.suggestedAction).toBe("transfer_to_patient");
  });

  it("is case-insensitive on keywords", () => {
    const entry = classifyDenial("PRIOR AUTH not supplied");
    expect(entry.category).toBe("authorization");
  });

  it("falls back to 'other' for unrecognized messages", () => {
    const entry = classifyDenial("Some cryptic payer note");
    expect(entry.category).toBe("other");
    expect(entry.suggestedAction).toBe("contact_payer");
    expect(entry.urgency).toBe("medium");
  });

  it("falls back to 'other' for null/undefined/empty reasons", () => {
    expect(classifyDenial(null).category).toBe("other");
    expect(classifyDenial(undefined).category).toBe("other");
    expect(classifyDenial("").category).toBe("other");
  });

  it("exposes a human label for every NextAction", () => {
    // Sanity: the label map must cover all suggestedActions used by the taxonomy.
    const reasons = [
      "prior auth",
      "not eligible",
      "coding error",
      "modifier",
      "medical necessity",
      "timely filing",
      "cob",
      "duplicate",
      "bundled",
      "not covered",
      "not credentialed",
    ];
    for (const r of reasons) {
      const entry = classifyDenial(r);
      expect(NEXT_ACTION_LABEL[entry.suggestedAction]).toBeTruthy();
    }
  });
});

describe("dueDaysForUrgency", () => {
  it("maps high → 2, medium → 5, low → 10", () => {
    expect(dueDaysForUrgency("high")).toBe(2);
    expect(dueDaysForUrgency("medium")).toBe(5);
    expect(dueDaysForUrgency("low")).toBe(10);
  });
});

describe("isTriageEligible", () => {
  it("allows denied and appealed", () => {
    expect(isTriageEligible("denied")).toBe(true);
    expect(isTriageEligible("appealed")).toBe(true);
  });

  it("rejects everything else", () => {
    for (const status of ["draft", "submitted", "accepted", "paid", "voided", ""]) {
      expect(isTriageEligible(status)).toBe(false);
    }
  });

  it("exposes the authoritative eligible-status list", () => {
    expect(TRIAGE_ELIGIBLE_STATUSES).toEqual(["denied", "appealed"]);
  });
});

describe("buildDenialTriagePlan", () => {
  const NOW = new Date("2026-04-19T09:00:00Z");

  it("returns a full triage packet for a known denial reason", () => {
    const plan = buildDenialTriagePlan("no authorization on file", NOW);
    expect(plan.category).toBe("authorization");
    expect(plan.urgency).toBe("high");
    expect(plan.dueDays).toBe(2);
    expect(plan.dueAt.getTime()).toBe(NOW.getTime() + 2 * 86_400_000);
  });

  it("defaults to the 'other' category and medium/10-day window for unknown reasons", () => {
    const plan = buildDenialTriagePlan("???", NOW);
    expect(plan.category).toBe("other");
    expect(plan.urgency).toBe("medium");
    expect(plan.dueDays).toBe(5);
    expect(plan.dueAt.getTime()).toBe(NOW.getTime() + 5 * 86_400_000);
  });

  it("handles null reason gracefully", () => {
    const plan = buildDenialTriagePlan(null, NOW);
    expect(plan.category).toBe("other");
  });
});

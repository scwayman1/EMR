import { describe, expect, it } from "vitest";
import {
  buildFallbackCollectionsMessage,
  computeTotalOwedCents,
  oldestStatementAgeDays,
  shouldSendCollectionsOutreach,
  shouldUseLlmDraft,
  TONE_BY_INTENT,
  toneForIntent,
  type CollectionsClaim,
} from "./patient-collections-agent";

// ---------------------------------------------------------------------------
// Patient Collections Agent — pure helper tests
// ---------------------------------------------------------------------------
// The agent's outreach decision logic lives in small pure helpers. These
// tests cover: owed-balance math, oldest-statement age, the
// pause-when-paid-in-full rule, LLM vs fallback routing, and the tone/
// template copy by intent.

function claim(
  overrides: Partial<CollectionsClaim> = {},
): CollectionsClaim {
  return {
    patientRespCents: 10000,
    payments: [],
    ...overrides,
  };
}

describe("computeTotalOwedCents", () => {
  it("returns 0 for no claims", () => {
    expect(computeTotalOwedCents([])).toBe(0);
  });

  it("returns patient responsibility when no payments have been made", () => {
    expect(
      computeTotalOwedCents([claim({ patientRespCents: 10000 })]),
    ).toBe(10000);
  });

  it("subtracts patient payments", () => {
    expect(
      computeTotalOwedCents([
        claim({
          patientRespCents: 10000,
          payments: [{ source: "patient", amountCents: 3000 }],
        }),
      ]),
    ).toBe(7000);
  });

  it("ignores insurance payments when computing patient-owed balance", () => {
    expect(
      computeTotalOwedCents([
        claim({
          patientRespCents: 10000,
          payments: [
            { source: "insurance", amountCents: 8000 },
            { source: "patient", amountCents: 2000 },
          ],
        }),
      ]),
    ).toBe(8000);
  });

  it("never goes negative on overpayment", () => {
    expect(
      computeTotalOwedCents([
        claim({
          patientRespCents: 1000,
          payments: [{ source: "patient", amountCents: 5000 }],
        }),
      ]),
    ).toBe(0);
  });

  it("sums across multiple claims", () => {
    expect(
      computeTotalOwedCents([
        claim({ patientRespCents: 5000 }),
        claim({
          patientRespCents: 3000,
          payments: [{ source: "patient", amountCents: 1000 }],
        }),
      ]),
    ).toBe(7000);
  });
});

describe("oldestStatementAgeDays", () => {
  const NOW = new Date("2026-04-19T09:00:00Z");

  it("returns 0 with no statements", () => {
    expect(oldestStatementAgeDays([], NOW)).toBe(0);
  });

  it("returns the age of the last element (list is DESC, so last is oldest)", () => {
    const stmts = [
      { createdAt: new Date(NOW.getTime() - 3 * 86_400_000) },
      { createdAt: new Date(NOW.getTime() - 7 * 86_400_000) },
      { createdAt: new Date(NOW.getTime() - 30 * 86_400_000) },
    ];
    expect(oldestStatementAgeDays(stmts, NOW)).toBe(30);
  });
});

describe("shouldSendCollectionsOutreach", () => {
  it("pauses outreach when the patient owes nothing", () => {
    expect(
      shouldSendCollectionsOutreach({
        totalOwedCents: 0,
        intent: "gentle_reminder",
      }),
    ).toEqual({ send: false, reason: "paid_in_full" });
  });

  it("pauses outreach when the owed amount is negative (overpayment)", () => {
    expect(
      shouldSendCollectionsOutreach({
        totalOwedCents: -100,
        intent: "second_notice",
      }),
    ).toMatchObject({ send: false, reason: "paid_in_full" });
  });

  it("allows outreach when there is a positive balance", () => {
    expect(
      shouldSendCollectionsOutreach({
        totalOwedCents: 2500,
        intent: "second_notice",
      }),
    ).toEqual({ send: true, intent: "second_notice" });
  });
});

describe("toneForIntent / TONE_BY_INTENT", () => {
  it("covers every intent in the enum", () => {
    const intents: Array<keyof typeof TONE_BY_INTENT> = [
      "gentle_reminder",
      "second_notice",
      "final_notice",
      "payment_plan_offer",
    ];
    for (const i of intents) {
      expect(toneForIntent(i)).toBeTruthy();
    }
  });

  it("final_notice tone mentions consequences", () => {
    expect(toneForIntent("final_notice")).toMatch(/consequences|collections/i);
  });

  it("gentle_reminder tone stays warm", () => {
    expect(toneForIntent("gentle_reminder")).toMatch(/warm|friendly/i);
  });
});

describe("shouldUseLlmDraft", () => {
  it("rejects empty strings", () => {
    expect(shouldUseLlmDraft("")).toBe(false);
  });

  it("rejects very short completions", () => {
    expect(shouldUseLlmDraft("too short")).toBe(false);
  });

  it("rejects the [stub] placeholder that the test model returns", () => {
    expect(shouldUseLlmDraft("[stub] this is a fake reply from a stub client")).toBe(false);
  });

  it("accepts a reasonable draft", () => {
    expect(
      shouldUseLlmDraft(
        "Hi Alex, you have an open balance of $125. You can pay online anytime. — Care team",
      ),
    ).toBe(true);
  });
});

describe("buildFallbackCollectionsMessage", () => {
  it("greets the patient by first name", () => {
    const msg = buildFallbackCollectionsMessage({
      firstName: "Alex",
      totalOwed: "$100.00",
      intent: "gentle_reminder",
    });
    expect(msg.startsWith("Hi Alex,")).toBe(true);
  });

  it("includes the total owed in every intent", () => {
    for (const intent of [
      "gentle_reminder",
      "second_notice",
      "final_notice",
      "payment_plan_offer",
    ] as const) {
      const msg = buildFallbackCollectionsMessage({
        firstName: "Pat",
        totalOwed: "$250.00",
        intent,
      });
      expect(msg).toContain("$250.00");
    }
  });

  it("avoids the forbidden 'delinquent' and 'past due account' phrasing", () => {
    for (const intent of [
      "gentle_reminder",
      "second_notice",
      "final_notice",
      "payment_plan_offer",
    ] as const) {
      const msg = buildFallbackCollectionsMessage({
        firstName: "Pat",
        totalOwed: "$50",
        intent,
      });
      expect(msg.toLowerCase()).not.toContain("delinquent");
      expect(msg.toLowerCase()).not.toContain("past due account");
    }
  });

  it("gentle_reminder copy is warm and not threatening", () => {
    const msg = buildFallbackCollectionsMessage({
      firstName: "Pat",
      totalOwed: "$50",
      intent: "gentle_reminder",
    });
    expect(msg.toLowerCase()).toContain("friendly reminder");
    expect(msg.toLowerCase()).not.toContain("collections");
  });

  it("payment_plan_offer mentions setting up a plan", () => {
    const msg = buildFallbackCollectionsMessage({
      firstName: "Pat",
      totalOwed: "$500",
      intent: "payment_plan_offer",
    });
    expect(msg.toLowerCase()).toContain("payment plan");
  });
});

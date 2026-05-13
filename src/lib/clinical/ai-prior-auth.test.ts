import { describe, expect, it } from "vitest";
import {
  reviewPriorAuth,
  summarizeCohort,
  MAX_AI_ATTEMPTS,
  type AiReviewInput,
  type PriorAuthAttempt,
} from "./ai-prior-auth";

// EMR-076 — AI-driven prior auth escalation

function input(overrides: Partial<AiReviewInput> = {}): AiReviewInput {
  return {
    serviceName: "Sertraline 100mg daily",
    icd10Codes: ["F32.2"],
    severityScores: [{ instrument: "PHQ-9", score: 18 }],
    priorTreatmentCount: 1,
    history: [],
    ...overrides,
  };
}

function denied(
  attempt: number,
  code: PriorAuthAttempt["denial"] extends infer T
    ? T extends { code: infer C }
      ? C
      : never
    : never,
): PriorAuthAttempt {
  return {
    attempt,
    submittedAt: `2026-05-${10 + attempt}T10:00:00Z`,
    denial: {
      code,
      deniedAt: `2026-05-${10 + attempt}T15:00:00Z`,
    },
  };
}

describe("reviewPriorAuth — first submission gating", () => {
  it("auto-submits a clean packet", () => {
    const a = reviewPriorAuth(input());
    expect(a.kind).toBe("submit_autonomously");
  });

  it("flags biologics for provider review before first submission", () => {
    const a = reviewPriorAuth(
      input({ serviceName: "Adalimumab 40mg SC q2wk", priorTreatmentCount: 3 }),
    );
    expect(a.kind).toBe("submit_with_provider_review");
    expect(a.kind === "submit_with_provider_review" && a.reason).toMatch(
      /high.risk/i,
    );
  });

  it("flags controlled substances even without name match", () => {
    const a = reviewPriorAuth(
      input({
        serviceName: "Custom compound",
        controlled: true,
        priorTreatmentCount: 2,
      }),
    );
    expect(a.kind).toBe("submit_with_provider_review");
  });

  it("flags missing step therapy when no prior treatments", () => {
    const a = reviewPriorAuth(
      input({ priorTreatmentCount: 0 }),
    );
    expect(a.kind).toBe("submit_with_provider_review");
    expect(
      a.kind === "submit_with_provider_review" && a.reason.toLowerCase(),
    ).toContain("step therapy");
  });

  it("does not require step therapy for cannabis services", () => {
    const a = reviewPriorAuth(
      input({
        serviceName: "Medical cannabis evaluation",
        priorTreatmentCount: 0,
        cannabis: true,
      }),
    );
    expect(a.kind).toBe("submit_autonomously");
  });
});

describe("reviewPriorAuth — appeal logic", () => {
  it("auto-appeals when first denial is for missing documentation", () => {
    const a = reviewPriorAuth(
      input({ history: [denied(1, "missing_documentation")] }),
    );
    expect(a.kind).toBe("auto_appeal");
    expect(a.kind === "auto_appeal" && a.addendum.length).toBeGreaterThan(0);
  });

  it("auto-appeal for step_therapy_not_met cites prior treatment count", () => {
    const a = reviewPriorAuth(
      input({
        priorTreatmentCount: 3,
        history: [denied(1, "step_therapy_not_met")],
      }),
    );
    if (a.kind !== "auto_appeal") throw new Error("expected auto_appeal");
    expect(a.addendum.some((x) => /3 prior treatments/i.test(x))).toBe(true);
  });

  it("escalates clinical-judgement denials to provider on first denial", () => {
    const a = reviewPriorAuth(
      input({ history: [denied(1, "not_medically_necessary")] }),
    );
    expect(a.kind).toBe("escalate_to_provider");
  });

  it("hard-stops experimental denials immediately", () => {
    const a = reviewPriorAuth(
      input({ history: [denied(1, "experimental")] }),
    );
    expect(a.kind).toBe("escalate_to_provider");
    expect(
      a.kind === "escalate_to_provider" && a.reason.toLowerCase(),
    ).toContain("experimental");
  });

  it("hard-stops eligibility issues immediately", () => {
    const a = reviewPriorAuth(
      input({ history: [denied(1, "patient_not_eligible")] }),
    );
    expect(a.kind).toBe("escalate_to_provider");
  });
});

describe("reviewPriorAuth — escalation cap", () => {
  it("escalates after MAX_AI_ATTEMPTS denials regardless of code", () => {
    const history: PriorAuthAttempt[] = [];
    for (let i = 1; i <= MAX_AI_ATTEMPTS; i++) {
      history.push(denied(i, "missing_documentation"));
    }
    const a = reviewPriorAuth(input({ history }));
    expect(a.kind).toBe("escalate_to_provider");
    expect(
      a.kind === "escalate_to_provider" && a.reason,
    ).toMatch(/AI cap reached|Second denial/i);
  });
});

describe("summarizeCohort", () => {
  it("counts each decided-action bucket", () => {
    const summary = summarizeCohort([
      {
        patientName: "A",
        serviceName: "Sertraline",
        attempt: 1,
        decidedAction: "submit_autonomously",
      },
      {
        patientName: "B",
        serviceName: "Humira",
        attempt: 1,
        decidedAction: "submit_with_provider_review",
      },
      {
        patientName: "C",
        serviceName: "Albuterol",
        attempt: 2,
        lastDenial: "missing_documentation",
        decidedAction: "auto_appeal",
      },
      {
        patientName: "D",
        serviceName: "Ozempic",
        attempt: 3,
        lastDenial: "not_medically_necessary",
        decidedAction: "escalate_to_provider",
      },
    ]);
    expect(summary.total).toBe(4);
    expect(summary.autonomous).toBe(1);
    expect(summary.appealing).toBe(1);
    expect(summary.highRisk).toBe(1);
    expect(summary.needsProvider).toBe(1);
  });

  it("returns zeros on an empty cohort", () => {
    const s = summarizeCohort([]);
    expect(s).toEqual({
      total: 0,
      autonomous: 0,
      appealing: 0,
      needsProvider: 0,
      highRisk: 0,
    });
  });
});

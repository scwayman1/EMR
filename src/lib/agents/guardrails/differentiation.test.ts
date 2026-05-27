// EMR-304 — guardrail eval harness as a vitest test. CI fails if any row's
// expected action diverges from what the rules engine returns.

import { describe, it, expect } from "vitest";
import {
  DIFFERENTIATION_EVAL_ROWS,
  evaluateGuardrails,
} from "./index";

describe("EMR-304 differentiation guardrails", () => {
  for (const row of DIFFERENTIATION_EVAL_ROWS) {
    it(`${row.id} — ${row.description}`, () => {
      const decision = evaluateGuardrails({
        audience: row.audience,
        surface: row.surface,
        utterance: row.utterance,
      });
      expect(decision.action).toBe(row.expectedAction);
      if (row.expectedRuleId) {
        expect(decision.ruleId).toBe(row.expectedRuleId);
      }
    });
  }

  it("default-allows benign small-talk", () => {
    const decision = evaluateGuardrails({
      audience: "consumer",
      surface: "ask-cindy",
      utterance: "hi cindy what does this site do?",
    });
    expect(decision.action).toBe("allow");
    expect(decision.ruleId).toBe("default-allow");
  });
});

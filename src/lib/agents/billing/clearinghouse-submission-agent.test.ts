import { describe, expect, it } from "vitest";
import {
  evaluateRetryGuard,
  SUBMISSION_COOLDOWN_MS,
  SUBMISSION_RETRY_LIMIT,
  type PriorSubmissionInput,
} from "./clearinghouse-submission-agent";

const NOW = new Date("2026-04-19T12:00:00Z");

function msAgo(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

function secondsAgo(s: number): Date {
  return msAgo(s * 1_000);
}

function minutesAgo(m: number): Date {
  return msAgo(m * 60_000);
}

function submissions(...whens: Date[]): PriorSubmissionInput[] {
  return whens.map((submittedAt) => ({ submittedAt }));
}

describe("evaluateRetryGuard", () => {
  it("allows the first-ever submission (no priors)", () => {
    const decision = evaluateRetryGuard([], NOW);
    expect(decision.outcome).toBe("allow");
    if (decision.outcome === "allow") {
      expect(decision.attemptNumber).toBe(0);
    }
  });

  it("allows a second submission when the first is well outside the cooldown", () => {
    const decision = evaluateRetryGuard(
      submissions(minutesAgo(30)),
      NOW,
    );
    expect(decision.outcome).toBe("allow");
    if (decision.outcome === "allow") {
      expect(decision.attemptNumber).toBe(1);
    }
  });

  it("blocks when exactly the retry limit has been reached", () => {
    // 3 prior submissions, all outside cooldown — still blocked by cap.
    const priors = submissions(
      minutesAgo(60),
      minutesAgo(30),
      minutesAgo(10),
    );
    const decision = evaluateRetryGuard(priors, NOW);
    expect(decision.outcome).toBe("retry_limit_exceeded");
    if (decision.outcome === "retry_limit_exceeded") {
      expect(decision.priorCount).toBe(SUBMISSION_RETRY_LIMIT);
    }
  });

  it("blocks when prior submissions exceed the retry limit", () => {
    const priors = submissions(
      minutesAgo(120),
      minutesAgo(90),
      minutesAgo(60),
      minutesAgo(30),
    );
    const decision = evaluateRetryGuard(priors, NOW);
    expect(decision.outcome).toBe("retry_limit_exceeded");
    if (decision.outcome === "retry_limit_exceeded") {
      expect(decision.priorCount).toBe(4);
    }
  });

  it("retry-limit check takes precedence over cooldown", () => {
    // 3 priors, most recent was 5s ago — limit exceeded wins over cooldown.
    const priors = submissions(
      minutesAgo(60),
      minutesAgo(30),
      secondsAgo(5),
    );
    const decision = evaluateRetryGuard(priors, NOW);
    expect(decision.outcome).toBe("retry_limit_exceeded");
  });

  it("throws cooldown when last submission is within 60s", () => {
    const lastSubmittedAt = secondsAgo(30); // 30s ago — inside window
    const decision = evaluateRetryGuard(
      submissions(minutesAgo(10), lastSubmittedAt),
      NOW,
    );
    expect(decision.outcome).toBe("cooldown");
    if (decision.outcome === "cooldown") {
      expect(decision.priorCount).toBe(2);
      expect(decision.msSinceLast).toBe(30_000);
      expect(decision.lastSubmittedAt.getTime()).toBe(lastSubmittedAt.getTime());
    }
  });

  it("throws cooldown even when the most-recent prior is not first in the array", () => {
    // Array ordered oldest-first; the helper must still pick the newest.
    const recent = secondsAgo(10);
    const decision = evaluateRetryGuard(
      submissions(minutesAgo(45), recent, minutesAgo(20)),
      NOW,
    );
    // 3 priors → retry limit wins. Reduce to 2 so cooldown can surface.
    expect(decision.outcome).toBe("retry_limit_exceeded");

    const decision2 = evaluateRetryGuard(
      submissions(minutesAgo(45), recent),
      NOW,
    );
    expect(decision2.outcome).toBe("cooldown");
    if (decision2.outcome === "cooldown") {
      expect(decision2.msSinceLast).toBe(10_000);
    }
  });

  it("allows submission exactly at the cooldown boundary", () => {
    // msSinceLast === SUBMISSION_COOLDOWN_MS → NOT < cooldown → allow.
    const decision = evaluateRetryGuard(
      submissions(msAgo(SUBMISSION_COOLDOWN_MS)),
      NOW,
    );
    expect(decision.outcome).toBe("allow");
  });

  it("allows submission just past the cooldown window", () => {
    const decision = evaluateRetryGuard(
      submissions(msAgo(SUBMISSION_COOLDOWN_MS + 1_000)),
      NOW,
    );
    expect(decision.outcome).toBe("allow");
    if (decision.outcome === "allow") {
      expect(decision.attemptNumber).toBe(1);
    }
  });

  it("blocks cooldown just under the 60s window", () => {
    const decision = evaluateRetryGuard(
      submissions(msAgo(SUBMISSION_COOLDOWN_MS - 1)),
      NOW,
    );
    expect(decision.outcome).toBe("cooldown");
  });

  it("reports the correct attemptNumber on allow", () => {
    // 2 priors outside cooldown → next attempt is attempt #2 (0-indexed).
    const decision = evaluateRetryGuard(
      submissions(minutesAgo(60), minutesAgo(30)),
      NOW,
    );
    expect(decision.outcome).toBe("allow");
    if (decision.outcome === "allow") {
      expect(decision.attemptNumber).toBe(2);
    }
  });
});

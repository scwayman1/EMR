import { describe, expect, it } from "vitest";
import {
  backoffWithJitter,
  classifyFailure,
  consumeTokenBucket,
  GatewayAuthError,
  runWithRetry,
} from "./gateway";

// EMR-217 — pure helpers (rate limit, backoff, retry, failure classification)

describe("consumeTokenBucket", () => {
  const cfg = { capacity: 5, refillPerSec: 1 };

  it("grants when tokens available, decrements", () => {
    const out = consumeTokenBucket({ tokens: 5, lastRefillMs: 0 }, cfg, 1, 0);
    expect(out.granted).toBe(true);
    expect(out.state.tokens).toBe(4);
  });

  it("denies + reports waitMs when empty", () => {
    const out = consumeTokenBucket({ tokens: 0, lastRefillMs: 1000 }, cfg, 1, 1000);
    expect(out.granted).toBe(false);
    expect(out.waitMs).toBeGreaterThan(0);
  });

  it("refills based on elapsed time, capped at capacity", () => {
    const out = consumeTokenBucket({ tokens: 0, lastRefillMs: 0 }, cfg, 1, 60_000);
    expect(out.granted).toBe(true);
    // refilled to 60 (1/sec * 60s) then capped at capacity 5, then -1 for cost
    expect(out.state.tokens).toBe(4);
  });
});

describe("backoffWithJitter", () => {
  it("never exceeds the cap", () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const v = backoffWithJitter({ attempt, baseMs: 100, capMs: 1000, random: () => 0.999 });
      expect(v).toBeLessThanOrEqual(1000);
    }
  });

  it("returns 0 when random returns 0", () => {
    expect(backoffWithJitter({ attempt: 5, random: () => 0 })).toBe(0);
  });
});

describe("runWithRetry", () => {
  it("returns the first ok response", async () => {
    let calls = 0;
    const out = await runWithRetry(
      async () => {
        calls++;
        return { ok: true, status: 200, body: "ok" };
      },
      async () => {},
      { maxAttempts: 3, baseMs: 1, capMs: 1, sleeper: async () => {} },
    );
    expect(out.body).toBe("ok");
    expect(calls).toBe(1);
  });

  it("refreshes auth on 401 then retries", async () => {
    let auth = 0;
    let calls = 0;
    const out = await runWithRetry(
      async () => {
        calls++;
        return calls === 1
          ? { ok: false, status: 401, body: "unauthorized" }
          : { ok: true, status: 200, body: "ok" };
      },
      async () => {
        auth++;
      },
      { maxAttempts: 3, baseMs: 1, capMs: 1, sleeper: async () => {} },
    );
    expect(auth).toBe(1);
    expect(out.body).toBe("ok");
  });

  it("retries 5xx with backoff up to maxAttempts", async () => {
    let calls = 0;
    const out = await runWithRetry(
      async () => {
        calls++;
        return { ok: false, status: 503, body: "down" };
      },
      async () => {},
      { maxAttempts: 4, baseMs: 1, capMs: 1, sleeper: async () => {}, random: () => 0 },
    );
    expect(calls).toBe(4);
    expect(out.body).toBe("down");
  });

  it("does not retry 4xx (non-401/429)", async () => {
    let calls = 0;
    await runWithRetry(
      async () => {
        calls++;
        return { ok: false, status: 422, body: "bad" };
      },
      async () => {},
      { maxAttempts: 3, baseMs: 1, capMs: 1, sleeper: async () => {} },
    );
    expect(calls).toBe(1);
  });
});

describe("classifyFailure", () => {
  it("auth on GatewayAuthError", () => {
    expect(classifyFailure({ err: new GatewayAuthError("nope") })).toBe("auth");
  });
  it("timeout on Error message", () => {
    expect(classifyFailure({ err: new Error("ETIMEDOUT") })).toBe("timeout");
  });
  it("rate_limit_exhausted on 429", () => {
    expect(classifyFailure({ status: 429 })).toBe("rate_limit_exhausted");
  });
  it("permanent_rejection on 4xx", () => {
    expect(classifyFailure({ status: 422 })).toBe("permanent_rejection");
  });
  it("network as final fallback", () => {
    expect(classifyFailure({})).toBe("network");
  });
});

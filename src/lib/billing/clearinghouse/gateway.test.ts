import { describe, expect, it } from "vitest";
import {
  availityHttpsConfig,
  backoffWithJitter,
  changeHealthcareHttpsConfig,
  classifyFailure,
  consumeTokenBucket,
  GatewayAuthError,
  runWithRetry,
  SftpClearinghouseAdapter,
  type SftpClient,
  waystarHttpsConfig,
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

describe("SftpClearinghouseAdapter", () => {
  function fakeClient(opts: {
    listing?: Array<{ name: string; modifyTime: number }>;
    files?: Record<string, string>;
    onPut?: (buf: Buffer, path: string) => void;
  }): SftpClient & { puts: Array<{ path: string; size: number }> } {
    const puts: Array<{ path: string; size: number }> = [];
    return {
      puts,
      connect: async () => {},
      end: async () => {},
      put: async (buf, path) => {
        puts.push({ path, size: buf.length });
        opts.onPut?.(buf, path);
      },
      list: async () => opts.listing ?? [],
      get: async (path) => Buffer.from(opts.files?.[path] ?? "", "utf8"),
      delete: async () => {},
    };
  }

  it("uploads the EDI payload to the outbound directory on submit", async () => {
    const client = fakeClient({});
    const adapter = new SftpClearinghouseAdapter({
      name: "office_ally",
      outboundDir: "/inbound/",
      inboundDir: "/outbound/",
      filePrefix: "GP",
      client: () => client,
    });
    const res = await adapter.submit({ ediPayload: "ISA*~", correlationId: "ABC123" });
    expect(client.puts[0].path).toBe("/inbound/GP-ABC123.edi");
    expect(res.syncStatus).toBe("pending");
    expect(res.gatewayTrackingId).toBe("ABC123");
  });

  it("classifies inbound 835 / 277CA / 999 files on poll and advances cursor", async () => {
    const client = fakeClient({
      listing: [
        { name: "claim_835_001.edi", modifyTime: 100 },
        { name: "claim_277CA_002.edi", modifyTime: 200 },
        { name: "old.edi", modifyTime: 50 },
      ],
      files: {
        "/outbound/claim_835_001.edi": "ISA*~ST*835*0001~SE*1*0001~",
        "/outbound/claim_277CA_002.edi": "ISA*~ST*277*0001~BHT*0010*08*ABC123~SE*1*0001~",
        "/outbound/old.edi": "",
      },
    });
    const adapter = new SftpClearinghouseAdapter({
      name: "office_ally",
      outboundDir: "/inbound",
      inboundDir: "/outbound",
      filePrefix: "GP",
      client: () => client,
    });
    const res = await adapter.poll("60");
    expect(res.documents.map((d) => d.type).sort()).toEqual(["277CA", "835"]);
    expect(res.documents.find((d) => d.type === "277CA")?.correlationId).toBe("ABC123");
    expect(res.nextCursor).toBe("200");
  });
});

describe("named gateway-config factories", () => {
  it("availityHttpsConfig requires client id + secret", () => {
    expect(availityHttpsConfig({})).toBeNull();
    const cfg = availityHttpsConfig({ AVAILITY_CLIENT_ID: "id", AVAILITY_CLIENT_SECRET: "s" });
    expect(cfg?.name).toBe("availity");
    expect(cfg?.paths.submit).toContain("/availity/v1/coverages/submissions");
  });
  it("waystarHttpsConfig honors path overrides", () => {
    const cfg = waystarHttpsConfig({
      WAYSTAR_CLIENT_ID: "id",
      WAYSTAR_CLIENT_SECRET: "s",
      WAYSTAR_SUBMIT_PATH: "/custom/submit",
    });
    expect(cfg?.paths.submit).toBe("/custom/submit");
  });
  it("changeHealthcareHttpsConfig defaults to medicalnetwork v3", () => {
    const cfg = changeHealthcareHttpsConfig({
      CHANGE_HEALTHCARE_CLIENT_ID: "id",
      CHANGE_HEALTHCARE_CLIENT_SECRET: "s",
    });
    expect(cfg?.paths.submit).toContain("medicalnetwork/professionalclaims/v3");
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

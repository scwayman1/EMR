import { describe, it, expect, vi } from "vitest";
import { PayabliClient, PayabliApiError, generateIdempotencyKey } from "./client";

const baseCfg = {
  apiKey: "sk-payabli-secret-XYZ",
  entryPoint: "leafjourney-hemp-test",
  baseUrl: "https://api-sandbox.payabli.com",
  maxRetries: 2,
  backoffBaseMs: 1, // keep tests fast
};

const sampleSale = {
  entryPoint: "leafjourney-hemp-test",
  idempotencyKey: "test-key-1",
  paymentDetails: { totalAmount: 1.0 },
  paymentMethod: { method: "card-token", storedMethodsId: "tok_abc" } as const,
  customer: { customerNumber: "cust_1" },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PayabliClient.headers", () => {
  it("sends the API key in requestToken (not Authorization, not body)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ responseCode: 0 }));
    const client = new PayabliClient({ ...baseCfg, fetchImpl });
    await client.getsale(sampleSale);

    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["requestToken"]).toBe(baseCfg.apiKey);
    // Body must NOT echo the key.
    expect(JSON.stringify(init.body)).not.toContain(baseCfg.apiKey);
  });

  it("sends an Idempotency-Key header on POSTs", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ responseCode: 0 }));
    const client = new PayabliClient({ ...baseCfg, fetchImpl });
    await client.getsale(sampleSale);
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("test-key-1");
  });
});

describe("PayabliClient.getsale", () => {
  it("retries on 503 and eventually succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream busy", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ responseCode: 0, referenceId: "txn_1" }));
    const client = new PayabliClient({ ...baseCfg, fetchImpl });
    const result = await client.getsale(sampleSale);
    expect(result.responseCode).toBe(0);
    expect(result.referenceId).toBe("txn_1");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx (caller error)", async () => {
    // Use .mockImplementation so each call gets a fresh Response
    // (Response bodies can only be consumed once).
    const fetchImpl = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('{"error":"bad"}', { status: 400 })));
    const client = new PayabliClient({ ...baseCfg, fetchImpl });
    await expect(client.getsale(sampleSale)).rejects.toThrow(PayabliApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 (rate limited)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ responseCode: 0 }));
    const client = new PayabliClient({ ...baseCfg, fetchImpl });
    await client.getsale(sampleSale);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gives up after maxRetries and throws", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response("nope", { status: 503 })));
    const client = new PayabliClient({ ...baseCfg, fetchImpl, maxRetries: 2 });
    await expect(client.getsale(sampleSale)).rejects.toThrow(PayabliApiError);
    // 1 initial + 2 retries
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe("generateIdempotencyKey", () => {
  it("produces unique keys", () => {
    const a = generateIdempotencyKey();
    const b = generateIdempotencyKey();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^lj_[a-z0-9]+_[0-9a-f]+$/);
  });
});

describe("safe logging (no secret leakage)", () => {
  it("never logs the API key on error", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchImpl = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response("bad", { status: 400 })));
    const client = new PayabliClient({ ...baseCfg, fetchImpl });

    await expect(client.getsale(sampleSale)).rejects.toThrow();

    for (const call of consoleLog.mock.calls) {
      const text = JSON.stringify(call);
      expect(text).not.toContain(baseCfg.apiKey);
    }
    consoleLog.mockRestore();
  });
});

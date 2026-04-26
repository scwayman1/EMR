import { describe, it, expect, beforeEach } from "vitest";
import { createHmac } from "crypto";
import {
  verifyWebhookSignature,
  registerHandler,
  dispatchWebhookEvent,
  _resetHandlersForTesting,
} from "./webhook";

const SECRET = "test-webhook-secret";
const sampleBody = JSON.stringify({
  eventType: "TransactionCaptured",
  eventTime: "2026-04-26T07:00:00.000Z",
  entryPoint: "leafjourney-hemp-sandbox",
  body: { referenceId: "txn_1", totalAmount: 1.0 },
});

function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  it("accepts a correctly signed body", () => {
    const result = verifyWebhookSignature({
      rawBody: sampleBody,
      signatureHeader: sign(sampleBody),
      secret: SECRET,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a signature with sha256= prefix", () => {
    const result = verifyWebhookSignature({
      rawBody: sampleBody,
      signatureHeader: `sha256=${sign(sampleBody)}`,
      secret: SECRET,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a tampered body", () => {
    const result = verifyWebhookSignature({
      rawBody: sampleBody + " ", // one extra space
      signatureHeader: sign(sampleBody),
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_signature");
  });

  it("rejects when signed with the wrong secret", () => {
    const result = verifyWebhookSignature({
      rawBody: sampleBody,
      signatureHeader: sign(sampleBody, "different-secret"),
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_signature");
  });

  it("rejects when the header is missing", () => {
    const result = verifyWebhookSignature({
      rawBody: sampleBody,
      signatureHeader: null,
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_header");
  });

  it("rejects when the secret is missing", () => {
    const result = verifyWebhookSignature({
      rawBody: sampleBody,
      signatureHeader: sign(sampleBody),
      secret: "",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_secret");
  });

  it("rejects garbage signatures without throwing", () => {
    const result = verifyWebhookSignature({
      rawBody: sampleBody,
      signatureHeader: "not-hex-at-all",
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_signature");
  });
});

describe("dispatchWebhookEvent", () => {
  beforeEach(() => _resetHandlersForTesting());

  it("invokes the registered handler with the event", async () => {
    let received: unknown = null;
    registerHandler("TransactionCaptured", (event) => {
      received = event;
    });
    await dispatchWebhookEvent({
      eventType: "TransactionCaptured",
      eventTime: "2026-04-26T07:00:00.000Z",
      entryPoint: "ep_1",
      body: { referenceId: "txn_1" },
    });
    expect(received).toMatchObject({ eventType: "TransactionCaptured" });
  });

  it("no-ops on an unhandled event type (does not throw)", async () => {
    await expect(
      dispatchWebhookEvent({
        eventType: "TransactionCaptured",
        eventTime: "x",
        entryPoint: "x",
        body: {},
      }),
    ).resolves.toBeUndefined();
  });

  it("propagates errors thrown by handlers (so the route can 500 and trigger Payabli retry)", async () => {
    registerHandler("TransactionCaptured", () => {
      throw new Error("handler boom");
    });
    await expect(
      dispatchWebhookEvent({
        eventType: "TransactionCaptured",
        eventTime: "x",
        entryPoint: "x",
        body: {},
      }),
    ).rejects.toThrow("handler boom");
  });
});

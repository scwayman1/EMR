// EMR-232 — Payabli webhook signature verification + event dispatcher.
//
// Payabli signs every webhook delivery with HMAC-SHA256 using the
// secret configured in the dashboard. We verify the signature with
// timingSafeEqual to defeat timing attacks, then dispatch on
// eventType.
//
// Header name is configurable because Payabli's docs have shown both
// `X-Payabli-Signature` and `X-Payabli-Webhook-Signature` over time;
// PAYABLI_WEBHOOK_HEADER lets ops point us at whichever the actual
// dashboard sends without a code change.

import { createHmac, timingSafeEqual } from "crypto";
import type { PayabliWebhookEvent, PayabliWebhookEventType } from "./types";

const DEFAULT_SIGNATURE_HEADER = "x-payabli-signature";

export interface VerifyWebhookInput {
  /** Exact raw bytes of the request body — must NOT be re-parsed JSON. */
  rawBody: string;
  /** Header value as received from the request. */
  signatureHeader: string | null;
  /** Webhook secret from PAYABLI_WEBHOOK_SECRET. */
  secret: string;
}

export interface VerifyWebhookResult {
  ok: boolean;
  /** Reason code on failure — useful for ops dashboards. */
  reason?: "missing_header" | "missing_secret" | "bad_signature";
}

/**
 * Verify the HMAC-SHA256 signature of a Payabli webhook delivery.
 * Use the *raw* request body — re-stringifying parsed JSON would
 * change whitespace and invalidate the signature.
 */
export function verifyWebhookSignature(input: VerifyWebhookInput): VerifyWebhookResult {
  if (!input.secret) return { ok: false, reason: "missing_secret" };
  if (!input.signatureHeader) return { ok: false, reason: "missing_header" };

  const expected = createHmac("sha256", input.secret).update(input.rawBody).digest("hex");
  // Header may arrive as "sha256=<hex>" or just "<hex>". Normalize.
  const provided = input.signatureHeader.replace(/^sha256=/i, "").trim();

  if (expected.length !== provided.length) return { ok: false, reason: "bad_signature" };

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) return { ok: false, reason: "bad_signature" };

  return timingSafeEqual(expectedBuf, providedBuf)
    ? { ok: true }
    : { ok: false, reason: "bad_signature" };
}

// Event handler registry. Handlers are pure async functions — no
// shared mutable state — so the route itself stays trivially testable.
type Handler = (event: PayabliWebhookEvent) => Promise<void> | void;
const handlers = new Map<PayabliWebhookEventType, Handler>();

export function registerHandler(eventType: PayabliWebhookEventType, handler: Handler): void {
  handlers.set(eventType, handler);
}

export async function dispatchWebhookEvent(event: PayabliWebhookEvent): Promise<void> {
  const handler = handlers.get(event.eventType);
  if (!handler) {
    // Unhandled event types are logged but not errors — Payabli adds
    // new ones over time and we'd rather no-op than 500.
    // eslint-disable-next-line no-console
    console.log("[payabli:webhook] no handler for event", { eventType: event.eventType });
    return;
  }
  await handler(event);
}

// Test-only helper to clear the handler registry.
export function _resetHandlersForTesting(): void {
  handlers.clear();
}

import type {
  PaymentGateway,
  PaymentIntent,
  PaymentLinkResult,
  TokenizedPaymentMethod,
  WebhookEvent,
  PaymentMethod,
} from "./types";

/**
 * Stub payment gateway — used in dev / CI / demos where there's no
 * real Payabli connection. Every operation succeeds instantly and
 * returns deterministic responses so we can build and test the full
 * billing flow end-to-end without hitting the processor.
 *
 * The stub writes through to our ledger the same way the real
 * gateway will — the caller can't tell the difference.
 */
export class StubPaymentGateway implements PaymentGateway {
  readonly name = "stub";

  async createPaymentIntent(params: {
    amountCents: number;
    method: PaymentMethod;
    clientReferenceId: string;
    description: string;
    patientId: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentIntent> {
    const id = `stub_pi_${Math.random().toString(36).slice(2, 14)}`;
    return {
      id,
      clientReferenceId: params.clientReferenceId,
      amountCents: params.amountCents,
      status: params.method === "cash" || params.method === "check" ? "captured" : "captured",
      method: params.method,
      last4: params.method === "card" ? "4242" : undefined,
      brand: params.method === "card" ? "Visa" : undefined,
      settledAt: new Date().toISOString(),
      rawMetadata: { stub: true, ...params.metadata },
    };
  }

  async capturePayment(intentId: string): Promise<PaymentIntent> {
    return {
      id: intentId,
      clientReferenceId: intentId,
      amountCents: 0,
      status: "captured",
      method: "card",
      settledAt: new Date().toISOString(),
    };
  }

  async chargeStoredMethod(params: {
    token: string;
    amountCents: number;
    clientReferenceId: string;
    description: string;
    patientId: string;
  }): Promise<PaymentIntent> {
    return {
      id: `stub_pi_${Math.random().toString(36).slice(2, 14)}`,
      clientReferenceId: params.clientReferenceId,
      amountCents: params.amountCents,
      status: "captured",
      method: "card",
      last4: "4242",
      brand: "Visa",
      settledAt: new Date().toISOString(),
      rawMetadata: { stub: true, token: params.token },
    };
  }

  async refund(params: {
    paymentIntentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<PaymentIntent> {
    return {
      id: params.paymentIntentId,
      clientReferenceId: params.paymentIntentId,
      amountCents: -params.amountCents,
      status: "refunded",
      method: "card",
      settledAt: new Date().toISOString(),
      rawMetadata: { stub: true, reason: params.reason },
    };
  }

  async createPaymentLink(params: {
    amountCents: number;
    description: string;
    clientReferenceId: string;
    patientId: string;
    expiresInHours?: number;
  }): Promise<PaymentLinkResult> {
    const id = `stub_link_${Math.random().toString(36).slice(2, 10)}`;
    const expiresAt = new Date(
      Date.now() + (params.expiresInHours ?? 72) * 60 * 60 * 1000,
    ).toISOString();
    return {
      id,
      url: `https://sandbox.example.com/pay/${id}`,
      expiresAt,
    };
  }

  async verifyToken(token: string): Promise<TokenizedPaymentMethod> {
    return {
      token,
      type: "card",
      last4: "4242",
      brand: "Visa",
      expiryMonth: 12,
      expiryYear: 2030,
    };
  }

  verifyWebhookSignature(_params: {
    signature: string;
    rawBody: string;
  }): boolean {
    // Stub accepts anything — real gateway must verify HMAC
    return true;
  }

  parseWebhook(rawBody: string): WebhookEvent {
    const parsed = JSON.parse(rawBody) as {
      type?: string;
      paymentIntentId?: string;
      clientReferenceId?: string;
      amountCents?: number;
    };
    return {
      type: parsed.type ?? "payment.captured",
      paymentIntentId: parsed.paymentIntentId ?? "unknown",
      clientReferenceId: parsed.clientReferenceId,
      amountCents: parsed.amountCents ?? 0,
      occurredAt: new Date().toISOString(),
      rawPayload: parsed as Record<string, unknown>,
    };
  }
}

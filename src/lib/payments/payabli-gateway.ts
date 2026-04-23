import crypto from "node:crypto";
import {
  PaymentGatewayError,
  type PaymentGateway,
  type PaymentIntent,
  type PaymentLinkResult,
  type PaymentMethod,
  type TokenizedPaymentMethod,
  type WebhookEvent,
} from "./types";

/**
 * Payabli payment gateway implementation.
 *
 * ─────────────────────────────────────────────────────────────────────
 * STATUS: SCAFFOLD
 *
 * This class has the correct structure and authentication pattern for
 * Payabli, but individual endpoint paths and request/response shapes
 * need to be confirmed against the live docs at https://docs.payabli.com
 * before production use.
 *
 * Each method marked with `TODO(payabli):` needs the exact endpoint
 * path and request body confirmed with Paul Blick (solution engineer)
 * or the docs. Once confirmed, the changes are small — the interface
 * and ledger wiring don't change.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Environment variables:
 *   PAYABLI_API_TOKEN    — API token from the partner portal (Developers → API Tokens)
 *   PAYABLI_ENTRY_POINT  — Paypoint EntryPoint ID that identifies the merchant
 *   PAYABLI_ENVIRONMENT  — "sandbox" | "production" (defaults to sandbox)
 *   PAYABLI_WEBHOOK_SECRET — secret used to verify inbound webhook HMACs
 *
 * US-IP restriction: Payabli sandbox and production are restricted to
 * US IP addresses. Render's US regions are fine. Local dev outside
 * the US requires a VPN.
 */
export class PayabliGateway implements PaymentGateway {
  readonly name = "payabli";

  private readonly apiToken: string;
  private readonly entryPoint: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  constructor() {
    const token = process.env.PAYABLI_API_TOKEN;
    const entryPoint = process.env.PAYABLI_ENTRY_POINT;
    const environment = (process.env.PAYABLI_ENVIRONMENT ?? "sandbox").toLowerCase();

    if (!token) {
      throw new PaymentGatewayError(
        "PAYABLI_API_TOKEN is required",
        "missing_api_token",
      );
    }
    if (!entryPoint) {
      throw new PaymentGatewayError(
        "PAYABLI_ENTRY_POINT is required",
        "missing_entry_point",
      );
    }

    this.apiToken = token;
    this.entryPoint = entryPoint;
    this.webhookSecret = process.env.PAYABLI_WEBHOOK_SECRET ?? "";
    this.baseUrl =
      environment === "production"
        ? "https://api-payabli.com/api"
        : "https://api-sandbox.payabli.com/api";
  }

  // ─────────────────────────────────────────────────────────────────
  // HTTP client with Payabli auth headers
  // ─────────────────────────────────────────────────────────────────
  private async request<T = unknown>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: unknown;
    } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const method = options.method ?? "POST";

    // Payabli uses the `requestToken` header for authentication.
    // Confirm against docs — some endpoints may use a different scheme.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      requestToken: this.apiToken,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    if (!response.ok) {
      const message =
        parsed?.responseText ||
        parsed?.message ||
        parsed?.error ||
        `Payabli ${response.status}: ${text.slice(0, 200)}`;
      throw new PaymentGatewayError(
        String(message),
        `payabli_${response.status}`,
        response.status >= 500,
      );
    }

    return parsed as T;
  }

  // ─────────────────────────────────────────────────────────────────
  // createPaymentIntent → Payabli "Get Paid" money-in endpoint
  // ─────────────────────────────────────────────────────────────────
  async createPaymentIntent(params: {
    amountCents: number;
    method: PaymentMethod;
    clientReferenceId: string;
    description: string;
    patientId: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentIntent> {
    // Cash and check don't go through the processor — we record them
    // locally with a stub intent for ledger consistency.
    if (params.method === "cash" || params.method === "check") {
      return {
        id: `offline_${params.clientReferenceId}`,
        clientReferenceId: params.clientReferenceId,
        amountCents: params.amountCents,
        status: "captured",
        method: params.method,
        settledAt: new Date().toISOString(),
        rawMetadata: { offline: true },
      };
    }

    // TODO(payabli): confirm exact endpoint path against docs.payabli.com
    //   Likely one of:
    //     POST /MoneyIn/getpaid
    //     POST /MoneyIn/authorize (if 2-step auth/capture)
    //
    // Request body shape (confirm):
    //   {
    //     entryPoint: this.entryPoint,
    //     source: "api",
    //     orderId: params.clientReferenceId,
    //     paymentDetails: { totalAmount: dollars, serviceFee: 0, categories: [...] },
    //     customerData: { customerId: params.patientId, ... },
    //     paymentMethod: { method, cardNumber, cardExp, cardCvv, cardHolder, ... },
    //   }
    const payload = {
      entryPoint: this.entryPoint,
      source: "green-path-emr",
      orderId: params.clientReferenceId,
      paymentDetails: {
        totalAmount: params.amountCents / 100,
        serviceFee: 0,
      },
      customerData: {
        customerNumber: params.patientId,
      },
      paymentMethod: {
        method: params.method === "card" ? "card" : "ach",
        // TODO(payabli): card/ACH fields are typically set client-side
        // via Payabli's hosted fields / embedded component. This server
        // call expects a one-time-use token from that flow.
        initiator: "payer",
      },
      metadata: params.metadata,
    };

    const result = await this.request<any>("/MoneyIn/getpaid", {
      body: payload,
    });

    return this.normalizeIntent(result, params);
  }

  // ─────────────────────────────────────────────────────────────────
  // capturePayment — for 2-step auth/capture flows
  // ─────────────────────────────────────────────────────────────────
  async capturePayment(intentId: string): Promise<PaymentIntent> {
    // TODO(payabli): confirm capture endpoint
    //   Likely: POST /MoneyIn/capture/{paymentId}
    const result = await this.request<any>(`/MoneyIn/capture/${intentId}`, {
      method: "POST",
    });
    return this.normalizeIntent(result, {
      amountCents: 0,
      method: "card",
      clientReferenceId: intentId,
      description: "",
      patientId: "",
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // chargeStoredMethod — card on file
  // ─────────────────────────────────────────────────────────────────
  async chargeStoredMethod(params: {
    token: string;
    amountCents: number;
    clientReferenceId: string;
    description: string;
    patientId: string;
  }): Promise<PaymentIntent> {
    // TODO(payabli): confirm stored-method charge endpoint
    //   Likely: POST /MoneyIn/getpaid with paymentMethod.method = "stored"
    //   or:     POST /MoneyIn/charge with storedMethodId = token
    const payload = {
      entryPoint: this.entryPoint,
      orderId: params.clientReferenceId,
      paymentDetails: { totalAmount: params.amountCents / 100 },
      customerData: { customerNumber: params.patientId },
      paymentMethod: {
        method: "stored",
        storedMethodId: params.token,
      },
    };
    const result = await this.request<any>("/MoneyIn/getpaid", {
      body: payload,
    });
    return this.normalizeIntent(result, {
      ...params,
      method: "card",
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // refund
  // ─────────────────────────────────────────────────────────────────
  async refund(params: {
    paymentIntentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<PaymentIntent> {
    // TODO(payabli): confirm refund endpoint
    //   Likely: POST /MoneyIn/refund/{paymentId}  body: { amount, reason }
    const result = await this.request<any>(
      `/MoneyIn/refund/${params.paymentIntentId}`,
      {
        body: {
          refundAmount: params.amountCents / 100,
          reason: params.reason,
        },
      },
    );
    return this.normalizeIntent(result, {
      amountCents: -params.amountCents,
      method: "card",
      clientReferenceId: params.paymentIntentId,
      description: params.reason ?? "refund",
      patientId: "",
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // createPaymentLink — text-to-pay / email-to-pay
  // ─────────────────────────────────────────────────────────────────
  async createPaymentLink(params: {
    amountCents: number;
    description: string;
    clientReferenceId: string;
    patientId: string;
    expiresInHours?: number;
  }): Promise<PaymentLinkResult> {
    // TODO(payabli): confirm payment-link / invoice endpoint
    //   Likely: POST /Bill/add or POST /Invoice/add
    const payload = {
      entryPoint: this.entryPoint,
      billNumber: params.clientReferenceId,
      billAmount: params.amountCents / 100,
      billDescription: params.description,
      customer: { customerNumber: params.patientId },
    };
    const result = await this.request<any>("/Bill/add", { body: payload });
    return {
      id: result.billId ?? result.id ?? params.clientReferenceId,
      url: result.paymentUrl ?? result.url ?? "",
      expiresAt: result.expiresAt,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // verifyToken — check a client-side tokenized method is valid
  // ─────────────────────────────────────────────────────────────────
  async verifyToken(token: string): Promise<TokenizedPaymentMethod> {
    // TODO(payabli): confirm stored-method lookup endpoint
    //   Likely: GET /StoredMethod/{token}
    const result = await this.request<any>(`/StoredMethod/${token}`, {
      method: "GET",
    });
    return {
      token,
      type: result.type === "ach" ? "ach" : "card",
      last4: result.last4 ?? "****",
      brand: result.brand,
      expiryMonth: result.expiryMonth,
      expiryYear: result.expiryYear,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Webhook verification — HMAC signature check
  // ─────────────────────────────────────────────────────────────────
  verifyWebhookSignature(params: {
    signature: string;
    rawBody: string;
  }): boolean {
    if (!this.webhookSecret) return false;
    // TODO(payabli): confirm the signature algorithm and header name.
    // Common pattern: HMAC-SHA256 of rawBody with webhookSecret, hex-encoded.
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(params.rawBody)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(params.signature.replace(/^sha256=/, ""), "hex"),
      );
    } catch {
      return false;
    }
  }

  parseWebhook(rawBody: string): WebhookEvent {
    // TODO(payabli): confirm webhook payload shape
    const payload = JSON.parse(rawBody) as any;
    return {
      type: payload.event ?? payload.eventType ?? "payment.unknown",
      paymentIntentId:
        payload.paymentId ?? payload.transactionId ?? "unknown",
      clientReferenceId: payload.orderId ?? payload.billNumber,
      amountCents: Math.round((payload.amount ?? 0) * 100),
      occurredAt: payload.timestamp ?? new Date().toISOString(),
      rawPayload: payload,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────
  private normalizeIntent(
    result: any,
    params: {
      amountCents: number;
      method: PaymentMethod;
      clientReferenceId: string;
      description?: string;
      patientId?: string;
    },
  ): PaymentIntent {
    // TODO(payabli): confirm response shape
    // Common fields across similar gateways:
    //   responseData: { paymentId, authCode, status, methodReferenceId }
    //   transaction: { id, status, last4, brand }
    const data = result?.responseData ?? result?.transaction ?? result;
    return {
      id: data?.paymentId ?? data?.id ?? `pi_${Date.now()}`,
      clientReferenceId: params.clientReferenceId,
      amountCents: params.amountCents,
      status:
        data?.status === "approved" || data?.status === "captured"
          ? "captured"
          : data?.status === "declined"
            ? "failed"
            : "pending",
      method: params.method,
      last4: data?.last4 ?? data?.cardLast4,
      brand: data?.brand ?? data?.cardBrand,
      settledAt: data?.settledAt ?? new Date().toISOString(),
      errorMessage: data?.errorMessage,
      rawMetadata: result,
    };
  }
}

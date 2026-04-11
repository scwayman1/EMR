/**
 * Provider-agnostic payment gateway interface.
 *
 * The rest of the app talks to this interface, never directly to
 * Payabli (or Stripe, or any other processor). Follows the same
 * pattern as `src/lib/orchestration/model-client.ts` for LLMs.
 *
 * This keeps the payment execution layer swappable and testable:
 *   - StubPaymentGateway for dev / CI / demos (no network)
 *   - PayabliPaymentGateway for production
 *   - Any future processor just implements this interface
 *
 * Per the PRD section 3.3: "Claims are not the system of truth.
 * The internal financial model is the truth." That applies here too:
 * the gateway executes the payment, but our ledger (FinancialEvent)
 * is the source of truth for reconciliation.
 */

// ---------------------------------------------------------------------------
// Common types
// ---------------------------------------------------------------------------

export type PaymentMethod = "card" | "ach" | "cash" | "check";

export interface PaymentIntent {
  /** Processor-side id — opaque to our code. */
  id: string;
  /** Our internal reference — what we pass back to webhook lookups. */
  clientReferenceId: string;
  amountCents: number;
  status: "pending" | "authorized" | "captured" | "failed" | "refunded";
  method: PaymentMethod;
  /** Last 4 of card/account for display. Never PAN. */
  last4?: string;
  brand?: string;
  /** When the processor confirmed the money moved. */
  settledAt?: string;
  /** Any error message from the processor. */
  errorMessage?: string;
  /** Raw processor metadata — stored for audit trail. */
  rawMetadata?: Record<string, unknown>;
}

export interface TokenizedPaymentMethod {
  /** Opaque token to use with chargeStoredMethod. */
  token: string;
  type: "card" | "ach";
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface PaymentLinkResult {
  /** Short URL to share with patient (SMS / email). */
  url: string;
  /** Processor-side id of the link/invoice. */
  id: string;
  /** Optional expiration timestamp. */
  expiresAt?: string;
}

export interface WebhookEvent {
  /** payment.captured | payment.failed | payment.refunded | chargeback.opened | ... */
  type: string;
  /** Processor payment intent id. */
  paymentIntentId: string;
  /** Our clientReferenceId (set when we created the intent). */
  clientReferenceId?: string;
  amountCents: number;
  occurredAt: string;
  rawPayload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Gateway interface
// ---------------------------------------------------------------------------

export interface PaymentGateway {
  /** Provider identifier, for audit logs. */
  readonly name: string;

  /**
   * Create a payment intent for an upfront amount.
   *
   * For card-present and card-not-present flows. Returns a pending
   * intent that must be completed by a client-side flow (hosted field,
   * tokenization, etc.) before capture.
   */
  createPaymentIntent(params: {
    amountCents: number;
    method: PaymentMethod;
    clientReferenceId: string;
    description: string;
    patientId: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentIntent>;

  /**
   * Capture an authorized intent. For methods where capture is
   * separate from auth (card). Cash/check are no-ops.
   */
  capturePayment(intentId: string): Promise<PaymentIntent>;

  /**
   * Charge a previously tokenized payment method (card-on-file flow).
   */
  chargeStoredMethod(params: {
    token: string;
    amountCents: number;
    clientReferenceId: string;
    description: string;
    patientId: string;
  }): Promise<PaymentIntent>;

  /**
   * Issue a refund — full or partial.
   */
  refund(params: {
    paymentIntentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<PaymentIntent>;

  /**
   * Create a shareable payment link (text-to-pay / email-to-pay).
   */
  createPaymentLink(params: {
    amountCents: number;
    description: string;
    clientReferenceId: string;
    patientId: string;
    expiresInHours?: number;
  }): Promise<PaymentLinkResult>;

  /**
   * Tokenize a payment method for future use (card-on-file).
   * In production this is usually done client-side via hosted fields;
   * the server just receives and verifies the token.
   */
  verifyToken(token: string): Promise<TokenizedPaymentMethod>;

  /**
   * Verify the authenticity of an inbound webhook request.
   * Prevents spoofed webhooks from manipulating the ledger.
   */
  verifyWebhookSignature(params: {
    signature: string;
    rawBody: string;
  }): boolean;

  /**
   * Parse a verified webhook body into our normalized event shape.
   */
  parseWebhook(rawBody: string): WebhookEvent;
}

// ---------------------------------------------------------------------------
// Gateway error
// ---------------------------------------------------------------------------

export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}

/**
 * Leafmart payment gateway abstraction.
 *
 * Routes to a real processor (Payabli, Stripe) or to a deterministic stub
 * via the PAYMENT_GATEWAY env var. Stub mode lets the app run end-to-end
 * without payment keys — every other layer (checkout API, order
 * persistence, confirmation page) sees the same shape regardless.
 *
 * The contract is intentionally narrow:
 *   createPaymentIntent → returns clientSecret + intentId
 *   confirmPayment      → server-side verification of an intentId
 *
 * Raw card data MUST never reach this module. Stripe Elements / Payabli
 * Drop-in handle PAN entry in the browser and return an opaque token; we
 * exchange that token for a confirmed PaymentIntent here.
 */

export type PaymentGateway = "stub" | "stripe" | "payabli";

export interface PaymentIntent {
  /** Provider-side identifier; opaque to the rest of the app. */
  intentId: string;
  /** Token the browser SDK uses to mount its payment widget. */
  clientSecret: string;
  /** In the smallest currency unit (cents for USD). */
  amount: number;
  currency: string;
  /** "stub" / "stripe" / "payabli" — useful for client-side dispatch. */
  gateway: PaymentGateway;
}

export interface PaymentResult {
  success: boolean;
  /** Provider-side transaction id. Always present on success. */
  transactionId: string;
  /** Last 4 of the funding instrument when available — never the full PAN. */
  last4?: string;
  /** Card brand or bank name when available. */
  brand?: string;
  error?: string;
}

export function getActiveGateway(): PaymentGateway {
  const v = (process.env.PAYMENT_GATEWAY || "stub").toLowerCase();
  if (v === "stripe" || v === "payabli") return v;
  return "stub";
}

/** Convert dollars (Float) to cents (integer) — defensive against fp drift. */
export function toCents(usd: number): number {
  return Math.round(usd * 100);
}

export async function createPaymentIntent(
  amountUsd: number,
  currency: string = "usd",
): Promise<PaymentIntent> {
  const gateway = getActiveGateway();
  const amount = toCents(amountUsd);

  if (gateway === "stub") return createStubIntent(amount, currency);
  if (gateway === "stripe") return createStripeIntent(amount, currency);
  if (gateway === "payabli") return createPayabliIntent(amount, currency);
  throw new Error(`Unknown PAYMENT_GATEWAY: ${gateway}`);
}

export async function confirmPayment(intentId: string): Promise<PaymentResult> {
  const gateway = getActiveGateway();
  if (gateway === "stub") return confirmStubPayment(intentId);
  if (gateway === "stripe") return confirmStripePayment(intentId);
  if (gateway === "payabli") return confirmPayabliPayment(intentId);
  throw new Error(`Unknown PAYMENT_GATEWAY: ${gateway}`);
}

// ──────────────────────────────────────────────────────────────────
// Stub adapter — deterministic, no network. Every intent succeeds.
// ──────────────────────────────────────────────────────────────────

function randomHex(bytes: number): string {
  let out = "";
  for (let i = 0; i < bytes; i++) {
    out += Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  }
  return out;
}

async function createStubIntent(amount: number, currency: string): Promise<PaymentIntent> {
  const intentId = `pi_stub_${randomHex(12)}`;
  return {
    intentId,
    clientSecret: `${intentId}_secret_${randomHex(8)}`,
    amount,
    currency,
    gateway: "stub",
  };
}

async function confirmStubPayment(intentId: string): Promise<PaymentResult> {
  if (!intentId.startsWith("pi_stub_")) {
    return { success: false, transactionId: "", error: "Invalid stub intent id" };
  }
  return {
    success: true,
    transactionId: `txn_stub_${randomHex(10)}`,
    last4: "4242",
    brand: "visa",
  };
}

// ──────────────────────────────────────────────────────────────────
// Stripe adapter — scaffold. Implement when STRIPE_SECRET_KEY is set.
// ──────────────────────────────────────────────────────────────────

async function createStripeIntent(_amount: number, _currency: string): Promise<PaymentIntent> {
  throw new Error(
    "Stripe gateway selected but not implemented. Install `stripe`, " +
      "set STRIPE_SECRET_KEY, and replace this stub with " +
      "`stripe.paymentIntents.create({ amount, currency, automatic_payment_methods: { enabled: true } })`.",
  );
}

async function confirmStripePayment(_intentId: string): Promise<PaymentResult> {
  throw new Error(
    "Stripe gateway selected but not implemented. Use " +
      "`stripe.paymentIntents.retrieve(intentId)` and check status === 'succeeded'.",
  );
}

// ──────────────────────────────────────────────────────────────────
// Payabli adapter — scaffold. The codebase's StoredPaymentMethod
// model already references "opaque token from processor (Payabli)",
// so this is the planned default once keys are issued.
// ──────────────────────────────────────────────────────────────────

async function createPayabliIntent(_amount: number, _currency: string): Promise<PaymentIntent> {
  throw new Error(
    "Payabli gateway selected but not implemented. Set PAYABLI_API_KEY + " +
      "PAYABLI_ENTRY_POINT, then call MoneyIn → tokenize → authorize per " +
      "https://docs.payabli.com.",
  );
}

async function confirmPayabliPayment(_intentId: string): Promise<PaymentResult> {
  throw new Error(
    "Payabli gateway selected but not implemented. Use the GetTransaction " +
      "endpoint and check resultCode === 1.",
  );
}

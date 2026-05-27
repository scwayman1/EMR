// EMR-232 — Payabli request/response types.
//
// Modeled after Payabli's MoneyIn (charge), MoneyOut (payout), and
// webhook event payloads. Field names match the documented schema so
// JSON serialization is identity. References:
//   https://docs.payabli.com/api-reference/getauth
//   https://docs.payabli.com/api-reference/getsale
//   https://docs.payabli.com/api-reference/webhooks
//
// We deliberately do not import or depend on a Payabli SDK — there
// isn't a first-party TypeScript one we'd want to pin against, and
// the JSON contract is small enough to maintain by hand.

export interface PayabliMoneyInRequest {
  /** ID of the Pay Point this transaction routes to. */
  entryPoint: string;
  /** Idempotency key — caller-generated, must be unique per logical request. */
  idempotencyKey: string;
  /** Amount in dollars (Payabli uses dollars on input; cents are derived). */
  paymentDetails: {
    totalAmount: number;
    serviceFee?: number;
  };
  /** Tokenized payment method from Payabli's drop-in JS or saved on file. */
  paymentMethod:
    | { method: "card"; cardnumber: string; cardcvv?: string; cardexp: string; cardholder: string }
    | { method: "card-token"; storedMethodsId: string }
    | { method: "ach"; routingAccount: string; accountNumber: string; accountType: "Checking" | "Savings"; achHolder: string };
  /** Customer info — minimal required by Payabli for KYC. */
  customer: {
    customerNumber?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  /** Free-form metadata Payabli echoes back on webhook events. */
  ipaddress?: string;
  invoiceData?: { invoiceNumber?: string; invoiceDescription?: string };
}

export interface PayabliMoneyInResponse {
  /** 0 = success, non-zero = error per Payabli. */
  responseCode: number;
  responseText: string;
  /** Provider-side transaction id. Use this everywhere downstream. */
  referenceId?: string;
  /** Returned on duplicate idempotency keys; same shape as the original. */
  isError?: boolean;
}

export type PayabliWebhookEventType =
  | "TransactionAuthorized"
  | "TransactionCaptured"
  | "TransactionRefunded"
  | "TransactionDeclined"
  | "TransactionVoided"
  | "ChargebackOpened"
  | "ChargebackResolved"
  | "PayoutCompleted"
  | "PayoutFailed";

export interface PayabliWebhookEvent {
  eventType: PayabliWebhookEventType;
  /** Payabli emits ISO 8601 timestamps in UTC. */
  eventTime: string;
  /** Echoes the entryPoint that originated the txn. */
  entryPoint: string;
  /** The transaction or payout payload. Shape varies by eventType. */
  body: Record<string, unknown>;
  /** Webhook delivery id — useful for dedup if Payabli retries. */
  webhookId?: string;
}

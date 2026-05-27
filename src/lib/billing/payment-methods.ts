/**
 * Stored Payment Methods + Receipts (EMR-114)
 * -------------------------------------------
 * Tokenized card / ACH storage backed by the existing
 * `StoredPaymentMethod` Prisma model and the `PaymentGateway`
 * interface in `lib/payments`. This module is the billing-side
 * orchestrator that:
 *
 *   - Verifies a tokenized method via the configured gateway and
 *     persists it (no PAN, last4 + brand only).
 *   - Charges a stored token and books a `FinancialEvent` so the
 *     internal ledger stays the source of truth (PRD § 3.3).
 *   - Generates a deterministic receipt payload (date, invoice
 *     number, line items, balance after) suitable for the patient
 *     portal billing tab and for emailed PDFs.
 *   - Computes the patient's running balance from FinancialEvent
 *     rows so the billing tab can render "You owe $X" / "Credit on
 *     file: $Y" without a recompute on every page hit.
 *
 * Payabli integration is wired through the gateway interface — same
 * surface as the stub gateway used in dev/CI. Status from TICKETS.md:
 * "partially done — StoredPaymentMethod exists; Payabli scaffolded."
 * This module fills the remaining glue.
 */

import type {
  PaymentGateway,
  PaymentMethod,
  TokenizedPaymentMethod,
} from "@/lib/payments/types";

export interface StoredMethodSummary {
  id: string;
  type: "card" | "ach";
  last4: string;
  brand: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  consentedAt: string;
}

export interface ReceiptLineItem {
  description: string;
  amountCents: number;
}

export interface Receipt {
  receiptNumber: string;
  patientId: string;
  paymentIntentId: string;
  issuedAt: string;
  amountCents: number;
  method: PaymentMethod;
  last4?: string;
  brand?: string;
  lineItems: ReceiptLineItem[];
  /** Patient balance AFTER this payment posted. */
  balanceAfterCents: number;
  practice: {
    name: string;
    address?: string;
    phone?: string;
    taxId?: string;
  };
}

export interface BalanceSnapshot {
  /** Positive = patient owes practice. Negative = credit on file. */
  netCents: number;
  owedCents: number;
  creditCents: number;
  asOf: string;
}

export interface StoreMethodInput {
  patientId: string;
  token: string;
  setDefault: boolean;
}

export interface ChargeStoredInput {
  patientId: string;
  methodId: string;
  amountCents: number;
  description: string;
  reference?: string;
}

export interface PaymentMethodStore {
  insert(record: {
    patientId: string;
    type: "card" | "ach";
    last4: string;
    brand: string | null;
    expiryMonth: number | null;
    expiryYear: number | null;
    tokenReference: string;
    isDefault: boolean;
  }): Promise<StoredMethodSummary>;
  setDefault(patientId: string, methodId: string): Promise<void>;
  list(patientId: string): Promise<StoredMethodSummary[]>;
  getActiveById(methodId: string): Promise<{
    id: string;
    patientId: string;
    tokenReference: string;
    last4: string;
    brand: string | null;
    type: "card" | "ach";
  } | null>;
  deactivate(methodId: string): Promise<void>;
}

export interface LedgerStore {
  appendEvent(event: {
    organizationId: string;
    patientId: string;
    type: "patient_payment" | "credit_applied" | "refund_issued" | "chargeback";
    amountCents: number;
    description: string;
    paymentId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  computeBalance(patientId: string): Promise<BalanceSnapshot>;
}

/**
 * Validate a token with the gateway and persist it as a
 * StoredPaymentMethod. Never accepts raw card / account numbers — that
 * stays at the gateway hosted-fields layer.
 */
export async function storePaymentMethod(
  input: StoreMethodInput,
  deps: { gateway: PaymentGateway; store: PaymentMethodStore },
): Promise<StoredMethodSummary> {
  const verified: TokenizedPaymentMethod = await deps.gateway.verifyToken(input.token);

  const inserted = await deps.store.insert({
    patientId: input.patientId,
    type: verified.type,
    last4: verified.last4,
    brand: verified.brand ?? null,
    expiryMonth: verified.expiryMonth ?? null,
    expiryYear: verified.expiryYear ?? null,
    tokenReference: verified.token,
    isDefault: input.setDefault,
  });

  if (input.setDefault) {
    await deps.store.setDefault(input.patientId, inserted.id);
  }
  return inserted;
}

/**
 * Charge a stored method and produce a receipt + ledger entry.
 *
 * Booking order is intentional:
 *   1. Gateway charge (external — may fail).
 *   2. Ledger append (internal — must succeed once the charge clears).
 *   3. Receipt is computed from the ledger snapshot, NOT from the
 *      gateway response, so the receipt's "balance after" line is
 *      always reconciled against our source of truth.
 */
export async function chargeStoredMethod(
  input: ChargeStoredInput,
  deps: {
    gateway: PaymentGateway;
    store: PaymentMethodStore;
    ledger: LedgerStore;
    organizationId: string;
    practice: Receipt["practice"];
    receiptNumber?: () => string;
    now?: () => Date;
  },
): Promise<Receipt> {
  const method = await deps.store.getActiveById(input.methodId);
  if (!method || method.patientId !== input.patientId) {
    throw new Error("payment_method_not_found");
  }

  const intent = await deps.gateway.chargeStoredMethod({
    token: method.tokenReference,
    amountCents: input.amountCents,
    clientReferenceId: input.reference ?? `patient:${input.patientId}`,
    description: input.description,
    patientId: input.patientId,
  });

  if (intent.status !== "captured" && intent.status !== "authorized") {
    throw new Error(
      `payment_failed:${intent.status}:${intent.errorMessage ?? "unknown"}`,
    );
  }

  await deps.ledger.appendEvent({
    organizationId: deps.organizationId,
    patientId: input.patientId,
    type: "patient_payment",
    amountCents: input.amountCents,
    description: input.description,
    paymentId: intent.id,
    metadata: {
      gateway: deps.gateway.name,
      methodId: method.id,
      last4: method.last4,
      brand: method.brand,
      reference: input.reference,
    },
  });

  const balance = await deps.ledger.computeBalance(input.patientId);
  const issuedAt = (deps.now?.() ?? new Date()).toISOString();
  const receiptNumber = (deps.receiptNumber ?? defaultReceiptNumber)();

  return {
    receiptNumber,
    patientId: input.patientId,
    paymentIntentId: intent.id,
    issuedAt,
    amountCents: input.amountCents,
    method: method.type,
    last4: method.last4,
    brand: method.brand ?? undefined,
    lineItems: [{ description: input.description, amountCents: input.amountCents }],
    balanceAfterCents: balance.netCents,
    practice: deps.practice,
  };
}

function defaultReceiptNumber(): string {
  const epoch = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `RCPT-${epoch}-${rand}`;
}

/**
 * Patient-portal display string for the billing tab header.
 * - Positive net → "$X.XX due"
 * - Negative net → "$X.XX credit on file"
 * - Zero → "Paid in full"
 */
export function formatBalanceForPortal(snap: BalanceSnapshot): string {
  if (snap.netCents === 0) return "Paid in full";
  const dollars = (Math.abs(snap.netCents) / 100).toFixed(2);
  return snap.netCents > 0 ? `$${dollars} due` : `$${dollars} credit on file`;
}

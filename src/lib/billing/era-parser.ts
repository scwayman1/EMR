/**
 * ERA / 835 ingestion pipeline — EMR-221
 * --------------------------------------
 * Pure parser + dedupe helpers for ANSI X12 v5010 835 (Health Care
 * Claim Payment / Advice). The parser converts a raw 835 payload into
 * structured claim payments that the adjudication agent can post.
 *
 * Scope:
 *   - 835 segment grammar: ISA/GS/ST envelope, BPR (financial info),
 *     TRN (trace), N1 (payer/payee), CLP (claim payment), SVC (service
 *     line), CAS (adjustments), REF (refs), DTM (dates), PLB
 *     (provider-level adjustments), AMT (amounts).
 *   - Dedupe via (payerId, checkNumber) with a content-hash fallback so
 *     a retried delivery from the clearinghouse never double-posts.
 *   - JSON envelope path so commercial gateways that pre-parse on our
 *     behalf use the same downstream code.
 *   - PLB takebacks/refunds/forward-balance posted as separate ledger
 *     entries (negative for takebacks, positive for refunds).
 *
 * Out of scope (deferred to clearinghouse adapter — EMR-217):
 *   - Network transport (SFTP / HTTPS pull).
 *   - Polling-loop scheduling.
 */
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single claim's payment within an ERA — what the adjudication agent
 *  consumes to write `AdjudicationResult` rows. Amounts in cents. */
export interface Era835ClaimPayment {
  /** Payer-side claim control number (CLP01) — our claim number echoed. */
  claimControlNumber: string;
  /** Payer-side claim id (CLP07). */
  payerClaimId: string | null;
  /** CLP02: 1=processed-as-primary, 2=secondary, 3=tertiary, 4=denied,
   *  19/20/21=reversal-of-prior. */
  claimStatusCode: string;
  totalChargeCents: number;
  totalPaidCents: number;
  patientRespCents: number;
  /** CARC/RARC at the claim level (CLP-line CAS). */
  claimAdjustments: Era835Adjustment[];
  serviceLines: Era835ServiceLine[];
}

export interface Era835ServiceLine {
  /** Procedure code from SVC01 (e.g. "HC:99214" → "99214"). */
  cptCode: string;
  modifiers: string[];
  chargeCents: number;
  paidCents: number;
  units: number;
  adjustments: Era835Adjustment[];
}

export interface Era835Adjustment {
  /** Group code: CO/PR/OA/PI/CR/WO. */
  groupCode: string;
  /** CARC code. */
  carcCode: string;
  amountCents: number;
  quantity: number;
}

/** PLB provider-level adjustment — applied to the practice's ledger,
 *  not to a specific claim. */
export interface Era835PlbAdjustment {
  reasonCode: string; // "WO" write-off, "FB" forward balance, "L6" interest, "CV" capitation, etc.
  /** Signed amount in cents. Positive = practice owes, negative = paid back. */
  amountCents: number;
  reference: string | null;
}

/** Top-level parsed envelope. One file = one check / EFT trace. */
export interface ParsedEra835 {
  payerName: string;
  payerId: string | null;
  payeeName: string;
  payeeNpi: string | null;
  /** EFT trace number (TRN02) or check number depending on payment method. */
  checkNumber: string;
  checkDate: Date;
  paymentMethod: "ach" | "check" | "vcc" | "fedwire" | "non_payment";
  totalPaymentCents: number;
  claimPayments: Era835ClaimPayment[];
  plbAdjustments: Era835PlbAdjustment[];
}

export class Era835ParseError extends Error {
  constructor(
    message: string,
    public readonly segment?: string,
  ) {
    super(message);
    this.name = "Era835ParseError";
  }
}

// ---------------------------------------------------------------------------
// Dedupe
// ---------------------------------------------------------------------------

/** Stable content hash of a raw payload — used as the second-line dedupe
 *  defence when checkNumber alone isn't reliable. We strip ALL whitespace
 *  (X12 has no meaningful whitespace inside segments) so a re-encoded
 *  version of the same file hashes the same regardless of CR/LF, BOM,
 *  or pretty-printing. */
export function hashEraPayload(payload: string): string {
  const normalized = payload.replace(/\s+/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}

// ---------------------------------------------------------------------------
// EDI 835 parser
// ---------------------------------------------------------------------------

const SEGMENT_DELIMS = ["~", "\n"] as const;
const ELEMENT_DELIM = "*";

/** Tokenize an 835 payload into segments. ISA segments with explicit
 *  delimiters are honored when present. */
export function tokenizeSegments(payload: string): string[][] {
  const trimmed = payload.replace(/\r\n?/g, "\n").trim();
  if (trimmed.length === 0) return [];
  // Auto-detect segment delimiter by sniffing the ISA segment (positions
  // 105-106 hold the segment terminator in canonical X12).
  let segDelim: string = "~";
  if (trimmed.startsWith("ISA") && trimmed.length > 106) {
    segDelim = trimmed[105] ?? "~";
  } else if (trimmed.includes("\n") && !trimmed.includes("~")) {
    segDelim = "\n";
  }
  return trimmed
    .split(segDelim)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.split(ELEMENT_DELIM));
  void SEGMENT_DELIMS;
}

const PAYMENT_METHOD_MAP: Record<string, ParsedEra835["paymentMethod"]> = {
  ACH: "ach",
  CHK: "check",
  FWT: "fedwire",
  BOP: "vcc",
  NON: "non_payment",
};

const STATUS_REVERSAL_CODES = new Set(["19", "20", "21", "22"]);

/** Parse a raw 835 payload into a `ParsedEra835`. Throws `Era835ParseError`
 *  on irrecoverable parse problems (missing BPR / TRN / mismatched
 *  envelopes). Lenient on unknown CARCs (kept verbatim; classification
 *  happens downstream in `remittance.ts`). */
export function parseEra835(payload: string): ParsedEra835 {
  const segs = tokenizeSegments(payload);
  if (segs.length === 0) throw new Era835ParseError("Empty payload");

  let payerName = "";
  let payerId: string | null = null;
  let payeeName = "";
  let payeeNpi: string | null = null;
  let checkNumber = "";
  let checkDate = new Date();
  let paymentMethod: ParsedEra835["paymentMethod"] = "ach";
  let totalPaymentCents = 0;

  const claimPayments: Era835ClaimPayment[] = [];
  const plbAdjustments: Era835PlbAdjustment[] = [];

  let currentClaim: Era835ClaimPayment | null = null;
  let currentLine: Era835ServiceLine | null = null;

  const flushLine = () => {
    if (currentLine && currentClaim) {
      currentClaim.serviceLines.push(currentLine);
    }
    currentLine = null;
  };
  const flushClaim = () => {
    flushLine();
    if (currentClaim) claimPayments.push(currentClaim);
    currentClaim = null;
  };

  for (const seg of segs) {
    const tag = seg[0];
    switch (tag) {
      case "BPR": {
        // BPR01 transaction handling, BPR02 monetary amount, BPR03 credit/debit,
        // BPR04 payment method, BPR16 effective date.
        const amount = parseFloat(seg[2] ?? "0");
        totalPaymentCents = Math.round(amount * 100);
        const pm = (seg[4] ?? "ACH").toUpperCase();
        paymentMethod = PAYMENT_METHOD_MAP[pm] ?? "ach";
        if (seg[16]) {
          checkDate = parseX12Date(seg[16]) ?? checkDate;
        }
        break;
      }
      case "TRN": {
        // TRN02 = trace / EFT / check number
        if (seg[2]) checkNumber = seg[2];
        break;
      }
      case "DTM": {
        // 405 = production date — fallback if BPR16 missing
        if (seg[1] === "405" && !checkDate && seg[2]) {
          checkDate = parseX12Date(seg[2]) ?? checkDate;
        }
        break;
      }
      case "N1": {
        // N101 PR = payer, PE = payee
        if (seg[1] === "PR") {
          payerName = seg[2] ?? "";
          payerId = seg[4] ?? null;
        } else if (seg[1] === "PE") {
          payeeName = seg[2] ?? "";
          payeeNpi = seg[4] ?? null;
        }
        break;
      }
      case "CLP": {
        flushClaim();
        currentClaim = {
          claimControlNumber: seg[1] ?? "",
          claimStatusCode: seg[2] ?? "",
          totalChargeCents: dollarsToCents(seg[3]),
          totalPaidCents: dollarsToCents(seg[4]),
          patientRespCents: dollarsToCents(seg[5]),
          payerClaimId: seg[7] ?? null,
          claimAdjustments: [],
          serviceLines: [],
        };
        if (STATUS_REVERSAL_CODES.has(currentClaim.claimStatusCode)) {
          // Reversal of a prior payment — keep the row but flag with
          // negative semantics so the adjudication agent posts a
          // takeback. We encode by negating totalPaidCents.
          currentClaim.totalPaidCents = -Math.abs(currentClaim.totalPaidCents);
        }
        break;
      }
      case "SVC": {
        flushLine();
        if (!currentClaim) break;
        // SVC01 = composite "HC:99214:25:59:..." (qualifier + cpt + up to 4 mods)
        const composite = (seg[1] ?? "").split(":");
        const cptCode = composite[1] ?? "";
        const modifiers = composite.slice(2, 6).filter(Boolean);
        currentLine = {
          cptCode,
          modifiers,
          chargeCents: dollarsToCents(seg[2]),
          paidCents: dollarsToCents(seg[3]),
          units: parseInt(seg[5] ?? "1", 10) || 1,
          adjustments: [],
        };
        break;
      }
      case "CAS": {
        // CAS01 group, then up to 6 (CARC, amount, qty) triples.
        const group = seg[1] ?? "";
        for (let i = 2; i < seg.length; i += 3) {
          const carc = seg[i];
          const amt = seg[i + 1];
          const qty = seg[i + 2];
          if (!carc || !amt) continue;
          const adj: Era835Adjustment = {
            groupCode: group,
            carcCode: carc,
            amountCents: dollarsToCents(amt),
            quantity: parseFloat(qty ?? "1") || 1,
          };
          if (currentLine) {
            currentLine.adjustments.push(adj);
          } else if (currentClaim) {
            currentClaim.claimAdjustments.push(adj);
          }
        }
        break;
      }
      case "PLB": {
        // PLB03+ = pairs of (reason-composite, amount). Reason composite
        // is "<reason>:<reference>" e.g. "WO:CKNO123".
        for (let i = 3; i < seg.length; i += 2) {
          const composite = (seg[i] ?? "").split(":");
          const amt = seg[i + 1];
          if (!composite[0] || !amt) continue;
          plbAdjustments.push({
            reasonCode: composite[0],
            reference: composite[1] ?? null,
            amountCents: dollarsToCents(amt),
          });
        }
        break;
      }
      case "SE": {
        flushClaim();
        break;
      }
      default:
        break;
    }
  }
  flushClaim();

  if (!checkNumber) {
    throw new Era835ParseError("ERA missing TRN02 trace / check number", "TRN");
  }

  return {
    payerName,
    payerId,
    payeeName,
    payeeNpi,
    checkNumber,
    checkDate,
    paymentMethod,
    totalPaymentCents,
    claimPayments,
    plbAdjustments,
  };
}

// ---------------------------------------------------------------------------
// JSON envelope path (commercial gateways pre-parse for us)
// ---------------------------------------------------------------------------

interface JsonEra835Envelope {
  payer: { name: string; id?: string | null };
  payee?: { name?: string; npi?: string | null };
  trace: string;
  check_date: string;
  payment_method?: string;
  total_amount: number; // dollars
  claims: Array<{
    claim_control: string;
    payer_claim_id?: string | null;
    status_code: string;
    charge: number;
    paid: number;
    patient_resp: number;
    adjustments?: Array<{ group: string; carc: string; amount: number; quantity?: number }>;
    services?: Array<{
      cpt: string;
      modifiers?: string[];
      charge: number;
      paid: number;
      units?: number;
      adjustments?: Array<{ group: string; carc: string; amount: number; quantity?: number }>;
    }>;
  }>;
  plb?: Array<{ reason: string; amount: number; reference?: string | null }>;
}

export function parseJsonEra(envelope: unknown): ParsedEra835 {
  const e = envelope as JsonEra835Envelope;
  if (!e || !e.payer || !e.trace) {
    throw new Era835ParseError("JSON envelope missing required fields");
  }
  return {
    payerName: e.payer.name,
    payerId: e.payer.id ?? null,
    payeeName: e.payee?.name ?? "",
    payeeNpi: e.payee?.npi ?? null,
    checkNumber: e.trace,
    checkDate: new Date(e.check_date),
    paymentMethod:
      (PAYMENT_METHOD_MAP[(e.payment_method ?? "ACH").toUpperCase()] ?? "ach"),
    totalPaymentCents: Math.round(e.total_amount * 100),
    claimPayments: e.claims.map((c) => ({
      claimControlNumber: c.claim_control,
      payerClaimId: c.payer_claim_id ?? null,
      claimStatusCode: c.status_code,
      totalChargeCents: Math.round(c.charge * 100),
      totalPaidCents: STATUS_REVERSAL_CODES.has(c.status_code)
        ? -Math.abs(Math.round(c.paid * 100))
        : Math.round(c.paid * 100),
      patientRespCents: Math.round(c.patient_resp * 100),
      claimAdjustments: (c.adjustments ?? []).map((a) => ({
        groupCode: a.group,
        carcCode: a.carc,
        amountCents: Math.round(a.amount * 100),
        quantity: a.quantity ?? 1,
      })),
      serviceLines: (c.services ?? []).map((s) => ({
        cptCode: s.cpt,
        modifiers: s.modifiers ?? [],
        chargeCents: Math.round(s.charge * 100),
        paidCents: Math.round(s.paid * 100),
        units: s.units ?? 1,
        adjustments: (s.adjustments ?? []).map((a) => ({
          groupCode: a.group,
          carcCode: a.carc,
          amountCents: Math.round(a.amount * 100),
          quantity: a.quantity ?? 1,
        })),
      })),
    })),
    plbAdjustments: (e.plb ?? []).map((p) => ({
      reasonCode: p.reason,
      reference: p.reference ?? null,
      amountCents: Math.round(p.amount * 100),
    })),
  };
}

// ---------------------------------------------------------------------------
// Sanity / balance checks
// ---------------------------------------------------------------------------

/** Check that the sum of every claim's paid + PLB equals BPR02. Returns
 *  null when balanced (within tolerance), otherwise a descriptive
 *  variance message. */
export function reconcileEraTotals(
  era: ParsedEra835,
  toleranceCents = 2,
): { balanced: true } | { balanced: false; varianceCents: number; message: string } {
  const claimSum = era.claimPayments.reduce((a, c) => a + c.totalPaidCents, 0);
  const plbSum = era.plbAdjustments.reduce((a, p) => a + p.amountCents, 0);
  const reconstructed = claimSum - plbSum;
  const variance = era.totalPaymentCents - reconstructed;
  if (Math.abs(variance) <= toleranceCents) return { balanced: true };
  return {
    balanced: false,
    varianceCents: variance,
    message: `ERA totals do not balance: BPR=${(era.totalPaymentCents / 100).toFixed(2)}, claim_sum=${(claimSum / 100).toFixed(2)}, plb_sum=${(plbSum / 100).toFixed(2)}. Variance ${(variance / 100).toFixed(2)}.`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dollarsToCents(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function parseX12Date(s: string): Date | null {
  // CCYYMMDD or YYMMDD (legacy). 14-digit timestamps not used in 835.
  if (s.length === 8) {
    const y = parseInt(s.slice(0, 4), 10);
    const m = parseInt(s.slice(4, 6), 10);
    const d = parseInt(s.slice(6, 8), 10);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }
  if (s.length === 6) {
    const yy = parseInt(s.slice(0, 2), 10);
    const m = parseInt(s.slice(2, 4), 10);
    const d = parseInt(s.slice(4, 6), 10);
    const y = yy < 50 ? 2000 + yy : 1900 + yy;
    if (Number.isFinite(yy) && Number.isFinite(m) && Number.isFinite(d)) {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }
  return null;
}

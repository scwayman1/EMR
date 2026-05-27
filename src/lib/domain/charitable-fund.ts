// EMR-127 — Leafjourney Charitable Fund + Transparent Ledger.
//
// The ledger is **append-only and hash-chained**. Each entry references
// the previous entry's hash, so any tampering with an earlier entry
// invalidates every entry that follows. That property is what makes the
// public auditability claim mean something.
//
// Production stamps real SHA-256 (web crypto) on the server. The
// pure-JS hash here is deterministic and stable so the demo ledger
// renders without async; the chain logic — what we actually care about
// for tamper-detection — is identical either way.

import { attestationHashSync } from "./volunteer";

export type LedgerSource =
  | "revenue_share"        // a configured % of platform revenue
  | "volunteer_offset"     // patient volunteer hours redirected as donation
  | "voluntary_donation"   // free-form donation from any user
  | "founders_pledge"      // founders' personal pledge
  | "matching_grant";      // external matched grant

export type LedgerDirection = "inflow" | "outflow";

export interface FundLedgerEntry {
  /** Deterministic ID based on hash chain, not random. */
  id: string;
  index: number;             // sequence within the ledger
  occurredAt: string;
  direction: LedgerDirection;
  amountCents: number;
  source?: LedgerSource;     // populated for inflows
  /** For outflows, the destination charity from the EMR-125 vetted registry. */
  destinationCharityId?: string;
  destinationCharityName?: string;
  memo: string;
  /** Hash of the previous entry's hash + this entry's canonical fields. */
  hash: string;
  prevHash: string | null;
}

interface InboundEntry {
  occurredAt: string;
  direction: LedgerDirection;
  amountCents: number;
  source?: LedgerSource;
  destinationCharityId?: string;
  destinationCharityName?: string;
  memo: string;
}

/**
 * Append a new entry to a chain. Pure: returns a fresh array.
 */
export function appendEntry(chain: FundLedgerEntry[], entry: InboundEntry): FundLedgerEntry[] {
  const prev = chain[chain.length - 1];
  const index = chain.length;
  const canonical = [
    String(index),
    entry.occurredAt,
    entry.direction,
    String(entry.amountCents),
    entry.source ?? "",
    entry.destinationCharityId ?? "",
    entry.memo,
    prev?.hash ?? "GENESIS",
  ].join("::");
  const hash = attestationHashSync(canonical);
  const built: FundLedgerEntry = {
    id: `lf-${hash.slice(0, 12)}`,
    index,
    occurredAt: entry.occurredAt,
    direction: entry.direction,
    amountCents: entry.amountCents,
    source: entry.source,
    destinationCharityId: entry.destinationCharityId,
    destinationCharityName: entry.destinationCharityName,
    memo: entry.memo,
    hash,
    prevHash: prev?.hash ?? null,
  };
  return [...chain, built];
}

/**
 * Re-derive every hash and confirm the chain is intact. Returns the
 * index of the first broken entry, or -1 if the chain is valid.
 */
export function verifyChain(chain: FundLedgerEntry[]): { ok: boolean; brokenAt: number } {
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i]!;
    const prev = i > 0 ? chain[i - 1]! : null;
    if (e.prevHash !== (prev?.hash ?? null)) return { ok: false, brokenAt: i };
    const canonical = [
      String(e.index),
      e.occurredAt,
      e.direction,
      String(e.amountCents),
      e.source ?? "",
      e.destinationCharityId ?? "",
      e.memo,
      prev?.hash ?? "GENESIS",
    ].join("::");
    if (attestationHashSync(canonical) !== e.hash) return { ok: false, brokenAt: i };
  }
  return { ok: true, brokenAt: -1 };
}

export interface FundSummary {
  totalInflowsCents: number;
  totalOutflowsCents: number;
  balanceCents: number;
  inflowsBySource: Record<LedgerSource, number>;
  topRecipients: Array<{ charityId: string; charityName: string; totalCents: number }>;
  entryCount: number;
}

const ALL_SOURCES: LedgerSource[] = [
  "revenue_share",
  "volunteer_offset",
  "voluntary_donation",
  "founders_pledge",
  "matching_grant",
];

export function summarizeFund(chain: FundLedgerEntry[]): FundSummary {
  let inflows = 0;
  let outflows = 0;
  const bySource = Object.fromEntries(ALL_SOURCES.map((s) => [s, 0])) as Record<LedgerSource, number>;
  const byCharity = new Map<string, { name: string; cents: number }>();
  for (const e of chain) {
    if (e.direction === "inflow") {
      inflows += e.amountCents;
      if (e.source) bySource[e.source] += e.amountCents;
    } else {
      outflows += e.amountCents;
      if (e.destinationCharityId) {
        const cur = byCharity.get(e.destinationCharityId) ?? {
          name: e.destinationCharityName ?? e.destinationCharityId,
          cents: 0,
        };
        cur.cents += e.amountCents;
        byCharity.set(e.destinationCharityId, cur);
      }
    }
  }
  const topRecipients = Array.from(byCharity.entries())
    .map(([charityId, v]) => ({ charityId, charityName: v.name, totalCents: v.cents }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 8);
  return {
    totalInflowsCents: inflows,
    totalOutflowsCents: outflows,
    balanceCents: inflows - outflows,
    inflowsBySource: bySource,
    topRecipients,
    entryCount: chain.length,
  };
}

// ---------------------------------------------------------------------------
// Distribution governance — Article VII §5 conflict-of-interest rule.
// ---------------------------------------------------------------------------

export interface DistributionProposal {
  id: string;
  proposedAt: string;
  proposerName: string;
  charityId: string;
  charityName: string;
  amountCents: number;
  rationale: string;
  vetted: boolean;                    // charity passes EMR-125 registry vet
  conflictOfInterest: boolean;        // any board overlap with leadership
  patientAdvisoryReview: "pending" | "approved" | "blocked";
  clinicalAdvisoryReview: "pending" | "approved" | "blocked";
}

export type ProposalDecision = "approved" | "blocked" | "needs_review";

export function decideProposal(p: DistributionProposal): ProposalDecision {
  if (p.conflictOfInterest) return "blocked";
  if (!p.vetted) return "blocked";
  if (p.patientAdvisoryReview === "blocked" || p.clinicalAdvisoryReview === "blocked") return "blocked";
  if (p.patientAdvisoryReview === "approved" && p.clinicalAdvisoryReview === "approved") return "approved";
  return "needs_review";
}

export function centsToDollarsCompact(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

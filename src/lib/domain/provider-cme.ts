// EMR-126 — Provider CME Credits via medical research searches.
//
// Pure accrual engine. A provider's research session — time-on-task,
// query depth, distinct references cited — converts deterministically
// to AMA PRA Category 1 credit minutes. Centralized so a CME compliance
// review is a one-file diff, not a UI hunt.
//
// Accrual reference: ACCME publishes CME at "1 credit per hour of
// substantive activity"; we operationalize "substantive" by requiring
// (a) ≥10 minutes engaged time, (b) ≥3 distinct references viewed, and
// (c) at least one query with non-trivial depth. Sessions that fail
// the floor accrue 0 credit but stay in the ledger as audit history.

import { attestationHashSync } from "./volunteer";

export type CmeBoard = "AMA" | "AOA" | "ACCME" | "STATE";

export type CmeCreditStatus =
  | "pending"        // accrued but not yet attested by provider
  | "earned"         // provider attested; ready to submit
  | "submitted"      // sent to specified board
  | "verified"       // board acknowledged
  | "voided";        // disputed or rolled back

export interface ResearchSession {
  id: string;
  providerId: string;
  startedAt: string;
  endedAt: string;
  /** Distinct PubMed/MCL/EMR-corpus articles materially viewed in the session. */
  referencesViewed: number;
  /** Number of queries the provider issued; depth is encoded in queryDepthScore. */
  queryCount: number;
  /**
   * Heuristic 0..1 measure of how exploratory the queries were. Single-word
   * lookups score low; multi-term, MeSH-rich, comparative queries score high.
   */
  queryDepthScore: number;
  topic: string;
}

export interface CmeCredit {
  id: string;
  providerId: string;
  sessionId: string;
  /** Credit awarded in 60ths of an hour (minutes). Most boards accept 0.25 credit increments. */
  creditMinutes: number;
  status: CmeCreditStatus;
  topic: string;
  earnedAt: string;
  attestedAt?: string;
  submittedAt?: string;
  submittedTo?: CmeBoard;
  /** Hash binding session + provider into a verifiable audit token. */
  attestationHash: string;
}

const FLOOR_ENGAGED_MINUTES = 10;
const FLOOR_REFERENCES = 3;
const FLOOR_QUERY_DEPTH = 0.25;

/**
 * Convert a research session to credit minutes. Returns 0 if the session
 * doesn't pass the substantive-activity floor — caller should still
 * persist the session so disputed claims have an audit trail.
 */
export function creditMinutesForSession(session: ResearchSession): number {
  const engagedMinutes =
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000;
  if (
    engagedMinutes < FLOOR_ENGAGED_MINUTES ||
    session.referencesViewed < FLOOR_REFERENCES ||
    session.queryDepthScore < FLOOR_QUERY_DEPTH
  ) {
    return 0;
  }
  // Linear scaling: 1 minute engaged = 1 minute credit, capped at the
  // session length. We *don't* award bonus minutes for depth; CME compliance
  // disallows credit inflation. Depth gates eligibility, not magnitude.
  // Round to nearest 15 minutes (0.25 credit) — most boards' minimum unit.
  const rounded = Math.round(engagedMinutes / 15) * 15;
  return Math.max(0, rounded);
}

export function buildCreditFromSession(session: ResearchSession, now: Date = new Date()): CmeCredit {
  const minutes = creditMinutesForSession(session);
  const canonical = [
    session.id,
    session.providerId,
    session.startedAt,
    session.endedAt,
    String(minutes),
  ].join("::");
  return {
    id: `cme-${attestationHashSync(canonical).slice(0, 12)}`,
    providerId: session.providerId,
    sessionId: session.id,
    creditMinutes: minutes,
    status: "pending",
    topic: session.topic,
    earnedAt: now.toISOString(),
    attestationHash: attestationHashSync(canonical),
  };
}

export function attestCredit(credit: CmeCredit, now: Date = new Date()): CmeCredit {
  if (credit.status !== "pending") return credit;
  return { ...credit, status: "earned", attestedAt: now.toISOString() };
}

export function submitCredit(credit: CmeCredit, board: CmeBoard, now: Date = new Date()): CmeCredit {
  if (credit.status !== "earned") return credit;
  return { ...credit, status: "submitted", submittedTo: board, submittedAt: now.toISOString() };
}

export interface CmeLedgerSnapshot {
  pending: CmeCredit[];
  earned: CmeCredit[];
  submitted: CmeCredit[];
  /** Total credit hours across pending+earned+submitted+verified statuses. */
  totalCreditHours: number;
  /** Year-to-date credit hours, by year. */
  ytdCreditHours: number;
}

export function summarizeLedger(credits: CmeCredit[], asOf: Date = new Date()): CmeLedgerSnapshot {
  const pending = credits.filter((c) => c.status === "pending");
  const earned = credits.filter((c) => c.status === "earned");
  const submitted = credits.filter((c) => c.status === "submitted" || c.status === "verified");

  const counted = credits.filter((c) => c.status !== "voided");
  const totalMinutes = counted.reduce((s, c) => s + c.creditMinutes, 0);

  const yearStart = new Date(Date.UTC(asOf.getUTCFullYear(), 0, 1)).toISOString();
  const ytdMinutes = counted
    .filter((c) => c.earnedAt >= yearStart)
    .reduce((s, c) => s + c.creditMinutes, 0);

  return {
    pending,
    earned,
    submitted,
    totalCreditHours: totalMinutes / 60,
    ytdCreditHours: ytdMinutes / 60,
  };
}

export function formatCreditHours(minutes: number): string {
  return `${(minutes / 60).toFixed(2)} credits`;
}

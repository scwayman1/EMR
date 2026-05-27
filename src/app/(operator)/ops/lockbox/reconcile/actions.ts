"use server";

// EMR-224 — server actions for the lockbox reconcile page.
// Accepts an uploaded bank-deposit CSV, parses it, runs the matcher against
// the org's open ERAs + insurance / patient payments, and returns the
// per-deposit outcome. The action is preview-only — it does not persist
// matches; the daily-close worker is what writes BankDepositMatch rows.

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  matchDeposit,
  parseBankCsv,
  type BankDepositRow,
  type MatchCandidate,
  type MatchOutcome,
} from "@/lib/billing/lockbox";

export interface ReconcilePreviewRow {
  bankReference: string;
  depositDate: string;
  amountCents: number;
  source: string;
  outcome: MatchOutcome;
}

export interface ReconcilePreviewResult {
  ok: true;
  totalRows: number;
  parseErrors: Array<{ row: number; message: string }>;
  rows: ReconcilePreviewRow[];
  totals: {
    deposited: number;
    matched: number;
    variance: number;
    matchedRows: number;
    partialRows: number;
    unmatchedRows: number;
  };
}

export type ReconcilePreviewError = { ok: false; error: string };

export async function previewReconcileCsv(
  formData: FormData,
): Promise<ReconcilePreviewResult | ReconcilePreviewError> {
  const user = await requireUser();
  if (!user.organizationId) return { ok: false, error: "No organization in session" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file uploaded" };
  if (file.size === 0) return { ok: false, error: "Uploaded file is empty" };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "CSV exceeds 5MB cap" };

  const csv = await file.text();
  const parsed = parseBankCsv(csv);
  if (parsed.rows.length === 0) {
    return {
      ok: true,
      totalRows: 0,
      parseErrors: parsed.errors,
      rows: [],
      totals: { deposited: 0, matched: 0, variance: 0, matchedRows: 0, partialRows: 0, unmatchedRows: 0 },
    };
  }

  const candidates = await loadCandidates(user.organizationId, parsed.rows);

  const previews: ReconcilePreviewRow[] = parsed.rows.map((row) => {
    const outcome = matchDeposit(row, candidates);
    // Mark matched candidates so a single ERA isn't counted twice across
    // sibling deposits — the matcher itself doesn't track consumption.
    for (const a of outcome.assignments) {
      const idx = candidates.findIndex(
        (c) => c.kind === a.candidate.kind && c.id === a.candidate.id,
      );
      if (idx >= 0) candidates.splice(idx, 1);
    }
    return {
      bankReference: row.bankReference,
      depositDate: row.depositDate.toISOString().slice(0, 10),
      amountCents: row.amountCents,
      source: row.source,
      outcome,
    };
  });

  const deposited = previews.reduce((a, r) => a + r.amountCents, 0);
  const matched = previews.reduce((a, r) => a + r.outcome.matchedCents, 0);
  const matchedRows = previews.filter((r) => r.outcome.status === "matched").length;
  const partialRows = previews.filter((r) => r.outcome.status === "partially_matched").length;
  const unmatchedRows = previews.filter(
    (r) => r.outcome.status === "unmatched" || r.outcome.status === "variance",
  ).length;

  return {
    ok: true,
    totalRows: previews.length,
    parseErrors: parsed.errors,
    rows: previews,
    totals: { deposited, matched, variance: deposited - matched, matchedRows, partialRows, unmatchedRows },
  };
}

// ---------------------------------------------------------------------------
// Candidate loader — ERAs + Payments not yet tied to a BankDepositMatch
// ---------------------------------------------------------------------------

async function loadCandidates(
  organizationId: string,
  deposits: BankDepositRow[],
): Promise<MatchCandidate[]> {
  if (deposits.length === 0) return [];
  const minDate = new Date(Math.min(...deposits.map((d) => d.depositDate.getTime())));
  const maxDate = new Date(Math.max(...deposits.map((d) => d.depositDate.getTime())));
  // ± 7 days padding so the matcher's 5-day window has room.
  const lookbackStart = new Date(minDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lookbackEnd = new Date(maxDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [eraFiles, payments] = await Promise.all([
    prisma.eraFile.findMany({
      where: {
        organizationId,
        checkDate: { gte: lookbackStart, lte: lookbackEnd },
      },
      select: {
        id: true,
        payerName: true,
        checkNumber: true,
        checkDate: true,
        totalAmountCents: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        claim: { organizationId },
        paymentDate: { gte: lookbackStart, lte: lookbackEnd },
      },
      select: {
        id: true,
        amountCents: true,
        paymentDate: true,
        source: true,
        reference: true,
      },
    }),
  ]);

  const candidates: MatchCandidate[] = [];
  for (const e of eraFiles) {
    candidates.push({
      kind: "era",
      id: e.id,
      amountCents: e.totalAmountCents,
      expectedDate: e.checkDate,
      label: `ERA ${e.payerName} · ${e.checkNumber}`,
    });
  }
  for (const p of payments) {
    candidates.push({
      kind: "payment",
      id: p.id,
      amountCents: p.amountCents,
      expectedDate: p.paymentDate,
      label: `${p.source} payment · ${p.reference ?? "no ref"}`,
    });
  }
  return candidates;
}

"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain/billing";
import { previewReconcileCsv, type ReconcilePreviewResult } from "./actions";

type Status = "matched" | "partially_matched" | "unmatched" | "variance";

const STATUS_TONE: Record<Status, "success" | "warning" | "danger"> = {
  matched: "success",
  partially_matched: "warning",
  unmatched: "danger",
  variance: "danger",
};

export function ReconcileForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReconcilePreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await previewReconcileCsv(fd);
      if (!r.ok) {
        setError(r.error);
        setResult(null);
        return;
      }
      setResult(r);
    });
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-accent file:text-accent-ink file:cursor-pointer hover:file:bg-accent-strong"
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Matching…" : "Preview match"}
          </Button>
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </form>

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: ReconcilePreviewResult }) {
  const matchRate = result.totals.deposited > 0
    ? Math.round((result.totals.matched / result.totals.deposited) * 100)
    : 0;

  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Match rate" value={`${matchRate}%`} hint={`${formatMoney(result.totals.matched)} / ${formatMoney(result.totals.deposited)}`} />
        <Stat label="Matched" value={String(result.totals.matchedRows)} hint={`${result.totals.matchedRows} rows`} />
        <Stat label="Partial" value={String(result.totals.partialRows)} hint="needs review" />
        <Stat label="Variance" value={formatMoney(Math.abs(result.totals.variance))} hint="unmatched amount" />
      </div>

      {result.parseErrors.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-900 mb-1">{result.parseErrors.length} parse warning(s)</p>
          <ul className="list-disc list-inside text-amber-900 space-y-0.5">
            {result.parseErrors.slice(0, 5).map((e, i) => (
              <li key={i}>row {e.row}: {e.message}</li>
            ))}
            {result.parseErrors.length > 5 && <li>… and {result.parseErrors.length - 5} more</li>}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Reference</th>
              <th className="py-2 pr-4">Source</th>
              <th className="py-2 pr-4 text-right">Amount</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Match details</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={`${row.bankReference}-${i}`} className="border-b last:border-b-0 align-top">
                <td className="py-2 pr-4 tabular-nums">{row.depositDate}</td>
                <td className="py-2 pr-4 font-mono text-xs">{row.bankReference}</td>
                <td className="py-2 pr-4">
                  <span className="text-[11px] uppercase text-text-subtle">{row.source}</span>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(row.amountCents)}</td>
                <td className="py-2 pr-4">
                  <Badge tone={STATUS_TONE[row.outcome.status]}>{row.outcome.status.replace("_", " ")}</Badge>
                </td>
                <td className="py-2 pr-4">
                  <p className="text-text-muted">{row.outcome.reason}</p>
                  {row.outcome.assignments.length > 0 && (
                    <ul className="mt-1 text-xs text-text-subtle space-y-0.5">
                      {row.outcome.assignments.map((a, j) => (
                        <li key={j}>
                          {a.candidate.label} <span className="tabular-nums">({formatMoney(a.appliedCents)})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {row.outcome.varianceCents !== 0 && row.outcome.status !== "unmatched" && (
                    <p className="text-danger text-xs mt-0.5">Δ {formatMoney(Math.abs(row.outcome.varianceCents))}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border-strong bg-surface p-3">
      <p className="font-display text-2xl tabular-nums text-text">{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
      {hint && <p className="text-[10px] text-text-subtle mt-1">{hint}</p>}
    </div>
  );
}

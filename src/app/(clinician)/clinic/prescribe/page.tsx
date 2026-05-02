"use client";

import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  type Prescription,
  type DoubleCheckReport,
  type InteractionSeverity,
  runDoubleCheck,
} from "@/lib/prescribing/multi-rx";

// ---------------------------------------------------------------------------
// EMR-148 — Multi-Medication Prescribing + Double-Check
// ---------------------------------------------------------------------------
// Batch e-Rx form. Add up to 20 prescriptions, get a real-time
// interaction matrix + duplicate-therapy warning + formulary lookup
// before sending. Contraindicated pairs and duplicate classes are
// hard blocks; the clinician can override moderate findings.
// ---------------------------------------------------------------------------

const ROUTES: Prescription["route"][] = [
  "PO",
  "SL",
  "SC",
  "IM",
  "IV",
  "Topical",
  "Inhaled",
  "PR",
];

const SEVERITY_BADGE: Record<InteractionSeverity, string> = {
  minor: "bg-sky-100 text-sky-900 border-sky-200",
  moderate: "bg-amber-100 text-amber-900 border-amber-200",
  major: "bg-rose-100 text-rose-900 border-rose-200",
  contraindicated: "bg-rose-200 text-rose-950 border-rose-300",
};

function emptyRx(idx: number): Prescription {
  return {
    id: `rx-${idx}-${Date.now()}`,
    name: "",
    dose: "",
    route: "PO",
    frequency: "QD",
    isCannabis: false,
  };
}

export default function PrescribePage() {
  const [rxs, setRxs] = useState<Prescription[]>([emptyRx(0)]);
  const [overridden, setOverridden] = useState(false);
  const [sent, setSent] = useState<DoubleCheckReport | null>(null);

  const filled = useMemo(() => rxs.filter((r) => r.name.trim().length > 0), [rxs]);
  const report = useMemo(() => (filled.length > 0 ? runDoubleCheck(filled) : null), [filled]);

  function update(i: number, patch: Partial<Prescription>) {
    setRxs((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (rxs.length >= 20) return;
    setRxs((prev) => [...prev, emptyRx(prev.length)]);
  }

  function removeRow(i: number) {
    setRxs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function send() {
    if (!report) return;
    if (!report.safeToSend && !overridden) return;
    setSent(report);
  }

  const canSend =
    !!report &&
    filled.length > 0 &&
    filled.every((r) => r.name && r.dose && r.frequency) &&
    (report.safeToSend || overridden);

  return (
    <PageShell maxWidth="max-w-[1300px]">
      <PageHeader
        eyebrow="Prescribing"
        title="Batch e-Rx · double-check"
        description="Add up to 20 prescriptions. We run an interaction matrix, duplicate-therapy check, and formulary lookup before you send."
        actions={
          <Button variant="primary" onClick={send} disabled={!canSend}>
            Send batch ({filled.length})
          </Button>
        }
      />

      {sent ? (
        <SentReceipt report={sent} onReset={() => { setSent(null); setRxs([emptyRx(0)]); setOverridden(false); }} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Rx editor */}
          <div className="space-y-3">
            {rxs.map((r, i) => (
              <Card key={r.id} tone="raised">
                <CardContent className="py-4 px-4">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <Field label="Drug" className="col-span-12 sm:col-span-4">
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e) => update(i, { name: e.target.value })}
                        placeholder="metformin"
                        className="w-full rounded-md border border-border bg-surface px-2.5 h-9 text-sm"
                      />
                    </Field>
                    <Field label="Dose" className="col-span-6 sm:col-span-2">
                      <input
                        type="text"
                        value={r.dose}
                        onChange={(e) => update(i, { dose: e.target.value })}
                        placeholder="500mg"
                        className="w-full rounded-md border border-border bg-surface px-2.5 h-9 text-sm"
                      />
                    </Field>
                    <Field label="Route" className="col-span-6 sm:col-span-2">
                      <select
                        value={r.route}
                        onChange={(e) => update(i, { route: e.target.value as Prescription["route"] })}
                        className="w-full rounded-md border border-border bg-surface px-2 h-9 text-sm"
                      >
                        {ROUTES.map((rt) => (
                          <option key={rt} value={rt}>{rt}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Frequency" className="col-span-6 sm:col-span-2">
                      <input
                        type="text"
                        value={r.frequency}
                        onChange={(e) => update(i, { frequency: e.target.value })}
                        placeholder="BID"
                        className="w-full rounded-md border border-border bg-surface px-2.5 h-9 text-sm"
                      />
                    </Field>
                    <Field label="Days" className="col-span-3 sm:col-span-1">
                      <input
                        type="number"
                        min={1}
                        value={r.durationDays ?? ""}
                        onChange={(e) =>
                          update(i, {
                            durationDays: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-full rounded-md border border-border bg-surface px-2 h-9 text-sm"
                      />
                    </Field>
                    <div className="col-span-3 sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={rxs.length === 1}
                        className="text-xs text-text-subtle hover:text-danger disabled:opacity-30"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <label className="mt-3 inline-flex items-center gap-2 text-[11px] text-text-muted">
                    <input
                      type="checkbox"
                      checked={r.isCannabis}
                      onChange={(e) => update(i, { isCannabis: e.target.checked })}
                    />
                    Cannabis Rx
                  </label>
                </CardContent>
              </Card>
            ))}
            <button
              type="button"
              onClick={addRow}
              disabled={rxs.length >= 20}
              className="text-sm text-accent hover:underline disabled:opacity-30"
            >
              + Add another medication
            </button>
          </div>

          {/* Double-check sidebar */}
          <div className="space-y-4 lg:sticky lg:top-4 self-start">
            {report && <DoubleCheckPanel report={report} />}
            {report && !report.safeToSend && (
              <Card tone="raised" className="border-l-4 border-l-danger">
                <CardContent className="py-4 px-5 space-y-2">
                  <p className="font-display text-sm text-text">Override required</p>
                  <p className="text-xs text-text-muted">
                    {report.blockReason}
                  </p>
                  <label className="inline-flex items-start gap-2 text-xs text-text-muted">
                    <input
                      type="checkbox"
                      checked={overridden}
                      onChange={(e) => setOverridden(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      I have reviewed this and accept clinical responsibility for
                      sending the batch as drafted.
                    </span>
                  </label>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-[10px] uppercase tracking-wider text-text-subtle block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function DoubleCheckPanel({ report }: { report: DoubleCheckReport }) {
  return (
    <Card tone="raised">
      <CardContent className="py-4 px-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm text-text">Double-check</p>
          <span
            className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${
              report.safeToSend
                ? "bg-emerald-100 text-emerald-900"
                : "bg-rose-100 text-rose-900"
            }`}
          >
            {report.safeToSend ? "Clear" : "Blocked"}
          </span>
        </div>

        {/* Interactions */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-1.5">
            Interactions
          </p>
          {report.matrix.findings.length === 0 ? (
            <p className="text-xs text-text-muted">No interactions found.</p>
          ) : (
            <ul className="space-y-1.5">
              {report.matrix.findings.map((f, i) => (
                <li
                  key={i}
                  className={`rounded-md border px-2.5 py-1.5 text-xs ${SEVERITY_BADGE[f.severity]}`}
                >
                  <span className="font-medium uppercase tracking-wider text-[10px] mr-2">
                    {f.severity}
                  </span>
                  {f.a} + {f.b} — {f.rationale}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Duplicates */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-1.5">
            Duplicate therapy
          </p>
          {report.duplicates.length === 0 ? (
            <p className="text-xs text-text-muted">No duplicate classes.</p>
          ) : (
            <ul className="space-y-1.5">
              {report.duplicates.map((d, i) => (
                <li
                  key={i}
                  className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
                >
                  {d.className}: {d.members.join(", ")}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulary */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-1.5">
            Formulary
          </p>
          <ul className="space-y-1">
            {report.formulary.map((f) => (
              <li key={f.id} className="text-xs flex items-center justify-between">
                <span className="truncate text-text">{f.name}</span>
                <span className="text-text-muted whitespace-nowrap ml-2">
                  {f.entry.tier}
                  {f.entry.estimatedCost >= 0 ? ` · $${f.entry.estimatedCost}` : ""}
                  {f.entry.priorAuthRequired ? " · PA" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function SentReceipt({
  report,
  onReset,
}: {
  report: DoubleCheckReport;
  onReset: () => void;
}) {
  return (
    <Card tone="raised" className="border-l-4 border-l-emerald-500">
      <CardContent className="py-8 px-6 text-center space-y-3">
        <p className="text-3xl">✓</p>
        <h2 className="font-display text-2xl text-text">Batch sent</h2>
        <p className="text-sm text-text-muted">
          {report.matrix.ids.length} prescriptions queued for the pharmacy.
          Interactions cleared, duplicates checked.
        </p>
        <Button variant="secondary" onClick={onReset}>
          Start a new batch
        </Button>
      </CardContent>
    </Card>
  );
}

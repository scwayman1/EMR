"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Collapsible } from "@/components/ui/collapsible";
import { ClaudeProcessing } from "@/components/ui/claude-processing";
import { searchFormulary, type AdministrationRecord } from "@/lib/domain/emar";
import { logAdministrationAction } from "./actions";

type CannabisRegimen = {
  id: string;
  productName: string;
  volumePerDose: number;
  volumeUnit: string;
  frequencyPerDay: number;
};

type ConventionalMed = {
  id: string;
  name: string;
  dosage: string | null;
};

type Props = {
  patientId: string;
  cannabisRegimens: CannabisRegimen[];
  conventionalMeds: ConventionalMed[];
  history: AdministrationRecord[];
};

export function EmarView({ patientId, cannabisRegimens, conventionalMeds, history }: Props) {
  return (
    <div className="space-y-6">
      <LogPanel
        patientId={patientId}
        cannabisRegimens={cannabisRegimens}
        conventionalMeds={conventionalMeds}
      />

      <div>
        <h2 className="text-[11px] uppercase tracking-[0.12em] text-text-subtle font-medium mb-3">
          Administration history · last {history.length}
        </h2>
        {history.length === 0 ? (
          <EmptyState
            title="No doses logged yet"
            description="Use the form above to record the first administration. Every dose appears here in reverse-chronological order with the MA who logged it."
          />
        ) : (
          <Card>
            <CardContent className="pt-4">
              <ul className="divide-y divide-border/60">
                {history.map((rec) => (
                  <li key={rec.id} className="py-3 flex items-start gap-4">
                    <span className="text-[11px] font-mono tabular-nums text-text-subtle w-32 shrink-0 pt-0.5">
                      {formatDateTime(rec.administeredAtIso)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text">
                        <span className="font-medium">{rec.medicationLabel}</span>{" "}
                        <span className="text-text-subtle">
                          · {rec.amount} {rec.unit} · {rec.route}
                        </span>
                      </p>
                      {(rec.indication || rec.notes) && (
                        <p className="text-[12px] text-text-muted mt-0.5">
                          {rec.indication && <span>For: {rec.indication}</span>}
                          {rec.indication && rec.notes && " · "}
                          {rec.notes}
                        </p>
                      )}
                      {rec.administeredByName && (
                        <p className="text-[10px] text-text-subtle mt-1">
                          By {rec.administeredByName}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LogPanel({
  patientId,
  cannabisRegimens,
  conventionalMeds,
}: {
  patientId: string;
  cannabisRegimens: CannabisRegimen[];
  conventionalMeds: ConventionalMed[];
}) {
  const [tab, setTab] = React.useState<"cannabis" | "conventional" | "freeform">(
    cannabisRegimens.length > 0 ? "cannabis" : "freeform",
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const submit = async (input: Parameters<typeof logAdministrationAction>[0]) => {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await logAdministrationAction(input);
      if (!r.ok) setError(r.error);
      else setSuccess(`Logged ${input.medicationLabel}.`);
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-text-subtle font-medium">
            Log a dose
          </p>
          <div className="inline-flex rounded-md border border-border bg-surface text-[11px]">
            {([
              ["cannabis", "Cannabis"],
              ["conventional", "Conventional"],
              ["freeform", "Other"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 ${tab === k ? "bg-accent text-accent-ink rounded-md" : "text-text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "cannabis" && (
          <CannabisQuickLog
            patientId={patientId}
            regimens={cannabisRegimens}
            onSubmit={submit}
            disabled={pending}
          />
        )}
        {tab === "conventional" && (
          <ConventionalQuickLog
            patientId={patientId}
            meds={conventionalMeds}
            onSubmit={submit}
            disabled={pending}
          />
        )}
        {tab === "freeform" && (
          <FreeformLog patientId={patientId} onSubmit={submit} disabled={pending} />
        )}

        <div className="mt-4 min-h-[20px] flex items-center gap-3">
          {pending && <ClaudeProcessing label="Recording" inline />}
          {error && <span className="text-sm text-danger">{error}</span>}
          {success && <span className="text-sm text-success">{success}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function CannabisQuickLog({
  patientId,
  regimens,
  onSubmit,
  disabled,
}: {
  patientId: string;
  regimens: CannabisRegimen[];
  onSubmit: (i: Parameters<typeof logAdministrationAction>[0]) => void;
  disabled: boolean;
}) {
  if (regimens.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No active cannabis regimens. Use Other to log an ad-hoc dose.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {regimens.map((r) => (
        <div key={r.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">{r.productName}</p>
            <p className="text-[11px] text-text-subtle">
              {r.volumePerDose} {r.volumeUnit} × {r.frequencyPerDay}/day
            </p>
          </div>
          <Button
            size="sm"
            disabled={disabled}
            onClick={() =>
              onSubmit({
                patientId,
                cannabisRegimenId: r.id,
                medicationLabel: r.productName,
                amount: r.volumePerDose,
                unit: r.volumeUnit,
                route: "oral",
              })
            }
          >
            Log dose
          </Button>
        </div>
      ))}
    </div>
  );
}

function ConventionalQuickLog({
  patientId,
  meds,
  onSubmit,
  disabled,
}: {
  patientId: string;
  meds: ConventionalMed[];
  onSubmit: (i: Parameters<typeof logAdministrationAction>[0]) => void;
  disabled: boolean;
}) {
  if (meds.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No active conventional medications on file. Use Other to log an ad-hoc dose.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {meds.map((m) => {
        const parsedDose = parseDose(m.dosage);
        return (
          <div key={m.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text truncate">{m.name}</p>
              {m.dosage && <p className="text-[11px] text-text-subtle">{m.dosage}</p>}
            </div>
            <Button
              size="sm"
              disabled={disabled}
              onClick={() =>
                onSubmit({
                  patientId,
                  patientMedicationId: m.id,
                  medicationLabel: m.name,
                  amount: parsedDose?.amount ?? 1,
                  unit: parsedDose?.unit ?? "dose",
                  route: "oral",
                })
              }
            >
              Log dose
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function FreeformLog({
  patientId,
  onSubmit,
  disabled,
}: {
  patientId: string;
  onSubmit: (i: Parameters<typeof logAdministrationAction>[0]) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<{
    label: string;
    amount: number;
    unit: string;
    route: string;
  } | null>(null);
  const [indication, setIndication] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const matches = React.useMemo(() => searchFormulary(query), [query]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search formulary (top 200) or type a medication name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPicked(null);
        }}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
      />
      {!picked && query.length > 0 && (
        <Collapsible title={`Formulary matches (${matches.length})`} defaultOpen>
          <ul className="space-y-1.5">
            {matches.map((m) => (
              <li key={m.generic}>
                <button
                  onClick={() =>
                    setPicked({
                      label: m.brand ? `${m.brand} (${m.generic})` : m.generic,
                      amount: m.defaultDoseMg ?? 1,
                      unit: m.unit,
                      route: m.route,
                    })
                  }
                  className="w-full text-left text-sm hover:bg-surface-muted/40 rounded px-2 py-1.5"
                >
                  <span className="font-medium">{m.brand ?? m.generic}</span>
                  {m.brand && <span className="text-text-subtle"> · {m.generic}</span>}
                  {m.defaultDoseMg && (
                    <span className="text-text-subtle">
                      {" "}· default {m.defaultDoseMg} {m.unit} {m.route}
                    </span>
                  )}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() =>
                  setPicked({
                    label: query.trim(),
                    amount: 1,
                    unit: "dose",
                    route: "oral",
                  })
                }
                className="w-full text-left text-sm text-accent hover:bg-accent-soft/40 rounded px-2 py-1.5"
              >
                + Use "{query}" as a free-text label
              </button>
            </li>
          </ul>
        </Collapsible>
      )}

      {picked && (
        <Card tone="ambient">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm">
              <span className="font-medium">{picked.label}</span>{" "}
              <span className="text-text-subtle">· {picked.amount} {picked.unit} {picked.route}</span>
            </p>
            <input
              type="text"
              placeholder="Indication (optional)"
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={() =>
                  onSubmit({
                    patientId,
                    medicationLabel: picked.label,
                    amount: picked.amount,
                    unit: picked.unit,
                    route: picked.route,
                    indication: indication || undefined,
                    notes: notes || undefined,
                  })
                }
                disabled={disabled}
              >
                Log dose
              </Button>
              <Button variant="ghost" onClick={() => setPicked(null)}>
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function parseDose(text: string | null): { amount: number; unit: string } | null {
  if (!text) return null;
  const m = text.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|ml|units?)/i);
  if (!m) return null;
  return { amount: Number(m[1]), unit: m[2].toLowerCase() };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeafSprig } from "@/components/ui/ornament";
import {
  suggestTitration,
  approveTitrationSuggestion,
  rejectTitrationSuggestion,
} from "./actions";
import type { TitrationSuggestion } from "@/lib/agents/titration-agent";

export interface RegimenSummary {
  id: string;
  productName: string;
  volumePerDose: number;
  volumeUnit: string;
  frequencyPerDay: number;
  thcMgPerDose: number | null;
  cbdMgPerDose: number | null;
  timingInstructions: string | null;
}

export interface PendingSuggestion {
  jobId: string;
  regimenId: string;
  suggestion: TitrationSuggestion;
  createdAt: string;
}

function recommendationTone(rec: TitrationSuggestion["recommendation"]) {
  if (rec === "increase") return "highlight" as const;
  if (rec === "decrease") return "warning" as const;
  return "success" as const;
}

function recommendationLabel(rec: TitrationSuggestion["recommendation"]) {
  if (rec === "increase") return "Increase dose";
  if (rec === "decrease") return "Decrease dose";
  return "Maintain dose";
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-surface-muted overflow-hidden">
        <div
          className="h-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-text-subtle tabular-nums">
        {pct}% confident
      </span>
    </div>
  );
}

function PendingCard({
  pending,
  patientId,
  regimen,
  onAction,
}: {
  pending: PendingSuggestion;
  patientId: string;
  regimen: RegimenSummary | undefined;
  onAction: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    const fd = new FormData();
    fd.set("jobId", pending.jobId);
    fd.set("patientId", patientId);
    startTransition(async () => {
      const result = await approveTitrationSuggestion(fd);
      if (!result.ok) setError(result.error);
      else onAction();
    });
  }

  function reject() {
    setError(null);
    const fd = new FormData();
    fd.set("jobId", pending.jobId);
    fd.set("patientId", patientId);
    startTransition(async () => {
      const result = await rejectTitrationSuggestion(fd);
      if (!result.ok) setError(result.error);
      else onAction();
    });
  }

  const s = pending.suggestion;
  const productName = regimen?.productName ?? "Regimen";

  return (
    <Card tone="ambient" className="border-l-4 border-l-accent">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LeafSprig size={18} className="text-accent" />
              Suggestion for {productName}
            </CardTitle>
            <CardDescription className="mt-1">
              Generated {new Date(pending.createdAt).toLocaleString()} · pending your review
            </CardDescription>
          </div>
          <Badge tone={recommendationTone(s.recommendation)}>
            {recommendationLabel(s.recommendation)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-surface/80 border border-border p-4 space-y-3">
          {typeof s.suggestedDose === "number" && regimen && (
            <div className="flex items-baseline gap-3">
              <span className="text-xs uppercase tracking-wider text-text-subtle">
                Suggested dose
              </span>
              <span className="font-display text-xl text-accent tabular-nums">
                {s.suggestedDose} {regimen.volumeUnit}
              </span>
              <span className="text-xs text-text-subtle">
                (currently {regimen.volumePerDose} {regimen.volumeUnit})
              </span>
            </div>
          )}
          <p className="text-sm text-text leading-relaxed">{s.reasoning}</p>
          <ConfidenceMeter value={s.confidence} />
        </div>
        {error && (
          <p className="mt-3 text-xs text-danger">{error}</p>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-[10px] text-text-subtle italic max-w-md">
          Decision support only. Approving here records your sign-off; the
          actual prescription update happens in the Prescribe flow.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={reject}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isPending}
            onClick={approve}
          >
            {isPending ? "Saving..." : "Approve"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function RegimenCard({
  regimen,
  patientId,
  hasPending,
  onSuggested,
}: {
  regimen: RegimenSummary;
  patientId: string;
  hasPending: boolean;
  onSuggested: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    const fd = new FormData();
    fd.set("patientId", patientId);
    fd.set("regimenId", regimen.id);
    startTransition(async () => {
      const result = await suggestTitration(fd);
      if (!result.ok) setError(result.error);
      else onSuggested();
    });
  }

  return (
    <Card tone="raised">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg">{regimen.productName}</CardTitle>
            <CardDescription>
              {regimen.volumePerDose} {regimen.volumeUnit} · {regimen.frequencyPerDay}x/day
              {regimen.timingInstructions ? ` · ${regimen.timingInstructions}` : ""}
            </CardDescription>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={isPending || hasPending}
            onClick={handleClick}
          >
            {hasPending
              ? "Suggestion pending"
              : isPending
                ? "Thinking..."
                : "Suggest titration"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-subtle">
              THC per dose
            </p>
            <p className="text-text mt-0.5 tabular-nums">
              {regimen.thcMgPerDose != null ? `${regimen.thcMgPerDose} mg` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-subtle">
              CBD per dose
            </p>
            <p className="text-text mt-0.5 tabular-nums">
              {regimen.cbdMgPerDose != null ? `${regimen.cbdMgPerDose} mg` : "—"}
            </p>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-xs text-danger">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TitrationView({
  patientId,
  regimens,
  pending: initialPending,
}: {
  patientId: string;
  regimens: RegimenSummary[];
  pending: PendingSuggestion[];
}) {
  // We track a refresh counter; server actions revalidate the path which will
  // refetch on next navigation. The state changes here just keep the page in
  // sync between actions for the same render lifecycle.
  const [revision, setRevision] = useState(0);
  const noop = () => setRevision((r) => r + 1);
  void revision;

  const pendingByRegimen = new Map<string, PendingSuggestion>();
  for (const p of initialPending) pendingByRegimen.set(p.regimenId, p);

  return (
    <div className="space-y-6">
      {initialPending.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-text mb-3">
            Pending suggestions
          </h2>
          <div className="space-y-4">
            {initialPending.map((p) => (
              <PendingCard
                key={p.jobId}
                pending={p}
                patientId={patientId}
                regimen={regimens.find((r) => r.id === p.regimenId)}
                onAction={noop}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg text-text mb-3">
          Active regimens
        </h2>
        <div className="space-y-4">
          {regimens.map((r) => (
            <RegimenCard
              key={r.id}
              regimen={r}
              patientId={patientId}
              hasPending={pendingByRegimen.has(r.id)}
              onSuggested={noop}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

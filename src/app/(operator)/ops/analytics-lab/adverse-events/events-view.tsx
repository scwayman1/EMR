"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { AdverseEvent } from "@/lib/domain/overnight-batch";

type Severity = "all" | "mild" | "moderate" | "severe";

const SEVERITY_TONE: Record<
  AdverseEvent["severity"],
  "success" | "warning" | "danger"
> = {
  mild: "success",
  moderate: "warning",
  severe: "danger",
};

const CAUSALITY_TONE: Record<
  AdverseEvent["causalityAssessment"],
  "success" | "warning" | "danger" | "neutral"
> = {
  probable: "danger",
  possible: "warning",
  unlikely: "success",
  unassessed: "neutral",
};

export function EventsView({
  events: initialEvents,
  eventTypes,
}: {
  events: AdverseEvent[];
  eventTypes: readonly string[];
}) {
  const [events, setEvents] = useState<AdverseEvent[]>(initialEvents);
  const [severity, setSeverity] = useState<Severity>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    event: eventTypes[0] ?? "",
    severity: "mild" as AdverseEvent["severity"],
    causality: "possible" as AdverseEvent["causalityAssessment"],
    products: "",
    action: "",
  });

  const filtered = useMemo(
    () => (severity === "all" ? events : events.filter((e) => e.severity === severity)),
    [events, severity]
  );

  // Frequency chart
  const typeFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.event] = (counts[e.event] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [events]);

  const maxFreq = Math.max(1, ...typeFrequency.map(([, c]) => c));

  // Causality breakdown
  const causalityCounts = useMemo(() => {
    const base: Record<AdverseEvent["causalityAssessment"], number> = {
      probable: 0,
      possible: 0,
      unlikely: 0,
      unassessed: 0,
    };
    for (const e of events) base[e.causalityAssessment]++;
    return base;
  }, [events]);

  const totalCausality = events.length || 1;

  function submit() {
    const newEvent: AdverseEvent = {
      id: `ae-new-${Date.now()}`,
      patientId: form.patientId || "pt-new",
      event: form.event,
      severity: form.severity,
      reportedAt: new Date().toISOString(),
      causalityAssessment: form.causality,
      productsInvolved: form.products
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      action: form.action,
    };
    setEvents([newEvent, ...events]);
    setShowForm(false);
    setForm({
      patientId: "",
      event: eventTypes[0] ?? "",
      severity: "mild",
      causality: "possible",
      products: "",
      action: "",
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "mild", "moderate", "severe"] as Severity[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={cn(
                "h-9 px-4 rounded-full text-sm font-medium border transition-all capitalize",
                severity === s
                  ? "bg-accent text-accent-ink border-accent"
                  : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Report new event"}
        </Button>
      </div>

      {showForm && (
        <Card tone="raised" className="mb-6">
          <CardHeader>
            <CardTitle>Report new adverse event</CardTitle>
            <CardDescription>
              Captured for pharmacovigilance and clinical review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Patient ID">
                <input
                  value={form.patientId}
                  onChange={(e) =>
                    setForm({ ...form, patientId: e.target.value })
                  }
                  placeholder="pt-…"
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                />
              </Field>
              <Field label="Event">
                <select
                  value={form.event}
                  onChange={(e) => setForm({ ...form, event: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                >
                  {eventTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Severity">
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      severity: e.target.value as AdverseEvent["severity"],
                    })
                  }
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </Field>
              <Field label="Causality">
                <select
                  value={form.causality}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      causality: e.target
                        .value as AdverseEvent["causalityAssessment"],
                    })
                  }
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                >
                  <option value="probable">Probable</option>
                  <option value="possible">Possible</option>
                  <option value="unlikely">Unlikely</option>
                  <option value="unassessed">Unassessed</option>
                </select>
              </Field>
              <Field label="Products involved (comma-separated)">
                <input
                  value={form.products}
                  onChange={(e) =>
                    setForm({ ...form, products: e.target.value })
                  }
                  placeholder="Balanced 1:1 Tincture"
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                />
              </Field>
              <Field label="Action taken">
                <input
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  placeholder="Dose reduced; monitored…"
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={submit}>Save event</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card tone="raised" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Event type frequency</CardTitle>
            <CardDescription>Most common events across the cohort.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {typeFrequency.map(([name, count]) => (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">{name}</span>
                    <span className="tabular-nums text-text">{count}</span>
                  </div>
                  <div className="h-3 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxFreq) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {typeFrequency.length === 0 && (
                <p className="text-sm text-text-subtle">No events recorded.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardHeader>
            <CardTitle>Causality breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(
                [
                  "probable",
                  "possible",
                  "unlikely",
                  "unassessed",
                ] as AdverseEvent["causalityAssessment"][]
              ).map((k) => {
                const n = causalityCounts[k];
                const pct = Math.round((n / totalCausality) * 100);
                return (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize text-text-muted">{k}</span>
                      <span className="tabular-nums text-text">
                        {n} · {pct}%
                      </span>
                    </div>
                    <div className="h-3 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          k === "probable" && "bg-red-500",
                          k === "possible" && "bg-amber-400",
                          k === "unlikely" && "bg-emerald-400",
                          k === "unassessed" && "bg-slate-400"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card tone="raised">
        <CardHeader>
          <CardTitle>
            Recent events{" "}
            <Badge tone="neutral" className="ml-2">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                    Reported
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                    Patient
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                    Event
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                    Severity
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                    Causality
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                    Products
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="px-6 py-3 text-xs text-text-subtle">
                      {new Date(e.reportedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text">
                      {e.patientId}
                    </td>
                    <td className="px-4 py-3 text-text">{e.event}</td>
                    <td className="px-4 py-3">
                      <Badge tone={SEVERITY_TONE[e.severity]}>
                        {e.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={CAUSALITY_TONE[e.causalityAssessment]}>
                        {e.causalityAssessment}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {e.productsInvolved.join(", ")}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted max-w-xs">
                      {e.action}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-text-subtle"
                    >
                      No events match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

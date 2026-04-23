"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, Input, Textarea } from "@/components/ui/input";
import {
  INCIDENT_CATEGORY_LABELS,
  type IncidentCategory,
  type IncidentReport,
  type IncidentSeverity,
} from "@/lib/domain/overnight-batch";
import { cn } from "@/lib/utils/cn";

const SEVERITY_TONES: Record<IncidentSeverity, "neutral" | "warning" | "highlight" | "danger"> = {
  low: "neutral",
  medium: "warning",
  high: "highlight",
  critical: "danger",
};

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const SEVERITY_ORDER: IncidentSeverity[] = ["low", "medium", "high", "critical"];
const CATEGORY_OPTIONS = Object.keys(INCIDENT_CATEGORY_LABELS) as IncidentCategory[];

export function IncidentsView({ initialIncidents }: { initialIncidents: IncidentReport[] }) {
  const [incidents, setIncidents] = useState<IncidentReport[]>(initialIncidents);
  const [severityFilter, setSeverityFilter] = useState<"all" | IncidentSeverity>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | IncidentCategory>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [resolving, setResolving] = useState<IncidentReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [draft, setDraft] = useState({
    severity: "low" as IncidentSeverity,
    category: "safety" as IncidentCategory,
    title: "",
    description: "",
    patientAffected: false,
  });

  const filtered = useMemo(() => {
    return incidents
      .filter((i) => (severityFilter === "all" ? true : i.severity === severityFilter))
      .filter((i) => (categoryFilter === "all" ? true : i.category === categoryFilter))
      .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  }, [incidents, severityFilter, categoryFilter]);

  function submit() {
    if (!draft.title.trim()) return;
    const inc: IncidentReport = {
      id: `inc-${Date.now()}`,
      severity: draft.severity,
      category: draft.category,
      title: draft.title.trim(),
      description: draft.description.trim(),
      patientAffected: draft.patientAffected,
      reportedBy: "You",
      reportedAt: new Date().toISOString(),
    };
    setIncidents((prev) => [inc, ...prev]);
    setFormOpen(false);
    setDraft({ severity: "low", category: "safety", title: "", description: "", patientAffected: false });
  }

  function resolve() {
    if (!resolving) return;
    setIncidents((prev) =>
      prev.map((i) =>
        i.id === resolving.id
          ? { ...i, resolvedAt: new Date().toISOString(), resolution: resolutionNotes.trim() || "Resolved" }
          : i,
      ),
    );
    setResolving(null);
    setResolutionNotes("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as "all" | IncidentSeverity)}
            className="rounded-md border border-border-strong bg-surface px-3 h-9 text-sm text-text"
          >
            <option value="all">All severities</option>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | IncidentCategory)}
            className="rounded-md border border-border-strong bg-surface px-3 h-9 text-sm text-text"
          >
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{INCIDENT_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          Report new incident
        </Button>
      </div>

      <Card tone="raised">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Reported</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b border-border/40 hover:bg-surface-muted/40">
                  <td className="px-5 py-3.5">
                    <Badge tone={SEVERITY_TONES[i.severity]}>{SEVERITY_LABELS[i.severity]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-text-muted text-xs">
                    {INCIDENT_CATEGORY_LABELS[i.category]}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-text">{i.title}</p>
                    <p className="text-[11px] text-text-subtle line-clamp-1">{i.description}</p>
                    {i.patientAffected && (
                      <span className="mt-1 inline-block text-[10px] text-danger">Patient affected</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-text-muted">
                    <div>{new Date(i.reportedAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-text-subtle">{i.reportedBy}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    {i.resolvedAt ? (
                      <Badge tone="success">Resolved</Badge>
                    ) : (
                      <Badge tone="warning">Open</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!i.resolvedAt && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setResolving(i);
                          setResolutionNotes("");
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-text-subtle text-sm">
                    No incidents match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setFormOpen(false)}
        >
          <Card tone="raised" className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="py-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-subtle mb-1">New report</p>
                <h3 className="font-display text-xl text-text">Report an incident</h3>
              </div>

              <div>
                <p className="text-sm font-medium text-text mb-2">Severity</p>
                <div className="grid grid-cols-4 gap-2">
                  {SEVERITY_ORDER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraft({ ...draft, severity: s })}
                      className={cn(
                        "py-2 rounded-md border text-xs font-medium transition-colors",
                        draft.severity === s
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-border bg-surface text-text-muted hover:bg-surface-muted",
                      )}
                    >
                      {SEVERITY_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <FieldGroup label="Category">
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as IncidentCategory })}
                  className="flex w-full rounded-md border border-border-strong bg-surface px-3 h-10 text-sm text-text"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{INCIDENT_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </FieldGroup>

              <FieldGroup label="Title">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Short summary"
                />
              </FieldGroup>

              <FieldGroup label="Description">
                <Textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="What happened, who was involved, any immediate actions taken?"
                />
              </FieldGroup>

              <label className="flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={draft.patientAffected}
                  onChange={(e) => setDraft({ ...draft, patientAffected: e.target.checked })}
                  className="h-4 w-4"
                />
                Patient affected
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submit} disabled={!draft.title.trim()}>
                  Submit report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {resolving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setResolving(null)}
        >
          <Card tone="raised" className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent className="py-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-subtle mb-1">Resolve</p>
                <h3 className="font-display text-lg text-text">{resolving.title}</h3>
              </div>
              <FieldGroup label="Resolution notes">
                <Textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="What corrective action was taken?"
                />
              </FieldGroup>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setResolving(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={resolve}>
                  Mark resolved
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  buildChartAlertBadge,
  crossReferenceWithMedications,
  type ActiveMedication,
  type AllergyEntry,
  type AllergyKind,
  type AllergySeverity,
  type ContraindicationEntry,
  type ContraindicationKind,
  type CrossReferenceHit,
} from "@/lib/clinical/allergy-profile";

// EMR-113 — Allergies + Contraindications profile editor.
//
// Read-only when `onSave` is omitted; otherwise an inline editor that
// posts the full set in one server-action call. The component is the
// canonical surface used both on the patient chart and in the new-patient
// intake step. Cross-reference hits show as red banners; the component
// does NOT block saves on cross-refs — the prescribing surface
// (lib/clinical/contraindication-check.ts) is the gate.

export interface AllergyProfileProps {
  patientId: string;
  initialAllergies: AllergyEntry[];
  initialContraindications: ContraindicationEntry[];
  activeMedications: ActiveMedication[];
  /** Hide the badge header — used when the profile is rendered as a section
   *  inside a chart that already has its own alert banner. */
  hideBadge?: boolean;
  /** Server action that persists the new lists. When omitted the editor is read-only. */
  onSave?: (input: {
    patientId: string;
    allergies: AllergyEntry[];
    contraindications: ContraindicationEntry[];
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const ALLERGY_KIND_OPTIONS: AllergyKind[] = [
  "drug",
  "food",
  "environmental",
  "latex",
  "other",
];
const CONTRA_KIND_OPTIONS: ContraindicationKind[] = [
  "interaction",
  "condition",
  "lifestyle",
  "lab-flag",
  "other",
];
const SEVERITY_OPTIONS: AllergySeverity[] = [
  "mild",
  "moderate",
  "severe",
  "life-threatening",
];

const SEVERITY_TONE: Record<AllergySeverity, "neutral" | "warning" | "danger"> = {
  mild: "neutral",
  moderate: "warning",
  severe: "danger",
  "life-threatening": "danger",
};

export function AllergyProfile({
  patientId,
  initialAllergies,
  initialContraindications,
  activeMedications,
  hideBadge,
  onSave,
}: AllergyProfileProps) {
  const [allergies, setAllergies] = useState<AllergyEntry[]>(initialAllergies);
  const [contras, setContras] = useState<ContraindicationEntry[]>(initialContraindications);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  const crossRefs = useMemo(
    () => crossReferenceWithMedications(allergies, activeMedications),
    [allergies, activeMedications],
  );
  const badge = useMemo(
    () => buildChartAlertBadge(allergies, contras, crossRefs),
    [allergies, contras, crossRefs],
  );

  const isEditable = onSave !== undefined;

  function save() {
    if (!onSave) return;
    setError(null);
    startTransition(async () => {
      const res = await onSave({ patientId, allergies, contraindications: contras });
      if (res.ok) setSavedAt(new Date());
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {!hideBadge && (
        <AllergyBadgeHeader badge={badge} />
      )}

      {crossRefs.length > 0 && <CrossReferenceBanner hits={crossRefs} />}

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Allergies</CardTitle>
          <CardDescription>
            Drug, food, latex, and environmental allergies. Severity drives the chart badge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {allergies.length === 0 && (
              <li className="text-sm text-text-muted italic">No allergies on file.</li>
            )}
            {allergies.map((entry, idx) => (
              <AllergyRow
                key={idx}
                entry={entry}
                editable={isEditable}
                onChange={(next) => {
                  const copy = [...allergies];
                  copy[idx] = next;
                  setAllergies(copy);
                }}
                onRemove={() => setAllergies(allergies.filter((_, i) => i !== idx))}
              />
            ))}
          </ul>
          {isEditable && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() =>
                setAllergies([
                  ...allergies,
                  { label: "", kind: "drug", severity: "moderate" },
                ])
              }
            >
              + Add allergy
            </Button>
          )}
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Contraindications</CardTitle>
          <CardDescription>
            Conditions, interactions, and lifestyle flags the prescribing flow should respect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {contras.length === 0 && (
              <li className="text-sm text-text-muted italic">
                No contraindications on file.
              </li>
            )}
            {contras.map((entry, idx) => (
              <ContraindicationRow
                key={idx}
                entry={entry}
                editable={isEditable}
                onChange={(next) => {
                  const copy = [...contras];
                  copy[idx] = next;
                  setContras(copy);
                }}
                onRemove={() => setContras(contras.filter((_, i) => i !== idx))}
              />
            ))}
          </ul>
          {isEditable && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() =>
                setContras([
                  ...contras,
                  { label: "", kind: "interaction", severity: "moderate" },
                ])
              }
            >
              + Add contraindication
            </Button>
          )}
        </CardContent>
      </Card>

      {isEditable && (
        <div className="flex items-center justify-end gap-3">
          {error && <p className="text-xs text-danger">{error}</p>}
          {savedAt && !error && (
            <p className="text-xs text-text-subtle">
              Saved {savedAt.toLocaleTimeString()}
            </p>
          )}
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      )}
    </div>
  );
}

function AllergyBadgeHeader({
  badge,
}: {
  badge: ReturnType<typeof buildChartAlertBadge>;
}) {
  if (badge.allergyCount === 0 && badge.contraindicationCount === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-subtle">
        <span className="h-2 w-2 rounded-full bg-success" />
        No allergies or contraindications on file.
      </div>
    );
  }
  const tone =
    badge.worstSeverity === "life-threatening" || badge.hasActiveCrossRef
      ? "danger"
      : badge.worstSeverity === "severe"
        ? "danger"
        : "warning";
  return (
    <div className="flex items-center gap-3">
      <Badge tone={tone}>
        {badge.allergyCount + badge.contraindicationCount} alert
        {badge.allergyCount + badge.contraindicationCount === 1 ? "" : "s"}
      </Badge>
      <span className="text-sm text-text-muted">{badge.hoverText}</span>
    </div>
  );
}

function CrossReferenceBanner({ hits }: { hits: CrossReferenceHit[] }) {
  return (
    <Card tone="default" className="border-l-4 border-l-danger">
      <CardContent className="pt-3 pb-3">
        <p className="text-sm font-medium text-danger mb-1">
          {hits.length} active medication{hits.length === 1 ? "" : "s"} cross-reference
          listed allergies
        </p>
        <ul className="text-xs text-text-muted space-y-0.5">
          {hits.map((h, idx) => (
            <li key={`${h.medicationId}-${idx}`}>
              <span className="font-medium text-text">{h.medicationName}</span> overlaps{" "}
              <span className="font-medium">{h.allergyLabel}</span>{" "}
              <span className="text-text-subtle">({h.matchKind} · {h.severity})</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AllergyRow({
  entry,
  editable,
  onChange,
  onRemove,
}: {
  entry: AllergyEntry;
  editable: boolean;
  onChange: (next: AllergyEntry) => void;
  onRemove: () => void;
}) {
  if (!editable) {
    return (
      <li className="flex items-center gap-3 px-3 py-2 rounded-md bg-surface-muted/30">
        <Badge tone={SEVERITY_TONE[entry.severity]}>{entry.severity}</Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">{entry.label}</p>
          <p className="text-[11px] text-text-subtle">
            {entry.kind}
            {entry.reaction ? ` · reaction: ${entry.reaction}` : ""}
            {entry.onsetYear ? ` · onset ${entry.onsetYear}` : ""}
          </p>
        </div>
      </li>
    );
  }
  return (
    <li className="border border-border rounded-md p-3 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input
          placeholder="Allergen (e.g. Penicillin)"
          value={entry.label}
          onChange={(e) => onChange({ ...entry, label: e.target.value })}
        />
        <select
          value={entry.kind}
          onChange={(e) => onChange({ ...entry, kind: e.target.value as AllergyKind })}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          {ALLERGY_KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={entry.severity}
          onChange={(e) =>
            onChange({ ...entry, severity: e.target.value as AllergySeverity })
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input
          placeholder="Reaction (e.g. anaphylaxis, hives)"
          value={entry.reaction ?? ""}
          onChange={(e) => onChange({ ...entry, reaction: e.target.value })}
        />
        <Input
          type="number"
          min={1900}
          max={2100}
          placeholder="Onset year"
          value={entry.onsetYear ?? ""}
          onChange={(e) =>
            onChange({
              ...entry,
              onsetYear: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </li>
  );
}

function ContraindicationRow({
  entry,
  editable,
  onChange,
  onRemove,
}: {
  entry: ContraindicationEntry;
  editable: boolean;
  onChange: (next: ContraindicationEntry) => void;
  onRemove: () => void;
}) {
  if (!editable) {
    return (
      <li className="flex items-center gap-3 px-3 py-2 rounded-md bg-surface-muted/30">
        <Badge tone={SEVERITY_TONE[entry.severity]}>{entry.severity}</Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">{entry.label}</p>
          <p className="text-[11px] text-text-subtle">
            {entry.kind}
            {entry.notes ? ` · ${entry.notes}` : ""}
          </p>
        </div>
      </li>
    );
  }
  return (
    <li className="border border-border rounded-md p-3 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input
          placeholder="Contraindication (e.g. MAOIs, Pregnancy)"
          value={entry.label}
          onChange={(e) => onChange({ ...entry, label: e.target.value })}
        />
        <select
          value={entry.kind}
          onChange={(e) =>
            onChange({ ...entry, kind: e.target.value as ContraindicationKind })
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          {CONTRA_KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={entry.severity}
          onChange={(e) =>
            onChange({ ...entry, severity: e.target.value as AllergySeverity })
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <Textarea
        rows={2}
        placeholder="Notes — why is this flagged, who flagged it, what alternatives exist?"
        value={entry.notes ?? ""}
        onChange={(e) => onChange({ ...entry, notes: e.target.value })}
      />
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </li>
  );
}

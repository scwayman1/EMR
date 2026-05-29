"use client";

/**
 * Staff (MA) Objective / vitals documentation surface.
 *
 * Rendered instead of the full NoteEditor when the signed-in user can document
 * the Objective section but cannot edit the rest of the note (rooming staff).
 * They capture structured vitals + a free-text exam; on save it writes ONLY
 * the note's findings block via the scoped `saveObjectiveDocumentation` action.
 * The physician later opens the note to a staff-authored Objective already in
 * place and dictates the rest.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, Input } from "@/components/ui/input";
import { DictateButton } from "@/components/ui/dictation";
import { cn } from "@/lib/utils/cn";
import {
  composeObjectiveBody,
  formatVitalsLine,
  type Vitals,
} from "@/lib/clinical/objective-vitals";
import { saveObjectiveDocumentation } from "./actions";

interface Attribution {
  name?: string;
  role?: string;
  at?: string;
}

interface StaffObjectiveEditorProps {
  noteId: string;
  patientName: string;
  modality: string;
  status: string;
  initialVitals: Vitals;
  initialExam: string;
  initialAttribution?: Attribution | null;
}

const parseNum = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function StaffObjectiveEditor({
  noteId,
  patientName,
  modality,
  status,
  initialVitals,
  initialExam,
  initialAttribution,
}: StaffObjectiveEditorProps) {
  const router = useRouter();
  const [vitals, setVitals] = React.useState<Vitals>(initialVitals);
  const [exam, setExam] = React.useState(initialExam);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [savedAttribution, setSavedAttribution] = React.useState<Attribution | null>(
    initialAttribution ?? null,
  );

  const finalized = status === "finalized";
  const editable = !finalized;

  function setV<K extends keyof Vitals>(key: K, value: Vitals[K]) {
    setVitals((prev) => ({ ...prev, [key]: value }));
  }

  const previewBody = composeObjectiveBody({ vitals, exam });
  const vitalsLine = formatVitalsLine(vitals);

  function handleSave() {
    setSaving(true);
    setMessage(null);
    void saveObjectiveDocumentation(noteId, { vitals, exam })
      .then((res) => {
        if (res.ok) {
          setMessage("Objective saved");
          setSavedAttribution({
            name: "You",
            role: "back office",
            at: new Date().toISOString(),
          });
          router.refresh();
          setTimeout(() => setMessage(null), 2500);
        } else {
          setMessage(res.error);
        }
      })
      .finally(() => setSaving(false));
  }

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-accent bg-accent/[0.03]">
        <CardContent className="py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-accent font-medium mb-1">
            Rooming · Objective
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            Document vitals and exam findings for {patientName}&apos;s {modality} visit.
            This fills the <span className="font-medium">Objective</span> section
            only — the provider completes Assessment &amp; Plan and signs the note.
          </p>
        </CardContent>
      </Card>

      {savedAttribution?.at && (
        <div className="flex items-center gap-2 text-[11px] text-text-subtle">
          <Badge tone="neutral">Documented</Badge>
          <span>
            Last saved
            {savedAttribution.name ? ` by ${savedAttribution.name}` : ""} ·{" "}
            {new Date(savedAttribution.at).toLocaleString()}
          </span>
        </div>
      )}

      <Card tone="raised">
        <CardHeader>
          <CardTitle>Vitals</CardTitle>
          <CardDescription>
            Leave any field blank if not measured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset disabled={!editable} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FieldGroup label="BP systolic" htmlFor="v-sys">
              <Input
                id="v-sys"
                inputMode="numeric"
                placeholder="120"
                value={vitals.systolic ?? ""}
                onChange={(e) => setV("systolic", parseNum(e.target.value))}
              />
            </FieldGroup>
            <FieldGroup label="BP diastolic" htmlFor="v-dia">
              <Input
                id="v-dia"
                inputMode="numeric"
                placeholder="80"
                value={vitals.diastolic ?? ""}
                onChange={(e) => setV("diastolic", parseNum(e.target.value))}
              />
            </FieldGroup>
            <FieldGroup label="Heart rate (bpm)" htmlFor="v-hr">
              <Input
                id="v-hr"
                inputMode="numeric"
                placeholder="72"
                value={vitals.heartRate ?? ""}
                onChange={(e) => setV("heartRate", parseNum(e.target.value))}
              />
            </FieldGroup>
            <FieldGroup label={`Temp (°${vitals.tempUnit ?? "F"})`} htmlFor="v-temp">
              <Input
                id="v-temp"
                inputMode="decimal"
                placeholder="98.6"
                value={vitals.temperature ?? ""}
                onChange={(e) => setV("temperature", parseNum(e.target.value))}
              />
            </FieldGroup>
            <FieldGroup label="Resp rate" htmlFor="v-rr">
              <Input
                id="v-rr"
                inputMode="numeric"
                placeholder="16"
                value={vitals.respiratoryRate ?? ""}
                onChange={(e) => setV("respiratoryRate", parseNum(e.target.value))}
              />
            </FieldGroup>
            <FieldGroup label="SpO2 (%)" htmlFor="v-spo2">
              <Input
                id="v-spo2"
                inputMode="numeric"
                placeholder="98"
                value={vitals.spo2 ?? ""}
                onChange={(e) => setV("spo2", parseNum(e.target.value))}
              />
            </FieldGroup>
            <FieldGroup label={`Weight (${vitals.weightUnit ?? "lb"})`} htmlFor="v-wt">
              <Input
                id="v-wt"
                inputMode="decimal"
                placeholder="180"
                value={vitals.weight ?? ""}
                onChange={(e) => setV("weight", parseNum(e.target.value))}
              />
            </FieldGroup>
            <FieldGroup label="Pain (0–10)" htmlFor="v-pain">
              <Input
                id="v-pain"
                inputMode="numeric"
                placeholder="3"
                value={vitals.pain ?? ""}
                onChange={(e) => setV("pain", parseNum(e.target.value))}
              />
            </FieldGroup>
          </fieldset>
          {vitalsLine && (
            <p className="mt-3 text-xs text-text-muted">
              <span className="font-medium text-text">Preview:</span> {vitalsLine}
            </p>
          )}
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle>Exam / observations</CardTitle>
          <CardDescription>
            Free text. Use the mic to dictate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <textarea
              value={exam}
              disabled={!editable}
              onChange={(e) => setExam(e.target.value)}
              rows={Math.max(4, exam.split("\n").length + 1)}
              placeholder="General appearance, focused exam findings…"
              aria-label="Objective exam"
              className={cn(
                "w-full rounded-md border border-border-strong/70 bg-surface px-3 py-2 pr-10 text-sm text-text",
                "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
                "disabled:opacity-60",
              )}
            />
            {editable && (
              <DictateButton
                onText={(text) => {
                  setExam((prev) => {
                    const sep = prev && !/\s$/.test(prev) ? " " : "";
                    return `${prev}${sep}${text.trim()}`;
                  });
                }}
                className="absolute top-2 right-2"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {previewBody && (
        <Card tone="ambient">
          <CardContent className="py-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-text-subtle mb-1">
              Objective section preview
            </p>
            <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
              {previewBody}
            </p>
          </CardContent>
        </Card>
      )}

      {editable ? (
        <div className="flex items-center gap-3 pt-1">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Objective"}
          </Button>
          {message && <span className="text-sm text-text-muted">{message}</span>}
        </div>
      ) : (
        <p className="text-sm text-text-subtle">
          This note is signed — the Objective can no longer be edited.
        </p>
      )}
    </div>
  );
}

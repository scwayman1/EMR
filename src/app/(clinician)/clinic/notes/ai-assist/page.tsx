"use client";

import { useMemo, useState, useTransition } from "react";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeafSprig } from "@/components/ui/ornament";
import {
  type ApsoNote,
  type AiNoteRecord,
  type GuardrailResult,
  type NoteSnapshot,
  noteSnapshotSchema,
  prefillFromSnapshot,
  runGuardrails,
} from "@/lib/clinical/ai-notes";

// ---------------------------------------------------------------------------
// EMR-131 — AI Clinic Notes with Guardrails (clinician surface)
// ---------------------------------------------------------------------------
// Lets a clinician paste a snapshot, generate a draft (locally for now,
// model-backed once the orchestration layer pipes a client through),
// run guardrails, edit, and sign. The UI makes the guardrail status
// loud so a clinician cannot miss an uncited assertion.
// ---------------------------------------------------------------------------

const SAMPLE_SNAPSHOT: NoteSnapshot = {
  patient: { id: "demo", firstName: "Sample", age: 54, sex: "F", pronouns: "she/her" },
  encounter: {
    id: "enc-demo",
    date: new Date().toISOString(),
    chiefComplaint: "follow-up for diabetes and hypertension",
    visitType: "follow-up",
  },
  vitals: [
    { kind: "BP", value: "138/86", unit: "mmHg", recordedAt: new Date().toISOString() },
    { kind: "HR", value: "78", unit: "bpm", recordedAt: new Date().toISOString() },
    { kind: "Weight", value: "172", unit: "lb", recordedAt: new Date().toISOString() },
  ],
  labs: [
    { name: "A1C", value: "7.4", unit: "%", flag: "high", collectedAt: new Date().toISOString() },
    { name: "LDL", value: "112", unit: "mg/dL", flag: "high", collectedAt: new Date().toISOString() },
  ],
  medications: [
    { name: "Metformin", dose: "1000mg", route: "PO", frequency: "BID" },
    { name: "Lisinopril", dose: "10mg", route: "PO", frequency: "QD" },
  ],
  problems: [
    { icd10: "E11.9", label: "Type 2 diabetes" },
    { icd10: "I10", label: "Essential hypertension" },
  ],
  hpi:
    "Patient reports stable energy, occasional fatigue after dinner. Adherent to metformin. No hypoglycemia. Home BP averaging 135/85.",
};

export default function AiAssistPage() {
  const [snapshotText, setSnapshotText] = useState(JSON.stringify(SAMPLE_SNAPSHOT, null, 2));
  const [snapshot, setSnapshot] = useState<NoteSnapshot>(SAMPLE_SNAPSHOT);
  const [parseError, setParseError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ApsoNote | null>(null);
  const [signed, setSigned] = useState<AiNoteRecord | null>(null);
  const [pending, startTransition] = useTransition();

  const guardrails: GuardrailResult | null = useMemo(
    () => (draft ? runGuardrails(snapshot, draft) : null),
    [draft, snapshot],
  );

  function applySnapshot() {
    let raw: unknown;
    try {
      raw = JSON.parse(snapshotText);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON");
      return;
    }
    // Validate the parsed payload against the snapshot schema before
    // accepting it. Without this, malformed JSON (e.g. missing
    // vitals/labs arrays) would slip through and crash later in
    // prefillFromSnapshot or guardrail evaluation.
    const result = noteSnapshotSchema.safeParse(raw);
    if (!result.success) {
      setParseError(
        `Snapshot does not match the expected shape: ${result.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".") || "(root)"} — ${i.message}`)
          .join("; ")}`,
      );
      return;
    }
    setSnapshot(result.data);
    setParseError(null);
    setDraft(null);
    setSigned(null);
  }

  function generate() {
    startTransition(() => {
      // Until the orchestration layer pipes a model client through, we
      // pre-fill from the snapshot. The shape and guardrails are real;
      // swapping in a model call is a one-liner once it's wired.
      setDraft(prefillFromSnapshot(snapshot));
      setSigned(null);
    });
  }

  function sign(attestation: string) {
    if (!draft || !guardrails || !guardrails.ok) return;
    const record: AiNoteRecord = {
      id: `note-${Date.now()}`,
      encounterId: snapshot.encounter.id,
      status: "signed",
      snapshot,
      draft,
      guardrails,
      generatedAt: new Date().toISOString(),
      generatedBy: "ai",
      signedBy: "current-clinician",
      signedAt: new Date().toISOString(),
      signedHash: hashDraft(draft),
    };
    setSigned(record);
  }

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="AI scribe"
        title="AI Clinic Note · APSO"
        description="Drafts an APSO note from a structured snapshot. Every assessment and plan bullet must cite a snapshot field. Drafts cannot be signed until guardrails pass."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Snapshot column */}
        <Card tone="raised">
          <CardContent className="py-5 px-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base text-text">Patient snapshot</h2>
              <span className="text-[10px] uppercase tracking-wider text-text-subtle">
                Source of truth
              </span>
            </div>
            <textarea
              value={snapshotText}
              onChange={(e) => setSnapshotText(e.target.value)}
              spellCheck={false}
              className="w-full h-[420px] rounded-md border border-border bg-surface px-3 py-2 font-mono text-[12px] leading-relaxed text-text"
            />
            {parseError && (
              <p className="text-xs text-danger">JSON error: {parseError}</p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={applySnapshot}>
                Apply snapshot
              </Button>
              <Button variant="primary" size="sm" onClick={generate} disabled={pending}>
                {pending ? "Drafting..." : "Generate draft"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Draft column */}
        <div className="space-y-5">
          {!draft && (
            <Card tone="ambient">
              <CardContent className="py-12 text-center">
                <LeafSprig size={28} className="mx-auto mb-4 text-accent" />
                <p className="text-sm text-text-muted">
                  Apply a snapshot, then tap Generate draft. The model will not
                  invent values — only cite what is in the snapshot.
                </p>
              </CardContent>
            </Card>
          )}

          {draft && guardrails && (
            <>
              <GuardrailsPanel result={guardrails} />
              <DraftEditor
                draft={draft}
                onChange={(next) => {
                  setDraft(next);
                  // A signed seal+hash attests to the exact note
                  // content at sign time. Any subsequent edit must
                  // invalidate that attestation so the displayed
                  // seal can never diverge from the signed content —
                  // the clinician has to re-sign to attest the
                  // updated draft.
                  if (signed) setSigned(null);
                }}
              />
              {signed ? (
                <Card tone="raised" className="border-l-4 border-l-emerald-500">
                  <CardContent className="py-5 px-5">
                    <p className="font-display text-base text-text mb-1">
                      ✓ Signed
                    </p>
                    <p className="text-xs text-text-muted">
                      Sealed at {new Date(signed.signedAt!).toLocaleString()} ·
                      hash {signed.signedHash?.slice(0, 12)}…
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <SignPanel
                  canSign={guardrails.ok}
                  onSign={sign}
                  uncited={guardrails.uncitedBullets.length}
                  invalid={guardrails.invalidCitations.length}
                />
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function GuardrailsPanel({ result }: { result: GuardrailResult }) {
  const tone = result.ok
    ? "border-l-emerald-500"
    : result.invalidCitations.length > 0 || result.uncitedBullets.length > 0
      ? "border-l-danger"
      : "border-l-amber-500";
  return (
    <Card tone="raised" className={`border-l-4 ${tone}`}>
      <CardContent className="py-4 px-5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm text-text flex items-center gap-2">
            <span aria-hidden>🛡️</span>
            Guardrails {result.ok ? "passed" : "blocked"}
          </p>
          <span className="text-[11px] text-text-subtle">
            {result.ok ? "Ready to review" : "Fix issues before signing"}
          </span>
        </div>
        {result.uncitedBullets.length > 0 && (
          <p className="text-xs text-danger">
            {result.uncitedBullets.length} bullet(s) without citations.
          </p>
        )}
        {result.invalidCitations.length > 0 && (
          <p className="text-xs text-danger">
            {result.invalidCitations.length} citation(s) point to fields that
            don&apos;t exist in the snapshot.
          </p>
        )}
        {result.warnings.map((w, i) => (
          <p key={i} className="text-xs text-amber-700">
            ⚠ {w}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function DraftEditor({
  draft,
  onChange,
}: {
  draft: ApsoNote;
  onChange: (next: ApsoNote) => void;
}) {
  return (
    <Card tone="raised">
      <CardContent className="py-5 px-5 space-y-5">
        <Section
          title="Assessment"
          bullets={draft.assessment}
          onChange={(assessment) => onChange({ ...draft, assessment })}
        />
        <Section
          title="Plan"
          bullets={draft.plan}
          onChange={(plan) => onChange({ ...draft, plan })}
        />
        <Field label="Subjective" value={draft.subjective} onChange={(v) => onChange({ ...draft, subjective: v })} />
        <Field label="Objective" value={draft.objective} onChange={(v) => onChange({ ...draft, objective: v })} />
        <Field
          label="Patient summary (3rd-grade)"
          value={draft.patientSummary}
          onChange={(v) => onChange({ ...draft, patientSummary: v })}
        />
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  bullets,
  onChange,
}: {
  title: string;
  bullets: ApsoNote["assessment"];
  onChange: (next: ApsoNote["assessment"]) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-2">
        {title}
      </p>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="rounded-md border border-border bg-surface px-3 py-2">
            <textarea
              value={b.text}
              onChange={(e) => {
                const next = bullets.slice();
                next[i] = { ...b, text: e.target.value };
                onChange(next);
              }}
              className="w-full bg-transparent text-sm text-text outline-none resize-none"
              rows={2}
            />
            <p className="mt-1 text-[10px] text-text-subtle">
              Cites: {b.citations.map((c) => c.source).join(", ") || "(none)"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-text-subtle block mb-1.5">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
      />
    </label>
  );
}

function SignPanel({
  canSign,
  onSign,
  uncited,
  invalid,
}: {
  canSign: boolean;
  onSign: (attestation: string) => void;
  uncited: number;
  invalid: number;
}) {
  const [attestation, setAttestation] = useState(
    "I have reviewed this AI-drafted note and attest that the assessment and plan reflect my clinical judgment.",
  );
  return (
    <Card tone="raised">
      <CardContent className="py-5 px-5 space-y-3">
        <p className="font-display text-sm text-text">Physician sign-off</p>
        <textarea
          value={attestation}
          onChange={(e) => setAttestation(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-text-subtle">
            {canSign
              ? "Guardrails clear · attestation required"
              : `Cannot sign — ${uncited} uncited, ${invalid} invalid`}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSign(attestation)}
            disabled={!canSign || attestation.trim().length < 20}
          >
            Sign and seal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function hashDraft(draft: ApsoNote): string {
  // Deterministic, simple non-cryptographic hash for the demo surface.
  // The real action uses SHA-256 server-side; this lets the client
  // display a stable fingerprint without bundling crypto.
  const json = JSON.stringify(draft);
  let h = 0;
  for (let i = 0; i < json.length; i++) {
    h = (h * 31 + json.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

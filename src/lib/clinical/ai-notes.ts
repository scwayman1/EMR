/**
 * EMR-131 — AI Clinic Notes with Guardrails
 *
 * Generate APSO-format clinic notes from a structured patient
 * snapshot (vitals, labs, meds, problems). The AI side is intentionally
 * conservative:
 *
 *   1. No fabricated data. Every assertion must be traceable to a
 *      `source` in the snapshot. The output schema requires citations
 *      on every assessment/plan bullet.
 *   2. Snapshot pre-fill. The Subjective/Objective sections are seeded
 *      with verbatim chart data so the model is reframing, not
 *      inventing.
 *   3. Physician review + sign workflow. Drafts persist as `pending`
 *      and only flip to `signed` after a clinician explicitly attests.
 *      Unsigned drafts cannot be billed against.
 *
 * The model client is intentionally not imported here — this module
 * exposes the prompt builder, schemas, snapshot extractor, and sign
 * workflow so the orchestration layer can plug in any LLM.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Snapshot schema — what the chart hands the prompt builder.                 */
/* -------------------------------------------------------------------------- */

export const noteSnapshotSchema = z.object({
  patient: z.object({
    id: z.string(),
    firstName: z.string(),
    age: z.number().int().nonnegative(),
    sex: z.string().optional(),
    pronouns: z.string().optional(),
  }),
  encounter: z.object({
    id: z.string(),
    date: z.string(),
    chiefComplaint: z.string(),
    visitType: z.string().optional(),
  }),
  vitals: z
    .array(
      z.object({
        kind: z.string(),
        value: z.string(),
        unit: z.string().optional(),
        recordedAt: z.string(),
      }),
    )
    .default([]),
  labs: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        unit: z.string().optional(),
        flag: z.enum(["low", "normal", "high", "critical", "unknown"]).default("unknown"),
        collectedAt: z.string(),
      }),
    )
    .default([]),
  medications: z
    .array(
      z.object({
        name: z.string(),
        dose: z.string().optional(),
        route: z.string().optional(),
        frequency: z.string().optional(),
        startedAt: z.string().optional(),
      }),
    )
    .default([]),
  problems: z.array(z.object({ icd10: z.string(), label: z.string() })).default([]),
  hpi: z.string().optional(),
});

export type NoteSnapshot = z.infer<typeof noteSnapshotSchema>;

/* -------------------------------------------------------------------------- */
/* APSO note schema — model output format. Citations are REQUIRED.            */
/* -------------------------------------------------------------------------- */

export const citationSchema = z.object({
  /** A token like `vitals[0]`, `labs[2]`, `medications[1]`, or `hpi`. */
  source: z.string(),
  /** Optional snippet copied from the snapshot — used in the audit log. */
  excerpt: z.string().optional(),
});

export type Citation = z.infer<typeof citationSchema>;

export const apsoBulletSchema = z.object({
  text: z.string().min(1),
  citations: z.array(citationSchema).min(1),
});

export const apsoNoteSchema = z.object({
  /** Assessment — top of the note (APSO inverts SOAP). */
  assessment: z.array(apsoBulletSchema).min(1),
  /** Plan — what we're doing. */
  plan: z.array(apsoBulletSchema).min(1),
  /** Subjective — what the patient said, paraphrased from the HPI. */
  subjective: z.string(),
  /** Objective — vitals, labs, exam findings. Must restate snapshot data. */
  objective: z.string(),
  /** Optional ICD-10 codes the model proposes for billing. */
  suggestedCodes: z
    .array(z.object({ code: z.string(), label: z.string() }))
    .default([]),
  /** Plain-language patient summary (3rd-grade reading level). */
  patientSummary: z.string(),
});

export type ApsoNote = z.infer<typeof apsoNoteSchema>;

/* -------------------------------------------------------------------------- */
/* Prompt builder — produces the messages array for the LLM.                  */
/* -------------------------------------------------------------------------- */

export function buildAiNotePrompt(snapshot: NoteSnapshot): {
  system: string;
  user: string;
} {
  const system = [
    "You are a clinical scribe drafting an APSO-format note for physician review.",
    "",
    "ABSOLUTE RULES:",
    "1. NEVER invent vitals, labs, medications, or history. Use only what the snapshot below provides.",
    "2. Every Assessment and Plan bullet MUST include a `citations` array pointing to snapshot fields.",
    "   Use tokens like `vitals[0]`, `labs[2]`, `medications[1]`, `problems[0]`, `hpi`.",
    "3. If the snapshot does not contain enough information to draft a section, say so explicitly in",
    "   that section. Do not guess.",
    "4. The patient summary must read at a 3rd-grade reading level.",
    "5. Output ONLY valid JSON matching the schema. No prose outside the JSON.",
    "",
    "The note is a DRAFT. A licensed clinician will read, edit, and sign it. You are not the",
    "decision-maker; you are the scribe.",
  ].join("\n");

  const user = [
    "## Snapshot",
    JSON.stringify(snapshot, null, 2),
    "",
    "## Required JSON shape",
    "{",
    '  "assessment": [{ "text": "...", "citations": [{ "source": "labs[0]", "excerpt": "..." }] }],',
    '  "plan":       [{ "text": "...", "citations": [{ "source": "medications[0]" }] }],',
    '  "subjective": "...",',
    '  "objective":  "...",',
    '  "suggestedCodes": [{ "code": "E11.9", "label": "Type 2 diabetes" }],',
    '  "patientSummary": "..."',
    "}",
  ].join("\n");

  return { system, user };
}

/* -------------------------------------------------------------------------- */
/* Guardrails — validate every claim in the draft cites real snapshot data.   */
/* -------------------------------------------------------------------------- */

export interface GuardrailResult {
  ok: boolean;
  /** Citations that failed to resolve to a snapshot field. */
  invalidCitations: Citation[];
  /** Bullets with no citations at all. */
  uncitedBullets: string[];
  /** Sections that look fabricated relative to the snapshot. */
  warnings: string[];
}

const VALID_SOURCE_PATTERN = /^(vitals|labs|medications|problems)\[\d+\]$|^(hpi|chiefComplaint|encounter|patient)$/;

function citationResolves(snapshot: NoteSnapshot, source: string): boolean {
  const m = source.match(/^(\w+)\[(\d+)\]$/);
  if (m) {
    const list = (snapshot as any)[m[1]];
    return Array.isArray(list) && list.length > Number(m[2]);
  }
  return source in snapshot || source === "chiefComplaint";
}

export function runGuardrails(
  snapshot: NoteSnapshot,
  draft: ApsoNote,
): GuardrailResult {
  const invalidCitations: Citation[] = [];
  const uncitedBullets: string[] = [];
  const warnings: string[] = [];

  for (const bullet of [...draft.assessment, ...draft.plan]) {
    if (bullet.citations.length === 0) {
      uncitedBullets.push(bullet.text);
      continue;
    }
    for (const c of bullet.citations) {
      if (!VALID_SOURCE_PATTERN.test(c.source)) {
        invalidCitations.push(c);
        continue;
      }
      if (!citationResolves(snapshot, c.source)) {
        invalidCitations.push(c);
      }
    }
  }

  // Detect made-up labs by looking for lab abbreviations in the
  // objective section that are not in the snapshot.
  const labNames = new Set(snapshot.labs.map((l) => l.name.toLowerCase()));
  const objLower = draft.objective.toLowerCase();
  const COMMON_LABS = ["a1c", "ldl", "hdl", "tsh", "creatinine", "glucose"];
  for (const lab of COMMON_LABS) {
    if (objLower.includes(lab) && !labNames.has(lab)) {
      warnings.push(
        `Objective section mentions "${lab}" but it is not in the snapshot. Verify before signing.`,
      );
    }
  }

  return {
    ok: invalidCitations.length === 0 && uncitedBullets.length === 0,
    invalidCitations,
    uncitedBullets,
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Sign workflow — pure functions; persistence is the caller's job.           */
/* -------------------------------------------------------------------------- */

export type AiNoteStatus = "draft" | "pending_review" | "signed" | "rejected";

export interface AiNoteRecord {
  id: string;
  encounterId: string;
  status: AiNoteStatus;
  snapshot: NoteSnapshot;
  draft: ApsoNote;
  guardrails: GuardrailResult;
  generatedAt: string;
  generatedBy: "ai" | "human";
  signedBy?: string;
  signedAt?: string;
  rejectionReason?: string;
  /** Hash of `draft` at sign time — proves the clinician saw what they signed. */
  signedHash?: string;
}

export const signNoteInputSchema = z.object({
  noteId: z.string().min(1),
  clinicianId: z.string().min(1),
  /** SHA-256 hex of the draft JSON the clinician saw. */
  contentHash: z.string().min(8),
  /** Required clinician attestation text. */
  attestation: z.string().min(20).max(500),
});

export type SignNoteInput = z.infer<typeof signNoteInputSchema>;

export const rejectNoteInputSchema = z.object({
  noteId: z.string().min(1),
  clinicianId: z.string().min(1),
  reason: z.string().min(5).max(500),
});

export type RejectNoteInput = z.infer<typeof rejectNoteInputSchema>;

/**
 * Mark a draft as signed. Refuses to sign if guardrails failed or the
 * content hash doesn't match the persisted draft.
 */
export function applySignature(
  record: AiNoteRecord,
  input: SignNoteInput,
  expectedHash: string,
): AiNoteRecord {
  if (!record.guardrails.ok) {
    throw new Error(
      "Cannot sign: guardrails reported uncited or fabricated content. Fix the draft first.",
    );
  }
  if (input.contentHash !== expectedHash) {
    throw new Error(
      "Cannot sign: content hash mismatch. The draft changed after the clinician reviewed it.",
    );
  }
  return {
    ...record,
    status: "signed",
    signedBy: input.clinicianId,
    signedAt: new Date().toISOString(),
    signedHash: input.contentHash,
  };
}

export function applyRejection(
  record: AiNoteRecord,
  input: RejectNoteInput,
): AiNoteRecord {
  return {
    ...record,
    status: "rejected",
    rejectionReason: input.reason,
    signedBy: input.clinicianId,
    signedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Snapshot pre-fill — useful when the LLM is unavailable / for offline mode. */
/* -------------------------------------------------------------------------- */

export function prefillFromSnapshot(snapshot: NoteSnapshot): ApsoNote {
  const objLines: string[] = [];
  for (const v of snapshot.vitals) {
    objLines.push(`${v.kind}: ${v.value}${v.unit ? " " + v.unit : ""}`);
  }
  for (const l of snapshot.labs) {
    const flag = l.flag !== "normal" && l.flag !== "unknown" ? ` (${l.flag})` : "";
    objLines.push(`${l.name}: ${l.value}${l.unit ? " " + l.unit : ""}${flag}`);
  }

  return {
    subjective: snapshot.hpi || `${snapshot.patient.firstName} presents with ${snapshot.encounter.chiefComplaint}.`,
    objective: objLines.join("\n") || "No vitals or labs recorded for this encounter.",
    assessment: snapshot.problems.length > 0
      ? snapshot.problems.map((p, i) => ({
          text: `${p.label} (${p.icd10}) — under active management.`,
          citations: [{ source: `problems[${i}]` }],
        }))
      : [
          {
            text: "Assessment requires clinician input — no active problems on file.",
            citations: [{ source: "patient" }],
          },
        ],
    plan: snapshot.medications.length > 0
      ? snapshot.medications.map((m, i) => ({
          text: `Continue ${m.name}${m.dose ? " " + m.dose : ""}${m.frequency ? " " + m.frequency : ""}.`,
          citations: [{ source: `medications[${i}]` }],
        }))
      : [
          {
            text: "Plan requires clinician input — no current medications on file.",
            citations: [{ source: "patient" }],
          },
        ],
    suggestedCodes: snapshot.problems.map((p) => ({ code: p.icd10, label: p.label })),
    patientSummary: `Hi ${snapshot.patient.firstName}! Today we talked about how you are feeling. Your care team has a plan to help.`,
  };
}

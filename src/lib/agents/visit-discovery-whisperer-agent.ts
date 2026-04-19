import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { recordObservation } from "@/lib/agents/memory/clinical-observation";
import { isModelError } from "@/lib/orchestration/model-client";
import type {
  ObservationCategory,
  ObservationSeverity,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Visit Discovery Whisperer
// ---------------------------------------------------------------------------
// Fourth ambient agent in the fleet, and the first LLM-powered one.
//
// Fires when a Note is finalized. Reads the full note body, asks the
// model for the SINGLE most important clinical discovery from the
// visit, and writes a ClinicalObservation with that summary. Output
// surfaces in the Command Center's Clinical Discovery tile as the
// "Top signal" row.
//
// Design principles (different from the three deterministic agents):
//
//   1. The model picks category + severity, constrained to enum values.
//      We ship a strict allowlist and reject any response that deviates.
//
//   2. "None" is a valid answer. A routine follow-up with no standout
//      finding should not pollute the Discovery tile. The prompt gives
//      the model an explicit escape hatch.
//
//   3. Model failures are silent. Network hiccups, credit limits, and
//      malformed JSON all fall through to "no observation written" —
//      never write a garbage observation into a patient's chart
//      just because the LLM was flaky.
//
//   4. Runs in parallel with physicianNudge + codingReadiness, which
//      also listen to note.finalized. Each serves a different tile /
//      downstream consumer.
// ---------------------------------------------------------------------------

const input = z.object({
  noteId: z.string(),
  encounterId: z.string(),
});

const output = z.object({
  observationWritten: z.boolean(),
  observationId: z.string().nullable(),
  reason: z.string(),
});

const VALID_CATEGORIES: ObservationCategory[] = [
  "symptom_trend",
  "medication_response",
  "adherence",
  "emotional_state",
  "red_flag",
  "positive_signal",
  "side_effect",
  "lifestyle_shift",
  "engagement",
  "other",
];

const VALID_SEVERITIES: ObservationSeverity[] = [
  "info",
  "notable",
  "concern",
  "urgent",
];

interface DiscoveryResponse {
  discovery: "found" | "none";
  category?: string;
  severity?: string;
  summary?: string;
  actionSuggested?: string;
}

export const visitDiscoveryWhispererAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "visitDiscoveryWhisperer",
  version: "1.0.0",
  description:
    "On note.finalized, asks the model for the single most important " +
    "clinical discovery from the visit and writes it as a ClinicalObservation. " +
    "Surfaces as the Top signal row on the Clinical Discovery tile.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "read.encounter", "write.outcome.reminder"],
  requiresApproval: false,

  async run({ noteId, encounterId }, ctx) {
    ctx.assertCan("read.patient");
    ctx.assertCan("read.encounter");

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        status: true,
        blocks: true,
        narrative: true,
        encounter: {
          select: {
            id: true,
            patientId: true,
            reason: true,
            patient: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!note) {
      return noDiscovery("note_not_found");
    }
    if (note.status !== "finalized") {
      // Safety: listener fires on finalize, but re-drafts could race.
      // Don't analyze drafts — they change.
      return noDiscovery("note_not_finalized");
    }
    if (note.encounter.id !== encounterId) {
      return noDiscovery("encounter_mismatch");
    }

    const noteText = renderNoteForPrompt(note.blocks, note.narrative);
    if (noteText.trim().length < 80) {
      // Nothing substantive to analyze — a three-line note probably
      // wasn't a real clinical event.
      return noDiscovery("note_too_short");
    }

    const prompt = buildDiscoveryPrompt({
      patientFirst: note.encounter.patient.firstName,
      reason: note.encounter.reason,
      noteText,
    });

    let rawResponse: string;
    try {
      rawResponse = await ctx.model.complete(prompt, {
        maxTokens: 400,
        temperature: 0.2,
      });
    } catch (err) {
      // Silent fallback on any model failure — never write garbage.
      ctx.log("info", "Model call failed — skipping discovery write", {
        code: isModelError(err) ? err.code : "unknown",
      });
      return noDiscovery("model_unavailable");
    }

    const parsed = parseDiscoveryResponse(rawResponse);
    if (!parsed) {
      ctx.log("info", "Model returned unparseable response", {
        preview: rawResponse.slice(0, 200),
      });
      return noDiscovery("parse_failed");
    }

    if (parsed.discovery === "none") {
      ctx.log("info", "Model reported no standout discovery");
      return noDiscovery("no_standout");
    }

    const category = coerceCategory(parsed.category);
    const severity = coerceSeverity(parsed.severity);
    const summary = (parsed.summary ?? "").trim();
    if (!category || !severity || summary.length < 10) {
      ctx.log("info", "Model response missing required fields", {
        category: parsed.category,
        severity: parsed.severity,
        summaryLen: summary.length,
      });
      return noDiscovery("invalid_shape");
    }

    ctx.assertCan("write.outcome.reminder");

    const obs = await recordObservation({
      patientId: note.encounter.patientId,
      observedBy: "visitDiscoveryWhisperer@1.0.0",
      observedByKind: "agent",
      category,
      severity,
      summary,
      actionSuggested: parsed.actionSuggested?.trim() || undefined,
      evidence: { noteIds: [noteId], encounterIds: [encounterId] },
      metadata: {
        source: "note.finalized",
        modelDrafted: true,
      },
    });

    ctx.log("info", "Discovery observation written", {
      observationId: obs.id,
      category,
      severity,
    });

    return {
      observationWritten: true,
      observationId: obs.id,
      reason: "written",
    };
  },
};

function noDiscovery(reason: string): z.infer<typeof output> {
  return { observationWritten: false, observationId: null, reason };
}

// ----- Prompt + parsing -----

function buildDiscoveryPrompt(opts: {
  patientFirst: string;
  reason: string | null;
  noteText: string;
}): string {
  return `You are a clinical analyst reviewing a completed visit note.
Identify the SINGLE most important clinical discovery from this visit —
the one thing a covering physician should know in five seconds. Skip
routine findings. Skip administrative details. Skip anything obvious
from a quick chart glance.

Patient: ${opts.patientFirst}${opts.reason ? `. Visit reason: ${opts.reason}.` : "."}

Respond with STRICT JSON, no prose, no markdown fences. Two valid shapes:

Shape A — a discovery exists:
{
  "discovery": "found",
  "category": one of [${VALID_CATEGORIES.map((c) => `"${c}"`).join(", ")}],
  "severity": one of [${VALID_SEVERITIES.map((s) => `"${s}"`).join(", ")}],
  "summary": "one or two sentences, specific, no hedging",
  "actionSuggested": "what the covering physician should consider — one sentence"
}

Shape B — routine visit, no standout finding:
{ "discovery": "none" }

Severity guide:
  info     — minor context, worth knowing
  notable  — meaningful change or pattern
  concern  — warrants follow-up in the next touchpoint
  urgent   — time-sensitive, needs action within hours

Visit note:
---
${opts.noteText}
---

JSON only:`;
}

function parseDiscoveryResponse(raw: string): DiscoveryResponse | null {
  // Strip common model artifacts: markdown fences, leading/trailing chatter.
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  // Find the first { and last } to cope with models that wrap JSON in prose.
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  const jsonSlice = candidate.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonSlice) as Record<string, unknown>;
    if (parsed.discovery === "none") {
      return { discovery: "none" };
    }
    if (parsed.discovery === "found") {
      return {
        discovery: "found",
        category:
          typeof parsed.category === "string" ? parsed.category : undefined,
        severity:
          typeof parsed.severity === "string" ? parsed.severity : undefined,
        summary:
          typeof parsed.summary === "string" ? parsed.summary : undefined,
        actionSuggested:
          typeof parsed.actionSuggested === "string"
            ? parsed.actionSuggested
            : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function coerceCategory(raw: string | undefined): ObservationCategory | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase().trim();
  return (
    VALID_CATEGORIES.find((c) => c === normalized) ?? null
  );
}

function coerceSeverity(raw: string | undefined): ObservationSeverity | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase().trim();
  return VALID_SEVERITIES.find((s) => s === normalized) ?? null;
}

// ----- Note rendering -----

interface NoteBlock {
  type?: string;
  heading?: string;
  body?: string;
}

function renderNoteForPrompt(blocks: unknown, narrative: string | null): string {
  const parts: string[] = [];

  if (Array.isArray(blocks)) {
    for (const b of blocks as NoteBlock[]) {
      if (!b || typeof b !== "object") continue;
      const heading = (b.heading ?? b.type ?? "").toString().trim();
      const body = (b.body ?? "").toString().trim();
      if (!body) continue;
      parts.push(heading ? `${heading}:\n${body}` : body);
    }
  }

  if (narrative && narrative.trim().length > 0) {
    parts.push(`Narrative:\n${narrative.trim()}`);
  }

  return parts.join("\n\n");
}

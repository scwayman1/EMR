import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Try to extract and parse JSON from a model response.
 * The model may wrap the JSON in markdown code fences.
 */
function tryParseJSON(text: string): any | null {
  const jsonMatch =
    text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * Compute age in whole years from a Date of Birth.
 */
function ageFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format an array of OutcomeLog rows into a readable trend string.
 */
function formatOutcomeTrend(
  logs: { metric: string; value: number; loggedAt: Date }[]
): string {
  if (logs.length === 0) return "No recent data";
  return logs
    .map(
      (l) =>
        `${l.loggedAt.toISOString().slice(0, 10)}: ${l.value.toFixed(1)}/10`
    )
    .join(", ");
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const input = z.object({ encounterId: z.string() });

const blockSchema = z.object({
  type: z.enum(["summary", "findings", "assessment", "plan", "followUp"]),
  heading: z.string(),
  body: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const output = z.object({
  noteId: z.string(),
  blocks: z.array(blockSchema),
  confidence: z.number().min(0).max(1),
  suggestedCodes: z
    .array(z.object({ code: z.string(), label: z.string() }))
    .optional(),
});

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Scribe Agent v2
 * ---------------
 * Drafts a structured visit note from encounter context using an LLM prompt.
 * Builds rich patient context, requests structured JSON output, and falls back
 * gracefully when the model returns plain text (e.g. StubModelClient).
 *
 * The note is always written as `status = draft` and is never finalized
 * without a clinician signature. Workflow step is approval-gated.
 */
export const scribeAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "scribe",
  version: "2.0.0",
  description: "Drafts a structured visit note from encounter context.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.encounter",
    "read.patient",
    "read.note",
    "write.note.draft",
  ],
  requiresApproval: true,

  async run({ encounterId }, ctx) {
    // ------------------------------------------------------------------
    // 1. Load encounter + patient + chart summary
    // ------------------------------------------------------------------
    ctx.assertCan("read.encounter");

    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patient: { include: { chartSummary: true } },
      },
    });
    if (!encounter) throw new Error(`Encounter not found: ${encounterId}`);

    const patient = encounter.patient;
    ctx.assertCan("read.patient");

    // ------------------------------------------------------------------
    // 2. Fetch recent outcome trends (last 5 per metric)
    // ------------------------------------------------------------------
    const metricsOfInterest = ["pain", "sleep", "anxiety"] as const;

    const outcomeLogs = await prisma.outcomeLog.findMany({
      where: {
        patientId: patient.id,
        metric: { in: [...metricsOfInterest] },
      },
      orderBy: { loggedAt: "desc" },
      take: 15, // up to 5 per metric
    });

    const trendsByMetric: Record<string, string> = {};
    for (const metric of metricsOfInterest) {
      const logs = outcomeLogs
        .filter((l) => l.metric === metric)
        .slice(0, 5);
      trendsByMetric[metric] = formatOutcomeTrend(logs);
    }

    // ------------------------------------------------------------------
    // 3. Fetch prior finalized notes (limit 2)
    // ------------------------------------------------------------------
    ctx.assertCan("read.note");

    const priorNotes = await prisma.note.findMany({
      where: {
        encounter: { patientId: patient.id },
        status: "finalized",
      },
      orderBy: { finalizedAt: "desc" },
      take: 2,
      select: { blocks: true, finalizedAt: true },
    });

    const priorNotesText =
      priorNotes.length > 0
        ? priorNotes
            .map((n, i) => {
              const date = n.finalizedAt
                ? n.finalizedAt.toISOString().slice(0, 10)
                : "unknown date";
              const blocks = Array.isArray(n.blocks) ? n.blocks : [];
              const blockText = blocks
                .map((b: any) => `  ${b.heading ?? b.type}: ${b.body}`)
                .join("\n");
              return `--- Prior Note ${i + 1} (${date}) ---\n${blockText}`;
            })
            .join("\n\n")
        : "No prior finalized notes available.";

    // ------------------------------------------------------------------
    // 4. Build patient context string
    // ------------------------------------------------------------------
    const agePart = patient.dateOfBirth
      ? `${ageFromDob(patient.dateOfBirth)} years old`
      : "age unknown";

    const locationPart = [patient.city, patient.state]
      .filter(Boolean)
      .join(", ");

    const cannabisHistory = patient.cannabisHistory
      ? typeof patient.cannabisHistory === "string"
        ? patient.cannabisHistory
        : JSON.stringify(patient.cannabisHistory, null, 2)
      : "No cannabis history on file.";

    const summaryMd =
      patient.chartSummary?.summaryMd ?? "No chart summary yet.";

    const patientContext = `
PATIENT: ${patient.firstName} ${patient.lastName}, ${agePart}${locationPart ? `, ${locationPart}` : ""}

PRESENTING CONCERNS: ${patient.presentingConcerns ?? "Not documented"}

TREATMENT GOALS: ${patient.treatmentGoals ?? "Not documented"}

CANNABIS HISTORY:
${cannabisHistory}

RECENT OUTCOME TRENDS (last 5 readings, scale 0-10):
  Pain:    ${trendsByMetric.pain}
  Sleep:   ${trendsByMetric.sleep}
  Anxiety: ${trendsByMetric.anxiety}

CHART SUMMARY:
${summaryMd}

ENCOUNTER:
  Modality: ${encounter.modality}
  Reason: ${encounter.reason ?? "Not specified"}

PRIOR FINALIZED NOTES:
${priorNotesText}
`.trim();

    // ------------------------------------------------------------------
    // 5. Compose the prompt and call the model
    // ------------------------------------------------------------------
    const prompt = `You are an AI medical scribe assistant for a cannabis care practice. Draft a clinical visit note based on the patient context below.

${patientContext}

Return ONLY valid JSON in this exact format:
{
  "summary": "Brief 1-2 sentence overview of the visit",
  "findings": "Key relevant findings from the patient's history and current status",
  "assessment": "Clinical assessment of the patient's current condition and response to treatment",
  "plan": "Specific treatment plan recommendations including cannabis guidance",
  "followUp": "Follow-up schedule and any pending actions",
  "suggestedCodes": [
    { "code": "ICD-10 code", "label": "Description" }
  ],
  "confidence": 0.85
}

Important guidelines:
- Be concise but thorough
- Use clinical language appropriate for a medical record
- Base cannabis recommendations on the patient's reported history and outcomes
- Include relevant ICD-10 codes in suggestedCodes
- Set confidence between 0.0 and 1.0 based on how much context was available`;

    ctx.log("info", "Sending prompt to model", {
      promptLength: prompt.length,
    });

    const modelResponse = await ctx.model.complete(prompt, {
      maxTokens: 1024,
      temperature: 0.3,
    });

    // ------------------------------------------------------------------
    // 6. Parse model response (structured JSON or fallback)
    // ------------------------------------------------------------------
    const parsed = tryParseJSON(modelResponse);

    let confidence: number;
    let suggestedCodes: { code: string; label: string }[] = [];
    let blocks: z.infer<typeof blockSchema>[];

    if (parsed && typeof parsed === "object" && parsed.assessment) {
      // Successful structured parse
      confidence =
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.7;

      suggestedCodes = Array.isArray(parsed.suggestedCodes)
        ? parsed.suggestedCodes
            .filter(
              (c: any) =>
                typeof c === "object" &&
                typeof c.code === "string" &&
                typeof c.label === "string"
            )
            .map((c: any) => ({ code: c.code, label: c.label }))
        : [];

      blocks = [
        {
          type: "summary" as const,
          heading: "Summary",
          body:
            parsed.summary ??
            `${patient.firstName} ${patient.lastName} presented for a ${encounter.modality} visit. ${encounter.reason ?? ""}`.trim(),
        },
        {
          type: "findings" as const,
          heading: "Relevant findings",
          body: parsed.findings ?? summaryMd,
        },
        {
          type: "assessment" as const,
          heading: "Assessment",
          body: parsed.assessment,
        },
        {
          type: "plan" as const,
          heading: "Plan",
          body: parsed.plan ?? "-- draft, pending clinician input --",
        },
        {
          type: "followUp" as const,
          heading: "Follow-up",
          body:
            parsed.followUp ?? "Schedule outcome check-in at 7 days.",
        },
      ];

      // Attach suggestedCodes as metadata on the assessment block
      if (suggestedCodes.length > 0) {
        blocks[2] = { ...blocks[2], metadata: { suggestedCodes } };
      }

      ctx.log("info", "Parsed structured JSON from model", {
        confidence,
        codeCount: suggestedCodes.length,
      });
    } else {
      // Fallback: model returned plain text (e.g. StubModelClient)
      confidence = 0.7;

      blocks = [
        {
          type: "summary" as const,
          heading: "Summary",
          body: `${patient.firstName} ${patient.lastName} presented for a ${encounter.modality} visit. ${encounter.reason ?? ""}`.trim(),
        },
        {
          type: "findings" as const,
          heading: "Relevant findings",
          body: summaryMd,
        },
        {
          type: "assessment" as const,
          heading: "Assessment",
          body: modelResponse,
        },
        {
          type: "plan" as const,
          heading: "Plan",
          body: "-- draft, pending clinician input --",
        },
        {
          type: "followUp" as const,
          heading: "Follow-up",
          body: "Schedule outcome check-in at 7 days.",
        },
      ];

      ctx.log("info", "Model returned plain text; using fallback blocks");
    }

    // ------------------------------------------------------------------
    // 7. Persist the draft note
    // ------------------------------------------------------------------
    ctx.assertCan("write.note.draft");

    const note = await prisma.note.create({
      data: {
        encounterId,
        status: "draft",
        aiDrafted: true,
        aiConfidence: confidence,
        blocks: blocks as any,
      },
    });

    await writeAgentAudit(
      "scribe",
      "2.0.0",
      encounter.organizationId,
      "note.drafted",
      { type: "Note", id: note.id },
      { encounterId, confidence, suggestedCodeCount: suggestedCodes.length }
    );

    ctx.log("info", "Note draft created", { noteId: note.id, confidence });

    return {
      noteId: note.id,
      blocks,
      confidence,
      ...(suggestedCodes.length > 0 ? { suggestedCodes } : {}),
    };
  },
};

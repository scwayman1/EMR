import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { explainLabValue } from "@/lib/domain/lab-explainer";

// ---------------------------------------------------------------------------
// Lab Follow-up Agent
// ---------------------------------------------------------------------------
// Reads the patient's recent lab documents and flags values that fall outside
// the normal range. Uses the lab-explainer domain module to classify each
// value and writes a ClinicalObservation for any abnormal readings so the
// physician sees them in the observations panel.
// ---------------------------------------------------------------------------

const input = z.object({ patientId: z.string() });

const output = z.object({
  flaggedCount: z.number(),
  observations: z.array(z.string()),
});

// Parse candidate lab name/value pairs from document metadata or tags.
// Documents carry tags like ["HDL:55", "LDL:160", "A1C:7.2"]. This extractor
// is intentionally forgiving — real parsing would come from an OCR pipeline.
function extractLabValues(
  doc: { tags: string[]; originalName: string; aiTags: string[] }
): { name: string; value: number }[] {
  const results: { name: string; value: number }[] = [];
  const all = [...(doc.tags ?? []), ...(doc.aiTags ?? [])];
  for (const tag of all) {
    const m = tag.match(/^([A-Za-z0-9\s]+)[:=]\s*([-+]?\d+(?:\.\d+)?)/);
    if (m) {
      const name = m[1].trim();
      const value = parseFloat(m[2]);
      if (!Number.isNaN(value)) results.push({ name, value });
    }
  }
  return results;
}

export const labFollowupAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "labFollowup",
  version: "1.0.0",
  description:
    "Reviews recent lab documents, flags abnormal values using the lab " +
    "explainer, and writes a ClinicalObservation for each.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.patient",
    "read.document",
    "write.outcome.reminder",
  ],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    ctx.assertCan("read.patient");
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    ctx.assertCan("read.document");
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const labDocs = await prisma.document.findMany({
      where: {
        patientId,
        kind: "lab",
        deletedAt: null,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const observations: string[] = [];
    let flaggedCount = 0;

    for (const doc of labDocs) {
      const values = extractLabValues(doc);
      for (const { name, value } of values) {
        const result = explainLabValue(name, value);
        if (!result) continue;
        if (result.status === "high" || result.status === "low") {
          flaggedCount += 1;

          const summary = `${result.explanation.name} is ${result.status} at ${value}${result.explanation.unit} (normal ${result.explanation.normalRange.low}-${result.explanation.normalRange.high}). ${result.message}`;

          try {
            ctx.assertCan("write.outcome.reminder");
            await prisma.clinicalObservation.create({
              data: {
                patientId,
                observedBy: "agent:labFollowup",
                observedByKind: "agent",
                category: "other",
                severity: result.status === "high" ? "notable" : "info",
                summary,
                evidence: { documentIds: [doc.id] },
                actionSuggested:
                  "Review the lab value and decide whether a follow-up order or message is needed.",
              },
            });
            observations.push(summary);
          } catch (err) {
            ctx.log("warn", "Failed to write observation", {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    await writeAgentAudit(
      "labFollowup",
      "1.0.0",
      patient.organizationId,
      "labs.reviewed",
      { type: "Patient", id: patientId },
      { flaggedCount, documentsChecked: labDocs.length }
    );

    ctx.log("info", "Lab follow-up complete", {
      flaggedCount,
      documentsChecked: labDocs.length,
    });

    return { flaggedCount, observations };
  },
};

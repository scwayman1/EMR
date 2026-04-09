import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

const input = z.object({ patientId: z.string() });
const output = z.object({
  completenessScore: z.number().min(0).max(100),
  missingFields: z.array(z.string()),
  chartSummaryMd: z.string(),
});

const REQUIRED = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "presentingConcerns",
  "treatmentGoals",
  "cannabisHistory",
] as const;

/**
 * Intake Agent
 * -----------
 * Evaluates chart completeness, flags gaps, and writes a clinician-facing
 * chart readiness summary. Runs whenever intake data changes.
 */
export const intakeAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "intake",
  version: "1.0.0",
  description: "Evaluates patient intake completeness and writes a chart readiness summary.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.chartSummary"],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    ctx.assertCan("read.patient");

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    const missing: string[] = [];
    for (const field of REQUIRED) {
      const v = (patient as any)[field];
      if (v === null || v === undefined || v === "") missing.push(field);
    }

    const completenessScore = Math.round(
      ((REQUIRED.length - missing.length) / REQUIRED.length) * 100
    );

    const summaryMd = [
      `## ${patient.firstName} ${patient.lastName}`,
      "",
      patient.presentingConcerns
        ? `**Presenting:** ${patient.presentingConcerns}`
        : "**Presenting:** _not provided_",
      patient.treatmentGoals
        ? `**Goals:** ${patient.treatmentGoals}`
        : "**Goals:** _not provided_",
      "",
      missing.length > 0
        ? `**Gaps:** ${missing.join(", ")}`
        : "**Gaps:** none — chart is ready.",
    ].join("\n");

    ctx.assertCan("write.chartSummary");
    await prisma.chartSummary.upsert({
      where: { patientId },
      update: {
        completenessScore,
        missingFields: missing,
        summaryMd,
        generatedBy: `agent:intake@1.0.0`,
        generatedAt: new Date(),
      },
      create: {
        patientId,
        completenessScore,
        missingFields: missing,
        summaryMd,
        generatedBy: `agent:intake@1.0.0`,
      },
    });

    await writeAgentAudit(
      "intake",
      "1.0.0",
      patient.organizationId,
      "chartSummary.written",
      { type: "Patient", id: patientId },
      { completenessScore, missingFieldCount: missing.length }
    );

    ctx.log("info", "Chart summary written", { completenessScore, missing });

    return { completenessScore, missingFields: missing, chartSummaryMd: summaryMd };
  },
};

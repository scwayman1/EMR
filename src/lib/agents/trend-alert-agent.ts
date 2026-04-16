import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { detectTrends, type TrendAlert } from "@/lib/domain/clinical-intelligence";
import { recordObservation } from "@/lib/agents/memory/clinical-observation";
import type { ObservationSeverity } from "@prisma/client";

// ---------------------------------------------------------------------------
// Trend Alert Agent
// ---------------------------------------------------------------------------
// Scans recent OutcomeLog entries for the patient, detects worsening or
// improving symptom trends, and writes a ClinicalObservation per detected
// trend so the care team can see them in the "what your team is noticing"
// feed. Severity follows the mapping:
//   urgent trend → concern severity
//   concern     → notable
//   info        → info
// ---------------------------------------------------------------------------

const input = z.object({
  patientId: z.string(),
});

const output = z.object({
  trendsDetected: z.number(),
  observations: z.array(z.string()),
});

const SEVERITY_MAP: Record<TrendAlert["severity"], ObservationSeverity> = {
  urgent: "concern",
  concern: "notable",
  info: "info",
};

export const trendAlertAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "trendAlert",
  version: "1.0.0",
  description:
    "Scans recent outcome logs and writes a clinical observation for each " +
    "detected symptom trend (worsening or improving).",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.outcome.reminder"],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    ctx.assertCan("read.patient");

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, organizationId: true, firstName: true, lastName: true },
    });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    // Gather the last 30 days of outcome logs — enough history to spot a
    // 3-point trend without dragging in stale data.
    const since = new Date(Date.now() - 30 * 86_400_000);
    const logs = await prisma.outcomeLog.findMany({
      where: {
        patientId,
        loggedAt: { gte: since },
      },
      orderBy: { loggedAt: "desc" },
      take: 200,
    });

    ctx.log("info", "Scanning outcome logs for trends", {
      logCount: logs.length,
    });

    const trends = detectTrends(
      logs.map((l) => ({
        metric: l.metric as string,
        value: l.value,
        loggedAt: l.loggedAt,
      })),
    );

    if (trends.length === 0) {
      ctx.log("info", "No trends detected");
      return { trendsDetected: 0, observations: [] };
    }

    const observationIds: string[] = [];

    ctx.assertCan("write.outcome.reminder");
    for (const trend of trends) {
      const severity = SEVERITY_MAP[trend.severity];
      const action =
        trend.direction === "worsening"
          ? trend.severity === "urgent"
            ? "Consider reaching out today — this is a steep trajectory."
            : "Consider checking in with the patient at the next visit."
          : "Worth acknowledging — the current plan appears to be working.";

      const obs = await recordObservation({
        patientId,
        observedBy: "trendAlert@1.0.0",
        observedByKind: "agent",
        category: "symptom_trend",
        severity,
        summary: `${trend.summary}. ${trend.detail}`,
        actionSuggested: action,
        evidence: {},
        metadata: {
          metric: trend.metric,
          direction: trend.direction,
          rawSeverity: trend.severity,
          daysObserved: trend.daysObserved,
        },
      });

      observationIds.push(obs.id);
    }

    ctx.log("info", "Trend observations written", {
      count: observationIds.length,
    });

    return {
      trendsDetected: trends.length,
      observations: observationIds,
    };
  },
};

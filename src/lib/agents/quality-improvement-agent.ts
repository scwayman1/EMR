import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Quality Improvement Agent
// ---------------------------------------------------------------------------
// Reads AuditLog entries to detect workflow bottlenecks — steps where the
// elapsed time between a "started" event and its matching "completed" event
// is unusually long. Produces a list of workflows with average durations and
// one concrete suggestion per bottleneck.
// ---------------------------------------------------------------------------

const input = z.object({ organizationId: z.string() });

const output = z.object({
  bottlenecks: z.array(
    z.object({
      workflow: z.string(),
      avgDurationMinutes: z.number(),
      suggestion: z.string(),
    })
  ),
});

// Pairs of matching audit actions we analyze for duration.
// Each pair = (startAction, endAction, displayName).
const WORKFLOW_PAIRS: { start: string; end: string; label: string }[] = [
  { start: "encounter.started", end: "encounter.completed", label: "Encounter lifecycle" },
  { start: "note.drafted", end: "note.finalized", label: "Scribe note finalization" },
  { start: "intake.started", end: "intake.completed", label: "Patient intake" },
  { start: "claim.drafted", end: "claim.submitted", label: "Claim submission prep" },
  { start: "claim.submitted", end: "claim.paid", label: "Claim payment cycle" },
  { start: "message.drafted", end: "message.sent", label: "Message approval queue" },
];

interface EventRow {
  action: string;
  subjectId: string | null;
  createdAt: Date;
}

function suggestionFor(label: string, avgMinutes: number): string {
  if (label.includes("note")) {
    return `Scribe notes are taking ${avgMinutes.toFixed(0)} min to finalize on average. Consider a daily sign-off block or clearer escalation when drafts sit > 24h.`;
  }
  if (label.includes("intake")) {
    return `Intake is averaging ${avgMinutes.toFixed(0)} min. Check if the form length or technical issues (upload failures) are the bottleneck.`;
  }
  if (label.includes("Message")) {
    return `Message approval queue is averaging ${avgMinutes.toFixed(0)} min. Batch approvals twice daily to reduce perceived latency.`;
  }
  if (label.includes("Claim submission")) {
    return `Claim submission prep is averaging ${avgMinutes.toFixed(0)} min. Audit scrub pass-rate and common scrub failures.`;
  }
  if (label.includes("payment cycle")) {
    return `Claims sit ${avgMinutes.toFixed(0)} min (end-to-end) before payment. Review timely filing and denial response cadence.`;
  }
  return `Average duration of ${avgMinutes.toFixed(0)} min — review the workflow for handoff gaps.`;
}

export const qualityImprovementAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "qualityImprovement",
  version: "1.0.0",
  description:
    "Reads audit logs and identifies workflow bottlenecks by matching start/end " +
    "events and computing average durations.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ organizationId }, ctx) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const actions = WORKFLOW_PAIRS.flatMap((p) => [p.start, p.end]);
    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: { in: actions },
        createdAt: { gte: since },
      },
      select: { action: true, subjectId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const bottlenecks: z.infer<typeof output>["bottlenecks"] = [];

    for (const pair of WORKFLOW_PAIRS) {
      const starts = new Map<string, Date>();
      const durationsMs: number[] = [];

      for (const row of logs as EventRow[]) {
        if (!row.subjectId) continue;
        if (row.action === pair.start) {
          // Keep the earliest start per subject
          if (!starts.has(row.subjectId)) {
            starts.set(row.subjectId, row.createdAt);
          }
        } else if (row.action === pair.end) {
          const startAt = starts.get(row.subjectId);
          if (startAt) {
            durationsMs.push(row.createdAt.getTime() - startAt.getTime());
            starts.delete(row.subjectId);
          }
        }
      }

      if (durationsMs.length === 0) continue;

      const avgMs =
        durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length;
      const avgMinutes = avgMs / (1000 * 60);

      bottlenecks.push({
        workflow: pair.label,
        avgDurationMinutes: Math.round(avgMinutes * 10) / 10,
        suggestion: suggestionFor(pair.label, avgMinutes),
      });
    }

    // Sort slowest first — that's the actionable list.
    bottlenecks.sort((a, b) => b.avgDurationMinutes - a.avgDurationMinutes);

    await writeAgentAudit(
      "qualityImprovement",
      "1.0.0",
      organizationId,
      "quality.bottlenecks.analyzed",
      { type: "Organization", id: organizationId },
      { bottleneckCount: bottlenecks.length }
    );

    ctx.log("info", "Quality improvement analysis complete", {
      bottleneckCount: bottlenecks.length,
    });

    return { bottlenecks };
  },
};

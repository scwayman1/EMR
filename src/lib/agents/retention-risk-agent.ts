import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Patient Retention Risk Agent
// ---------------------------------------------------------------------------
// Scores a patient's risk of disengaging from care based on engagement
// signals: days since last visit, message response rate, dose log frequency,
// and no-show history. Returns a 0-100 score plus contributing factors and
// suggested interventions so the care team can act.
// ---------------------------------------------------------------------------

const input = z.object({ patientId: z.string() });

const output = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(["low", "medium", "high"]),
  factors: z.array(z.string()),
  suggestedInterventions: z.array(z.string()),
});

function bandFromScore(score: number): "low" | "medium" | "high" {
  if (score >= 66) return "high";
  if (score >= 33) return "medium";
  return "low";
}

export const retentionRiskAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "retentionRisk",
  version: "1.0.0",
  description:
    "Computes a 0-100 retention risk score from visit recency, engagement, " +
    "and no-show history.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "read.encounter"],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    ctx.assertCan("read.patient");
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    ctx.assertCan("read.encounter");

    const now = Date.now();
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    const [lastEncounter, recentAppointments, recentDoseLogs, threads] =
      await Promise.all([
        prisma.encounter.findFirst({
          where: { patientId, status: "complete" },
          orderBy: { completedAt: "desc" },
        }),
        prisma.appointment.findMany({
          where: { patientId, startAt: { gte: ninetyDaysAgo } },
        }),
        prisma.doseLog.findMany({
          where: { patientId, loggedAt: { gte: ninetyDaysAgo } },
          select: { loggedAt: true },
        }),
        prisma.messageThread.findMany({
          where: { patientId },
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 10,
              select: { senderUserId: true, senderAgent: true, createdAt: true },
            },
          },
          take: 5,
        }),
      ]);

    const factors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // 1) Days since last completed encounter (0-35 points)
    const lastVisit = lastEncounter?.completedAt ?? null;
    const daysSinceVisit = lastVisit
      ? Math.floor((now - new Date(lastVisit).getTime()) / (24 * 60 * 60 * 1000))
      : 365;
    if (daysSinceVisit > 120) {
      score += 35;
      factors.push(`No visit in ${daysSinceVisit} days`);
      suggestions.push("Reach out to schedule a check-in visit");
    } else if (daysSinceVisit > 60) {
      score += 20;
      factors.push(`Last visit ${daysSinceVisit} days ago`);
      suggestions.push("Send a warm check-in message");
    } else if (daysSinceVisit > 30) {
      score += 8;
      factors.push(`Last visit ${daysSinceVisit} days ago`);
    }

    // 2) No-show / cancellation pattern (0-25 points)
    const noShows = recentAppointments.filter((a) => a.status === "no_show").length;
    const cancels = recentAppointments.filter((a) => a.status === "cancelled").length;
    if (noShows >= 2) {
      score += 25;
      factors.push(`${noShows} no-shows in 90 days`);
      suggestions.push("Call to identify barriers before scheduling again");
    } else if (noShows === 1 || cancels >= 2) {
      score += 12;
      factors.push(`${noShows} no-show, ${cancels} cancellations`);
      suggestions.push("Offer flexible scheduling (evening or telehealth)");
    }

    // 3) Dose log frequency (0-20 points)
    const uniqueDoseDays = new Set(
      recentDoseLogs.map((d) => d.loggedAt.toISOString().slice(0, 10))
    );
    if (uniqueDoseDays.size === 0) {
      score += 20;
      factors.push("No dose logs in 90 days");
      suggestions.push("Nudge patient to log via the fun emoji check-in");
    } else if (uniqueDoseDays.size < 10) {
      score += 10;
      factors.push(`Only ${uniqueDoseDays.size} days of dose logs in 90 days`);
      suggestions.push("Send a gamified streak reminder");
    }

    // 4) Message response rate (0-20 points)
    // Count care-team messages vs. patient replies in recent threads.
    let careMsgs = 0;
    let patientMsgs = 0;
    for (const t of threads) {
      for (const m of t.messages) {
        if (m.senderUserId) patientMsgs += 1;
        else if (m.senderAgent) careMsgs += 1;
      }
    }
    if (careMsgs > 0) {
      const ratio = patientMsgs / careMsgs;
      if (ratio < 0.2) {
        score += 20;
        factors.push("Low message response rate");
        suggestions.push("Try a different channel (phone or SMS)");
      } else if (ratio < 0.5) {
        score += 10;
        factors.push("Below-average message response rate");
      }
    }

    // Clamp
    score = Math.max(0, Math.min(100, Math.round(score)));
    const level = bandFromScore(score);

    if (suggestions.length === 0) {
      suggestions.push("Keep doing what you're doing — engagement looks healthy");
    }

    await writeAgentAudit(
      "retentionRisk",
      "1.0.0",
      patient.organizationId,
      "retention.risk.scored",
      { type: "Patient", id: patientId },
      { score, level, factorsCount: factors.length }
    );

    ctx.log("info", "Retention risk scored", { score, level });

    return {
      score,
      level,
      factors,
      suggestedInterventions: suggestions,
    };
  },
};

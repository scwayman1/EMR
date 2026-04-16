import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Wellness Coach Agent
// ---------------------------------------------------------------------------
// Reads recent outcome + dose logs for a patient and generates a short,
// encouraging message about their progress. Patient-facing, low risk — no
// approval required. Tone adapts to what the data actually shows so the
// message never feels generic.
// ---------------------------------------------------------------------------

const input = z.object({ patientId: z.string() });

const output = z.object({
  message: z.string(),
  tone: z.enum(["celebratory", "supportive", "motivating"]),
});

// A "streak" = consecutive days with at least one dose log.
function computeStreak(loggedDates: Date[]): number {
  if (loggedDates.length === 0) return 0;
  const uniqueDays = Array.from(
    new Set(loggedDates.map((d) => d.toISOString().slice(0, 10)))
  ).sort((a, b) => (a < b ? 1 : -1));

  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = new Date(today);
  for (const day of uniqueDays) {
    const cursorStr = cursor.toISOString().slice(0, 10);
    if (day === cursorStr) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (day < cursorStr) {
      break;
    }
  }
  return streak;
}

function avgValue(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export const wellnessCoachAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "wellnessCoach",
  version: "1.0.0",
  description:
    "Reads a patient's recent outcome logs and dose history and returns a " +
    "short, encouraging progress message.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.message.draft"],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    ctx.assertCan("read.patient");
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [outcomeLogs, doseLogs] = await Promise.all([
      prisma.outcomeLog.findMany({
        where: { patientId, loggedAt: { gte: since } },
        orderBy: { loggedAt: "desc" },
        take: 40,
      }),
      prisma.doseLog.findMany({
        where: { patientId, loggedAt: { gte: since } },
        orderBy: { loggedAt: "desc" },
        take: 50,
      }),
    ]);

    const streak = computeStreak(doseLogs.map((l) => l.loggedAt));

    // Compute trend on pain (lower is better) and mood/sleep (higher is better).
    const recentPain = outcomeLogs
      .filter((l) => l.metric === "pain")
      .slice(0, 5)
      .map((l) => l.value);
    const olderPain = outcomeLogs
      .filter((l) => l.metric === "pain")
      .slice(5, 10)
      .map((l) => l.value);

    const painNow = avgValue(recentPain);
    const painThen = avgValue(olderPain);
    const painImproving =
      painNow !== null && painThen !== null && painNow < painThen - 0.5;

    // Pick a tone based on the data
    let tone: "celebratory" | "supportive" | "motivating";
    if (streak >= 5 || painImproving) {
      tone = "celebratory";
    } else if (doseLogs.length === 0 && outcomeLogs.length === 0) {
      tone = "motivating";
    } else {
      tone = "supportive";
    }

    const context = [
      `Patient first name: ${patient.firstName}`,
      `Days logged in the last 2 weeks: ${doseLogs.length}`,
      `Current dose-logging streak: ${streak} days`,
      `Outcome check-ins in the last 2 weeks: ${outcomeLogs.length}`,
      painNow !== null
        ? `Average pain (recent): ${painNow.toFixed(1)}/10${
            painThen !== null ? ` (was ${painThen.toFixed(1)})` : ""
          }`
        : "Pain data: not logged recently",
      `Treatment goals: ${patient.treatmentGoals ?? "not specified"}`,
    ].join("\n");

    const prompt = `You are a warm, upbeat wellness coach at Leafjourney, a cannabis care practice. Write a very short encouraging message (2-3 sentences) to the patient based on the data below. Do not sound like a robot. Be specific to the data.

${context}

Tone target: ${tone}

Return ONLY valid JSON:
{
  "message": "the short encouraging message, 2-3 sentences, addressed to the patient by first name",
  "tone": "${tone}"
}`;

    let raw = "";
    try {
      raw = await ctx.model.complete(prompt, {
        maxTokens: 300,
        temperature: 0.7,
      });
    } catch (err) {
      ctx.log("warn", "Wellness coach LLM failed — using deterministic fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    let message: string | null = null;
    const jsonMatch =
      raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
          message = parsed.message.trim();
        }
      } catch {
        message = null;
      }
    }

    if (!message) {
      // Deterministic fallback
      if (streak >= 5) {
        message = `${patient.firstName}, you've logged ${streak} days in a row — that's real commitment, and it's going to make a difference.`;
      } else if (painImproving && painNow !== null) {
        message = `${patient.firstName}, your pain numbers are trending down (${painNow.toFixed(1)}/10 recently) — whatever you're doing is working. Keep going.`;
      } else if (doseLogs.length === 0) {
        message = `${patient.firstName}, we haven't heard from you in a bit. A quick dose log or check-in today would help us help you better.`;
      } else {
        message = `${patient.firstName}, we see you showing up — ${doseLogs.length} logs in the last two weeks. Every entry helps us fine-tune your care.`;
      }
    }

    await writeAgentAudit(
      "wellnessCoach",
      "1.0.0",
      patient.organizationId,
      "wellness.message.generated",
      { type: "Patient", id: patientId },
      { tone, streak, doseLogCount: doseLogs.length }
    );

    ctx.log("info", "Wellness message generated", { tone, streak });

    return { message, tone };
  },
};

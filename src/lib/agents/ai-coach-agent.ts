import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// AI Coach Agent — EMR-098
//
// A coaching message generator with three selectable styles:
//   • gentle   — warm, validating, low-pressure encouragement
//   • moderate — friendly accountability with a clear next step
//   • tough    — direct, no-excuses challenge (still kind, never cruel)
//
// The patient picks the style themselves on the lifestyle tab. This is
// patient-facing low-risk content; no clinical prescriptions are issued.
// ---------------------------------------------------------------------------

export type CoachStyle = "gentle" | "moderate" | "tough";

const input = z.object({
  patientId: z.string(),
  style: z.enum(["gentle", "moderate", "tough"]),
  /** Free-form context the patient may have typed (mood, struggle, win). */
  patientNote: z.string().optional(),
});

const output = z.object({
  message: z.string(),
  style: z.enum(["gentle", "moderate", "tough"]),
  /** A one-line action step the patient can take in the next 10 minutes. */
  nextStep: z.string(),
});

const STYLE_VOICE: Record<CoachStyle, string> = {
  gentle:
    "Warm, validating, low-pressure. Lead with empathy. Make it sound " +
    "like a kind friend who happens to know what they're talking about. " +
    "Never push. Reassure that small steps count.",
  moderate:
    "Friendly accountability. Acknowledge the effort, name the obstacle, " +
    "offer one specific next step. The voice of a thoughtful trainer. " +
    "Honest but never harsh.",
  tough:
    "Direct, no excuses, still kind. Speak plainly. Don't sugarcoat. " +
    "Push the patient toward one concrete action — but never insult, " +
    "shame, or mock them. Tough love, not toxic.",
};

const STYLE_BANNED: Record<CoachStyle, string[]> = {
  gentle: ["man up", "stop making excuses", "no excuses", "tough"],
  moderate: ["sweetie", "honey", "you got this!"],
  tough: [
    "you should feel ashamed",
    "loser",
    "pathetic",
    "weak",
    "stupid",
    "worthless",
  ],
};

function avgValue(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function deterministicFallback(
  style: CoachStyle,
  firstName: string,
  ctx: { recentLogCount: number; streak: number; painNow: number | null },
): { message: string; nextStep: string } {
  const { recentLogCount, streak, painNow } = ctx;
  if (style === "gentle") {
    return {
      message:
        recentLogCount === 0
          ? `${firstName}, no judgment — life happens. When you're ready, even one tiny check-in is enough to start again.`
          : `${firstName}, you've shown up ${recentLogCount} times in the last two weeks. That counts. Be proud of the small consistency.`,
      nextStep:
        "Take a slow breath. If you can, log one number for how you're feeling today.",
    };
  }
  if (style === "moderate") {
    return {
      message:
        streak >= 3
          ? `${firstName}, ${streak} days in a row — that's momentum. Don't break the chain.`
          : `${firstName}, you've got room to build a streak this week. Three days in a row would be a real start.`,
      nextStep: "Pick one tip from your toolkit and check it off before bed tonight.",
    };
  }
  // tough
  return {
    message:
      recentLogCount === 0
        ? `${firstName}, two weeks of silence. Your plan only works if you actually run it. Time to log something — anything — today.`
        : `${firstName}, you've been logging${painNow !== null ? ` and your pain is at ${painNow.toFixed(1)}/10` : ""} — but consistency is what moves the needle. No more "I'll start tomorrow."`,
    nextStep: "Right now, in the next 10 minutes: one log. No exceptions.",
  };
}

function stripBanned(message: string, style: CoachStyle): string {
  const banned = STYLE_BANNED[style];
  let out = message;
  for (const phrase of banned) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "");
  }
  return out.replace(/\s+/g, " ").trim();
}

export const aiCoachAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "aiCoach",
  version: "1.0.0",
  description:
    "Patient-selectable coaching voice (gentle / moderate / tough) that " +
    "writes a 2–3 sentence motivational message plus a single concrete " +
    "next step. Patient-facing, low risk, no clinical recommendations.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.message.draft"],
  requiresApproval: false,

  async run({ patientId, style, patientNote }, ctx) {
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
        take: 30,
      }),
      prisma.doseLog.findMany({
        where: { patientId, loggedAt: { gte: since } },
        orderBy: { loggedAt: "desc" },
        take: 40,
      }),
    ]);

    const recentLogCount = outcomeLogs.length + doseLogs.length;
    const dayKeys = Array.from(
      new Set(doseLogs.map((d) => d.loggedAt.toISOString().slice(0, 10))),
    ).sort((a, b) => (a < b ? 1 : -1));
    let streak = 0;
    const cursor = new Date();
    for (const day of dayKeys) {
      const k = cursor.toISOString().slice(0, 10);
      if (day === k) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else if (day < k) {
        break;
      }
    }

    const painNow = avgValue(
      outcomeLogs
        .filter((l) => l.metric === "pain")
        .slice(0, 5)
        .map((l) => l.value),
    );

    const contextLines = [
      `Patient first name: ${patient.firstName}`,
      `Recent activity: ${recentLogCount} logs in 14 days`,
      `Dose-log streak: ${streak} days`,
      painNow !== null ? `Recent pain avg: ${painNow.toFixed(1)}/10` : null,
      patientNote ? `Patient said: "${patientNote.slice(0, 240)}"` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are an AI wellness coach for a cannabis-care EMR. The patient picked the "${style}" coaching style.

VOICE: ${STYLE_VOICE[style]}

NEVER use any of these phrases or anything similar: ${STYLE_BANNED[style].join(", ")}.
Never invent medical facts. Never give a dose recommendation. Never shame the patient.

Patient context:
${contextLines}

Return ONLY valid JSON:
{
  "message": "2-3 sentence coaching message in the chosen style, addressed to the patient by first name",
  "nextStep": "one concrete action they can do in the next 10 minutes"
}`;

    let raw = "";
    try {
      raw = await ctx.model.complete(prompt, {
        maxTokens: 320,
        temperature: style === "tough" ? 0.5 : 0.7,
      });
    } catch (err) {
      ctx.log("warn", "AI coach LLM failed — using deterministic fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    let message: string | null = null;
    let nextStep: string | null = null;
    const jsonMatch =
      raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        if (
          typeof parsed.message === "string" &&
          parsed.message.trim().length > 0
        ) {
          message = stripBanned(parsed.message.trim(), style);
        }
        if (
          typeof parsed.nextStep === "string" &&
          parsed.nextStep.trim().length > 0
        ) {
          nextStep = parsed.nextStep.trim();
        }
      } catch {
        message = null;
        nextStep = null;
      }
    }

    if (!message || !nextStep) {
      const fallback = deterministicFallback(style, patient.firstName, {
        recentLogCount,
        streak,
        painNow,
      });
      message = message ?? fallback.message;
      nextStep = nextStep ?? fallback.nextStep;
    }

    await writeAgentAudit(
      "aiCoach",
      "1.0.0",
      patient.organizationId,
      "coach.message.generated",
      { type: "Patient", id: patientId },
      { style, recentLogCount, streak },
    );

    ctx.log("info", "AI coach message generated", { style, streak });

    return { message, style, nextStep };
  },
};

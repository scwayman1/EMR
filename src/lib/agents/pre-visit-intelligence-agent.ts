import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import {
  recallMemories,
  formatMemoriesForPrompt,
} from "./memory/patient-memory";
import {
  recallObservations,
  formatObservationsForPrompt,
} from "./memory/clinical-observation";
import { startReasoning } from "./memory/agent-reasoning";
import {
  findSimilarPatients,
  summarizeCohortOutcomes,
  formatCohortInsightForPrompt,
} from "./memory/cohort";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function ageFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const md = now.getMonth() - dob.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function daysAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (86_400_000));
}

/**
 * Best-effort write of the generated briefing to `Encounter.briefingContext`.
 * A db failure must never abort a successful briefing — the agent's primary
 * contract is to return the briefing to the caller; persistence is a
 * side-effect that lets downstream surfaces (Schedule tile brief line, scribe
 * pre-seed) read it without re-running the agent. On failure we log via
 * `console.warn` with a clear prefix so the issue surfaces in server logs
 * without breaking the calling flow.
 */
async function persistBriefingToEncounter(
  encounterId: string | undefined,
  briefing: unknown,
): Promise<void> {
  if (!encounterId) return;
  try {
    await prisma.encounter.update({
      where: { id: encounterId },
      data: { briefingContext: briefing as any },
    });
  } catch (err) {
    console.warn(
      "[preVisitIntelligence] persistence failed:",
      err instanceof Error ? err.message : String(err),
      { encounterId },
    );
  }
}

function trendDirection(values: number[]): "improving" | "stable" | "worsening" | "insufficient" {
  if (values.length < 2) return "insufficient";
  const recent = values.slice(-3);
  const earlier = values.slice(0, 3);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const delta = recentAvg - earlierAvg;
  if (Math.abs(delta) < 0.5) return "stable";
  return delta > 0 ? "worsening" : "improving"; // higher = worse for pain/anxiety
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const input = z.object({
  patientId: z.string(),
  /**
   * When provided, the agent will best-effort persist the generated briefing
   * to `Encounter.briefingContext` on this encounter so downstream surfaces
   * (e.g. the Schedule tile's brief line, the scribe's pre-seeded note) can
   * read it without re-running the agent. A db write failure never aborts
   * the briefing — callers always receive the output regardless.
   */
  encounterId: z.string().optional(),
});

const briefingSection = z.object({
  title: z.string(),
  content: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  icon: z.enum(["alert", "trend", "medication", "research", "note", "task", "message"]),
});

const output = z.object({
  patientSummary: z.string(),
  lastVisitSummary: z.string().nullable(),
  talkingPoints: z.array(z.string()),
  sections: z.array(briefingSection),
  riskFlags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export const preVisitIntelligenceAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "preVisitIntelligence",
  version: "1.0.0",
  description:
    "Synthesizes patient data into a concise pre-visit intelligence briefing. " +
    "Pulls from chart summary, outcome trends, medications, recent messages, " +
    "assessments, and research corpus to generate talking points and risk flags.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.patient",
    "read.encounter",
    "read.note",
    "read.document",
    "read.research",
  ],
  requiresApproval: false,

  async run(input, ctx) {
    ctx.log("info", "Starting pre-visit intelligence briefing", { patientId: input.patientId });

    // ── Step 1: Pull patient data ──────────────────────────────────

    ctx.log("info", "Step 1/6: Loading patient profile and chart summary");

    const patient = await prisma.patient.findUnique({
      where: { id: input.patientId },
      include: {
        chartSummary: true,
        medications: { where: { active: true }, orderBy: { name: "asc" } },
      },
    });

    if (!patient) {
      throw new Error(`Patient ${input.patientId} not found`);
    }

    const age = patient.dateOfBirth ? ageFromDob(patient.dateOfBirth) : null;

    // ── Step 2: Recent encounters + notes ──────────────────────────

    ctx.log("info", "Step 2/6: Reviewing recent encounters and notes");

    const recentEncounters = await prisma.encounter.findMany({
      where: { patientId: input.patientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        notes: {
          where: { status: { not: "draft" } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const lastEncounter = recentEncounters[0] ?? null;
    const lastNote = lastEncounter?.notes[0] ?? null;

    let lastNoteSummary: string | null = null;
    if (lastNote?.blocks) {
      const blocks = lastNote.blocks as Array<{ type: string; body: string }>;
      const summaryBlock =
        blocks.find((b) => b.type === "summary") ??
        blocks.find((b) => b.type === "assessment") ??
        blocks[0];
      lastNoteSummary = summaryBlock?.body?.trim() ?? null;
    }

    // ── Step 3: Outcome trends ─────────────────────────────────────

    ctx.log("info", "Step 3/6: Analyzing outcome trends (last 30 days)");

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const outcomeLogs = await prisma.outcomeLog.findMany({
      where: { patientId: input.patientId, loggedAt: { gte: thirtyDaysAgo } },
      orderBy: { loggedAt: "asc" },
    });

    const metricGroups: Record<string, number[]> = {};
    for (const log of outcomeLogs) {
      if (!metricGroups[log.metric]) metricGroups[log.metric] = [];
      metricGroups[log.metric].push(log.value);
    }

    const trends: Record<string, { direction: string; latest: number; values: number[] }> = {};
    for (const [metric, values] of Object.entries(metricGroups)) {
      trends[metric] = {
        direction: trendDirection(values),
        latest: values[values.length - 1],
        values,
      };
    }

    // ── Step 4: Medication + dosing check ──────────────────────────

    ctx.log("info", "Step 4/6: Checking medications and dosing adherence");

    const dosingRegimens = await prisma.dosingRegimen.findMany({
      where: { patientId: input.patientId, active: true },
      include: { product: true },
    });

    const recentDoses = await prisma.doseLog.findMany({
      where: { patientId: input.patientId, loggedAt: { gte: thirtyDaysAgo } },
      orderBy: { loggedAt: "desc" },
    });

    const expectedDosesPerDay = dosingRegimens.reduce(
      (sum, r) => sum + r.frequencyPerDay,
      0,
    );
    const daysTracked = Math.max(1, Math.min(30, daysAgo(thirtyDaysAgo)));
    const expectedTotal = expectedDosesPerDay * daysTracked;
    const adherenceRate =
      expectedTotal > 0
        ? Math.min(100, Math.round((recentDoses.length / expectedTotal) * 100))
        : null;

    // ── Step 5: Recent messages + assessments ──────────────────────

    ctx.log("info", "Step 5/6: Scanning recent messages and assessments");

    const [recentMessages, recentAssessments, openTasks] = await Promise.all([
      prisma.message.findMany({
        where: {
          thread: { patientId: input.patientId },
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { sender: { select: { firstName: true, lastName: true } } },
      }),
      prisma.assessmentResponse.findMany({
        where: { patientId: input.patientId },
        orderBy: { submittedAt: "desc" },
        take: 3,
        include: { assessment: true },
      }),
      prisma.task.findMany({
        where: { patientId: input.patientId, status: { in: ["open", "in_progress"] } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // ── Step 6: Generate briefing via LLM ──────────────────────────

    ctx.log("info", "Step 6/6: Generating intelligence briefing via LLM");

    // ── Step 5b: longitudinal memory + recent observations ────────
    // Everything the harness has ever learned about this person. The
    // physician is about to walk into a room with them — the briefing
    // should reflect the full understanding we've accumulated, not
    // just the structured fields.
    const trace = startReasoning("preVisitIntelligence", "1.0.0", ctx.jobId);
    trace.step("load core chart data", {
      patientId: input.patientId,
    });

    const memories = await recallMemories(input.patientId, { limit: 32 });
    trace.step("recalled memories", { count: memories.length });
    trace.source(
      "memories",
      memories.map((m) => m.id),
    );

    const observations = await recallObservations(input.patientId, {
      onlyOpen: true,
      limit: 12,
    });
    trace.step("recalled open observations", { count: observations.length });
    trace.source(
      "observations",
      observations.map((o) => o.id),
    );

    // ── Step 5c: cohort context ─────────────────────────────────────
    // "How have similar patients on similar regimens actually responded?"
    // This is the single biggest clinical superpower the harness gives
    // the physician — evidence from within their own practice, not just
    // the journal literature.
    let cohortSummary: string | null = null;
    try {
      const similar = await findSimilarPatients(input.patientId, {
        limit: 5,
      });
      trace.step("found similar patients", { count: similar.length });
      if (similar.length >= 2) {
        const cohortOutcomes = await summarizeCohortOutcomes(
          similar.map((s) => s.patientId),
        );
        cohortSummary = formatCohortInsightForPrompt({
          similar,
          outcomes: cohortOutcomes,
        });
        trace.source(
          "cohort",
          similar.map((s) => s.patientId),
        );
      }
    } catch (err) {
      // Cohort is opportunistic — a failure never blocks the briefing.
      ctx.log("warn", "Cohort context unavailable for briefing", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const prompt = buildBriefingPrompt({
      patient,
      age,
      lastEncounter,
      lastNoteSummary,
      trends,
      dosingRegimens,
      adherenceRate,
      recentDoses: recentDoses.length,
      recentMessages,
      recentAssessments,
      openTasks,
      memoryBlock: formatMemoriesForPrompt(memories),
      observationsBlock: formatObservationsForPrompt(observations),
      cohortSummary,
    });

    let raw: string;
    try {
      raw = await ctx.model.complete(prompt, {
        maxTokens: 1024,
        temperature: 0.2,
      });
      trace.step("llm briefing complete", { rawLen: raw.length });
    } catch (llmErr) {
      ctx.log("warn", "LLM call failed — using deterministic briefing", {
        error: llmErr instanceof Error ? llmErr.message : String(llmErr),
      });
      trace.step("llm briefing failed — using deterministic fallback");
      raw = ""; // triggers fallback path below
    }

    // Try to parse structured response; fall back to template
    const parsed = tryParseJSON(raw);

    if (parsed?.talkingPoints) {
      ctx.log("info", "Briefing generated successfully", {
        sections: parsed.sections?.length ?? 0,
        riskFlags: parsed.riskFlags?.length ?? 0,
      });

      await writeAgentAudit(
        "preVisitIntelligence",
        "1.0.0",
        ctx.organizationId,
        "generate_briefing",
        { type: "patient", id: input.patientId },
        { confidence: parsed.confidence ?? 0.8 },
      );

      trace.conclude({
        confidence: parsed.confidence ?? 0.8,
        summary: `Briefing drafted using ${memories.length} memories and ${observations.length} open observations${cohortSummary ? " + cohort context" : ""}. ${parsed.talkingPoints.length} talking points, ${(parsed.riskFlags ?? []).length} risk flags.`,
      });
      await trace.persist();

      const briefing = {
        patientSummary: parsed.patientSummary ?? buildFallbackSummary(patient, age),
        lastVisitSummary: parsed.lastVisitSummary ?? lastNoteSummary,
        talkingPoints: parsed.talkingPoints ?? [],
        sections: parsed.sections ?? [],
        riskFlags: parsed.riskFlags ?? [],
        confidence: parsed.confidence ?? 0.8,
      };

      await persistBriefingToEncounter(input.encounterId, briefing);

      return briefing;
    }

    // Fallback: build deterministic briefing from data
    ctx.log("info", "LLM returned non-structured response; using deterministic briefing");

    const sections: z.infer<typeof briefingSection>[] = [];
    const riskFlags: string[] = [];
    const talkingPoints: string[] = [];

    // Outcome trends
    for (const [metric, trend] of Object.entries(trends)) {
      if (trend.direction === "worsening") {
        riskFlags.push(
          `${metric} is worsening — latest: ${trend.latest.toFixed(1)}/10`,
        );
        talkingPoints.push(
          `Discuss ${metric} — trending worse over the last 30 days`,
        );
      } else if (trend.direction === "improving") {
        sections.push({
          title: `${metric} improving`,
          content: `Latest: ${trend.latest.toFixed(1)}/10, trending down over ${trend.values.length} data points.`,
          priority: "low",
          icon: "trend",
        });
      }
    }

    // Adherence
    if (adherenceRate !== null && adherenceRate < 70) {
      riskFlags.push(
        `Low medication adherence: ${adherenceRate}% (${recentDoses.length} doses logged vs ${expectedTotal} expected)`,
      );
      talkingPoints.push("Discuss medication adherence — consider barriers");
    }

    // Open tasks
    if (openTasks.length > 0) {
      sections.push({
        title: `${openTasks.length} open task(s)`,
        content: openTasks.map((t) => t.title).join(", "),
        priority: "medium",
        icon: "task",
      });
      talkingPoints.push("Review open tasks from prior visits");
    }

    // Last visit recap
    if (lastEncounter) {
      sections.push({
        title: "Last visit",
        content: `${daysAgo(lastEncounter.createdAt)} days ago (${lastEncounter.modality}). ${lastNoteSummary ?? "No note summary available."}`,
        priority: "medium",
        icon: "note",
      });
    }

    // Medications
    if (dosingRegimens.length > 0) {
      sections.push({
        title: "Active cannabis regimens",
        content: dosingRegimens
          .map(
            (r: any) =>
              `${r.product?.name ?? "Unknown"}: ${r.volumePerDose}${r.volumeUnit} ${r.frequencyPerDay}x/day`,
          )
          .join("; "),
        priority: "low",
        icon: "medication",
      });
    }

    if (patient.medications.length > 0) {
      sections.push({
        title: "Conventional medications",
        content: patient.medications
          .map((m: any) => `${m.name}${m.dosage ? ` (${m.dosage})` : ""}`)
          .join(", "),
        priority: "low",
        icon: "medication",
      });
    }

    // Messages
    if (recentMessages.length > 0) {
      const unreadCount = recentMessages.filter(
        (m) => m.status === "draft",
      ).length;
      if (unreadCount > 0) {
        talkingPoints.push(`${unreadCount} recent message(s) to review`);
      }
    }

    if (talkingPoints.length === 0) {
      talkingPoints.push("Routine follow-up — review outcomes and care plan");
    }

    trace.conclude({
      confidence: 0.75,
      summary: `Deterministic fallback briefing: ${sections.length} sections, ${riskFlags.length} risk flags, ${talkingPoints.length} talking points (LLM path unavailable).`,
    });
    await trace.persist();

    const briefing = {
      patientSummary: buildFallbackSummary(patient, age),
      lastVisitSummary: lastNoteSummary,
      talkingPoints,
      sections,
      riskFlags,
      confidence: 0.75,
    };

    await persistBriefingToEncounter(input.encounterId, briefing);

    return briefing;
  },
};

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildFallbackSummary(patient: any, age: number | null): string {
  const parts = [`${patient.firstName} ${patient.lastName}`];
  if (age) parts.push(`${age}yo`);
  if (patient.presentingConcerns) parts.push(`presenting with ${patient.presentingConcerns}`);
  if (patient.treatmentGoals) parts.push(`goals: ${patient.treatmentGoals}`);
  return parts.join(", ");
}

function buildBriefingPrompt(data: {
  patient: any;
  age: number | null;
  lastEncounter: any;
  lastNoteSummary: string | null;
  trends: Record<string, { direction: string; latest: number; values: number[] }>;
  dosingRegimens: any[];
  adherenceRate: number | null;
  recentDoses: number;
  recentMessages: any[];
  recentAssessments: any[];
  openTasks: any[];
  memoryBlock: string;
  observationsBlock: string;
  cohortSummary: string | null;
}): string {
  const { patient, age, lastEncounter, lastNoteSummary, trends, dosingRegimens, adherenceRate, recentDoses, recentMessages, recentAssessments, openTasks, memoryBlock, observationsBlock, cohortSummary } = data;

  return `You are an AI clinical assistant preparing a pre-visit intelligence briefing for a physician. You've known this patient for a while — the WHAT WE ALREADY KNOW block below is the accumulated understanding of who this person is and what matters to their care.

PATIENT: ${patient.firstName} ${patient.lastName}${age ? `, ${age}yo` : ""}
STATUS: ${patient.status}
PRESENTING CONCERNS: ${patient.presentingConcerns ?? "Not documented"}
TREATMENT GOALS: ${patient.treatmentGoals ?? "Not documented"}

WHAT WE ALREADY KNOW ABOUT THIS PERSON (longitudinal memory):
${memoryBlock}

WHAT THE CARE TEAM HAS BEEN NOTICING (open observations):
${observationsBlock}
${cohortSummary ? `\nCOHORT CONTEXT (similar patients in this practice):\n${cohortSummary}` : ""}

LAST VISIT: ${lastEncounter ? `${daysAgo(lastEncounter.createdAt)} days ago (${lastEncounter.modality})` : "No prior visits"}
LAST NOTE SUMMARY: ${lastNoteSummary ?? "None"}

OUTCOME TRENDS (30 days):
${Object.entries(trends).map(([m, t]) => `  ${m}: ${t.direction} (latest ${t.latest.toFixed(1)}/10, ${t.values.length} data points)`).join("\n") || "  No outcome data"}

CANNABIS REGIMENS: ${dosingRegimens.length > 0 ? dosingRegimens.map((r: any) => `${r.product?.name ?? "Unknown"} ${r.volumePerDose}${r.volumeUnit} ${r.frequencyPerDay}x/day`).join("; ") : "None"}
CONVENTIONAL MEDS: ${patient.medications?.map((m: any) => m.name).join(", ") || "None"}
ADHERENCE: ${adherenceRate !== null ? `${adherenceRate}% (${recentDoses} doses logged)` : "No dosing data"}

RECENT ASSESSMENTS: ${recentAssessments.map((a: any) => `${a.assessment.slug} (score: ${(a.answers as any)?.totalScore ?? "N/A"})`).join("; ") || "None"}
OPEN TASKS: ${openTasks.map((t: any) => t.title).join("; ") || "None"}
RECENT MESSAGES: ${recentMessages.length} in last 30 days

Return a JSON object with:
{
  "patientSummary": "1-2 sentence patient overview that ACTUALLY reflects what we know about them, not a rote demographic line",
  "lastVisitSummary": "Brief recap of last visit or null",
  "talkingPoints": ["3-5 specific talking points for today's visit — lean on the memory and cohort context when possible, e.g. 'Sleep has been trending up on CBN; consider reinforcing' beats 'Ask about sleep'"],
  "sections": [
    {"title": "...", "content": "...", "priority": "high|medium|low", "icon": "alert|trend|medication|research|note|task|message"}
  ],
  "riskFlags": ["Any urgent concerns the physician should address immediately"],
  "confidence": 0.0-1.0
}

Focus on what CHANGED since last visit. Prioritize actionable insights over raw data. If the memory or cohort context meaningfully informs a talking point, reference it explicitly in the content (e.g. "4 similar patients on CBD:THC 1:1 reported improved sleep within 3 weeks — we're seeing the same pattern here").

NON-NEGOTIABLE SAFETY GATES:
- PEDIATRIC (age < 18): ${age !== null && age < 18 ? "THIS PATIENT IS PEDIATRIC. Add a FIRST riskFlag: 'Pediatric patient — THC is contraindicated absent a narrow pediatric-approved indication and guardian consent. Any cannabis recommendation requires dual-physician sign-off.' Do NOT suggest starting or escalating THC-dominant regimens." : "(not applicable)"}
- PREGNANCY / LACTATION: If presentingConcerns, chart summary, memory, or last note mentions pregnancy, "trying to conceive", "breastfeeding", or "postpartum", add a FIRST riskFlag: "Pregnancy/lactation concern — cannabis crosses the placenta and enters breast milk. Re-evaluate regimen per ACOG guidance before continuing." Do NOT include a continue-regimen talking point without this risk flag.
- PSYCHIATRIC CONTRAINDICATIONS: If memory, presenting concerns, or notes reference bipolar I, schizophrenia, schizoaffective disorder, active psychosis, or family history of schizophrenia, add a riskFlag: "Psychiatric contraindication on file — THC-dominant regimens carry decompensation risk. Prefer CBD-dominant; require psychiatry sign-off for any THC >2.5mg/dose."
- COHORT UNCERTAINTY: Only cite similar-patient outcomes if the COHORT CONTEXT block above explicitly states ≥2 similar patients AND identical regimen class. If the cohort is sparse or mixed, either omit the citation or hedge it: "Cohort data is limited — exercise caution." Never invent similar-patient outcomes.
- LANGUAGE: If the CHART SUMMARY or RECENT MESSAGES include content in a non-English language, note it in the patientSummary: "Patient corresponds in [language]; ensure interpreter / translated materials at visit." The physician can then plan interpreter support.`;
}

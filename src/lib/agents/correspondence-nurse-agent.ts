import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Correspondence Nurse Agent
// ---------------------------------------------------------------------------
// This is the flagship clinical messaging agent. Per Scott's direction:
// "Correspondence is where most of the work must be done. This agent
// could change health care."
//
// What it does on every patient-initiated message:
//   1. Triage urgency (emergency / high / routine / low)
//   2. Classify intent (symptom, refill, appointment, side effect, etc.)
//   3. Detect safety flags (red-flag symptoms that need immediate escalation)
//   4. Summarize the full thread in 1-2 sentences for busy clinicians
//   5. Draft a clinically appropriate response using patient context:
//      - Current medications + dosing regimens
//      - Recent outcome logs
//      - Upcoming appointments
//      - Prior conversation history on this thread
//      - Known allergies + chart summary
//
// Every draft is approval-gated. The nurse agent NEVER sends messages on
// its own. It does the triage + drafting work so the clinician can review,
// tweak, and sign off in seconds instead of minutes.
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

function formatRelative(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

const input = z.object({
  threadId: z.string(),
  /** Optional: the specific message that triggered the run (usually the patient's new inbound message) */
  triggeringMessageId: z.string().optional(),
});

const triageSchema = z.object({
  urgency: z.enum(["emergency", "high", "routine", "low"]),
  category: z.enum([
    "symptom_report",
    "side_effect",
    "refill_request",
    "appointment_question",
    "billing_question",
    "dosing_question",
    "result_inquiry",
    "general_question",
    "gratitude",
    "unknown",
  ]),
  safetyFlags: z.array(z.string()),
  summary: z.string(),
  suggestedNextActions: z.array(z.string()),
  draftBody: z.string(),
});

const output = z.object({
  threadId: z.string(),
  urgency: z.string(),
  category: z.string(),
  safetyFlags: z.array(z.string()),
  summary: z.string(),
  suggestedNextActions: z.array(z.string()),
  draftMessageId: z.string().nullable(),
  draftBody: z.string(),
  usedLLM: z.boolean(),
});

// ---------------------------------------------------------------------------
// Safety keywords — hard-coded list that ALWAYS flags regardless of LLM
// ---------------------------------------------------------------------------

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "difficulty breathing",
  "trouble breathing",
  "can't breathe",
  "suicidal",
  "suicide",
  "kill myself",
  "hurting myself",
  "hurt myself",
  "end it all",
  "bleeding",
  "fainted",
  "passed out",
  "severe allergic",
  "anaphylax",
  "stroke",
  "numbness on one side",
  "slurred speech",
  "worst headache",
  "poisoning",
  "overdose",
];

const HIGH_URGENCY_KEYWORDS = [
  "worse",
  "worsening",
  "much worse",
  "can't sleep",
  "not working",
  "side effect",
  "rash",
  "swelling",
  "confused",
  "fever",
  "vomiting",
  "severe",
];

function detectSafetyFlags(text: string): { flags: string[]; forceUrgency: string | null } {
  const lowered = text.toLowerCase();
  const flags: string[] = [];
  let forceUrgency: string | null = null;

  for (const kw of EMERGENCY_KEYWORDS) {
    if (lowered.includes(kw)) {
      flags.push(`🚨 Emergency keyword: "${kw}"`);
      forceUrgency = "emergency";
    }
  }

  if (!forceUrgency) {
    for (const kw of HIGH_URGENCY_KEYWORDS) {
      if (lowered.includes(kw)) {
        flags.push(`⚠ High-urgency keyword: "${kw}"`);
        forceUrgency = forceUrgency === "emergency" ? "emergency" : "high";
      }
    }
  }

  return { flags, forceUrgency };
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export const correspondenceNurseAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "correspondenceNurse",
  version: "1.0.0",
  description:
    "Clinical messaging nurse. Triages inbound patient messages for " +
    "urgency, category, and safety flags. Drafts clinically appropriate " +
    "responses using full patient context. Always approval-gated.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.patient",
    "read.note",
    "read.claim",
    "write.message.draft",
  ],
  requiresApproval: true,

  async run({ threadId }, ctx) {
    ctx.assertCan("read.patient");
    ctx.log("info", "Triaging correspondence thread", { threadId });

    // ── Step 1: Load the full thread + patient context ─────────
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        patient: {
          include: {
            chartSummary: true,
            medications: { where: { active: true } },
            dosingRegimens: {
              where: { active: true },
              include: { product: true },
            },
            outcomeLogs: {
              orderBy: { loggedAt: "desc" },
              take: 10,
            },
            encounters: {
              orderBy: { createdAt: "desc" },
              take: 2,
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!thread) throw new Error(`Thread ${threadId} not found`);

    const patient = thread.patient;

    // The most recent patient-originated message is the one we're responding to
    const mostRecentPatientMessage = [...thread.messages]
      .reverse()
      .find(
        (m) => m.senderUserId && m.senderUserId === patient.userId && m.status === "sent",
      );

    const patientMessageText = mostRecentPatientMessage?.body ?? "";

    // ── Step 2: Deterministic safety scan (always runs, never skipped) ──
    const { flags: deterministicFlags, forceUrgency } =
      detectSafetyFlags(patientMessageText);

    // ── Step 3: Build the clinical context block for the LLM ────
    const cannabisMeds = patient.dosingRegimens
      .map((r: any) => {
        const product = r.product;
        const mg = r.calculatedThcMgPerDose != null
          ? `${r.calculatedThcMgPerDose}mg THC${r.calculatedCbdMgPerDose ? ` + ${r.calculatedCbdMgPerDose}mg CBD` : ""}`
          : `${r.volumePerDose}${r.volumeUnit}`;
        return `  - ${product?.name ?? "cannabis product"}: ${mg}, ${r.frequencyPerDay}x/day`;
      })
      .join("\n") || "  (none active)";

    const conventionalMeds = patient.medications
      .map((m: any) => `  - ${m.name}${m.dosage ? ` (${m.dosage})` : ""}`)
      .join("\n") || "  (none on file)";

    const recentOutcomes = patient.outcomeLogs
      .slice(0, 6)
      .map((o: any) => `  - ${o.metric}: ${o.value}/10 (${formatRelative(o.loggedAt)})`)
      .join("\n") || "  (no recent check-ins)";

    const lastEncounter = patient.encounters[0];
    const lastEncounterText = lastEncounter
      ? `Last visit: ${formatRelative(lastEncounter.createdAt)} (${lastEncounter.modality})`
      : "No prior visits";

    const conversationHistory = thread.messages
      .map((m) => {
        const sender = m.senderUserId
          ? m.sender
            ? `${m.sender.firstName} ${m.sender.lastName}`
            : "Patient"
          : m.senderAgent
            ? "AI Draft"
            : "Care Team";
        const status = m.status === "draft" ? " [unsent draft]" : "";
        return `${sender}${status}: ${m.body}`;
      })
      .join("\n---\n");

    const contextBlock = `
PATIENT: ${patient.firstName} ${patient.lastName}
PRESENTING CONCERNS: ${patient.presentingConcerns ?? "Not documented"}
TREATMENT GOALS: ${patient.treatmentGoals ?? "Not documented"}

ACTIVE CANNABIS REGIMENS:
${cannabisMeds}

OTHER MEDICATIONS:
${conventionalMeds}

RECENT OUTCOME CHECK-INS:
${recentOutcomes}

${lastEncounterText}

CHART SUMMARY:
${patient.chartSummary?.summaryMd ?? "(no chart summary yet)"}

CONVERSATION HISTORY:
${conversationHistory}

THE MESSAGE WE'RE RESPONDING TO (most recent from patient):
"${patientMessageText}"
`.trim();

    // ── Step 4: Prompt the LLM ───────────────────────────────────
    const prompt = `You are the nurse care coordinator for Green Path Health, a cannabis care practice. You triage inbound patient messages and draft clinically appropriate responses for the physician to approve.

You are warm but direct. You know when to reassure and when to escalate. You write like a real nurse — not a chatbot.

${contextBlock}

Your job is two-fold:
1) TRIAGE the message — urgency, category, safety flags, summary
2) DRAFT a response that the physician can approve with minimal edits

Rules:
- If the patient mentions ANY emergency symptom (chest pain, trouble breathing, suicidal thoughts, severe allergic reaction, stroke symptoms), urgency MUST be "emergency" and the draft MUST instruct them to call 911 or go to the ER immediately. Do not try to treat these in a message.
- If the patient reports a worsening condition or serious side effect, urgency is "high" and the draft should acknowledge their concern, gather brief additional info, and offer to schedule an urgent visit.
- For routine refill requests, dosing questions, or appointment changes, urgency is "routine" and draft a clear, warm response that answers their question or sets up the next step.
- For messages of gratitude or positive updates, urgency is "low" and draft a warm acknowledgment.
- Use the patient's cannabis regimen, other medications, and recent outcome logs in your response when clinically relevant (e.g. "I see your pain was at 6/10 on Tuesday — is it similar today?")
- Use the patient's first name naturally, not constantly
- Do not make up medical facts or dosing not in the patient's chart
- Do not diagnose — the physician does that
- Always end with a clear path forward: next step, offer to help, or a question that moves the conversation
- Keep the draft under 150 words unless the clinical situation demands more

Return ONLY valid JSON in this exact shape:
{
  "urgency": "emergency" | "high" | "routine" | "low",
  "category": "symptom_report" | "side_effect" | "refill_request" | "appointment_question" | "billing_question" | "dosing_question" | "result_inquiry" | "general_question" | "gratitude" | "unknown",
  "safetyFlags": ["string description of each flag, or empty array"],
  "summary": "1-2 sentence summary of the thread for the physician",
  "suggestedNextActions": ["2-4 short action items for the physician or staff"],
  "draftBody": "The complete message response text to send to the patient"
}`;

    let raw = "";
    let usedLLM = false;
    try {
      raw = await ctx.model.complete(prompt, {
        maxTokens: 1024,
        temperature: 0.35,
      });
      usedLLM = raw.length > 50 && !raw.startsWith("[stub");
    } catch (err) {
      ctx.log("warn", "Correspondence Nurse LLM call failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Step 5: Parse the structured output ─────────────────────
    let triage: z.infer<typeof triageSchema> | null = null;
    if (usedLLM) {
      const parsed = tryParseJSON(raw);
      if (parsed && parsed.urgency && parsed.draftBody) {
        const validation = triageSchema.safeParse(parsed);
        if (validation.success) {
          triage = validation.data;
        } else {
          ctx.log("warn", "LLM output failed schema validation — using fallback", {
            issues: validation.error.issues.slice(0, 3),
          });
        }
      }
    }

    // ── Step 6: Deterministic fallback if LLM unavailable or malformed ──
    if (!triage) {
      const fallbackUrgency =
        forceUrgency ?? (patientMessageText.length > 0 ? "routine" : "low");
      triage = {
        urgency: fallbackUrgency as any,
        category: "unknown",
        safetyFlags: [],
        summary: patientMessageText
          ? `${patient.firstName} sent a message about their care. Needs human review.`
          : `Thread with ${patient.firstName} — awaiting message.`,
        suggestedNextActions: [
          "Review the patient's message and craft a personalized response",
        ],
        draftBody:
          `Hi ${patient.firstName}, thanks for reaching out. I want to make sure I give you a thoughtful response — ` +
          `one of our care team members will review your message and get back to you shortly.`,
      };
    }

    // Always merge in deterministic safety flags (LLM may miss them)
    const allFlags = [...new Set([...triage.safetyFlags, ...deterministicFlags])];

    // If deterministic scan detected emergency, FORCE the urgency up
    const finalUrgency =
      forceUrgency === "emergency"
        ? "emergency"
        : forceUrgency === "high" && triage.urgency !== "emergency"
          ? "high"
          : triage.urgency;

    // ── Step 7: Persist thread triage metadata + draft message ──
    ctx.assertCan("write.message.draft");

    await prisma.messageThread.update({
      where: { id: threadId },
      data: {
        triageUrgency: finalUrgency,
        triageCategory: triage.category,
        triageSafetyFlags: allFlags as any,
        triageSummary: triage.summary,
        triagedAt: new Date(),
      },
    });

    // Only create a draft if the most recent message isn't already an unsent draft
    const lastMessage = thread.messages[thread.messages.length - 1];
    const lastIsUnsentDraft =
      lastMessage?.status === "draft" && lastMessage.aiDrafted;

    let draftMessageId: string | null = null;
    if (!lastIsUnsentDraft) {
      const draft = await prisma.message.create({
        data: {
          threadId,
          body: triage.draftBody,
          status: "draft",
          aiDrafted: true,
          senderAgent: "correspondenceNurse:1.0.0",
        },
      });
      draftMessageId = draft.id;
    } else {
      draftMessageId = lastMessage.id;
      // Update the existing draft in place
      await prisma.message.update({
        where: { id: lastMessage.id },
        data: { body: triage.draftBody },
      });
    }

    await writeAgentAudit(
      "correspondenceNurse",
      "1.0.0",
      patient.organizationId,
      "message.triaged_and_drafted",
      { type: "MessageThread", id: threadId },
      {
        urgency: finalUrgency,
        category: triage.category,
        safetyFlagCount: allFlags.length,
        usedLLM,
      },
    );

    ctx.log("info", "Correspondence triage complete", {
      threadId,
      urgency: finalUrgency,
      category: triage.category,
      safetyFlags: allFlags.length,
      usedLLM,
    });

    return {
      threadId,
      urgency: finalUrgency,
      category: triage.category,
      safetyFlags: allFlags,
      summary: triage.summary,
      suggestedNextActions: triage.suggestedNextActions,
      draftMessageId,
      draftBody: triage.draftBody,
      usedLLM,
    };
  },
};

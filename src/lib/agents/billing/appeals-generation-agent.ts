import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";
import { formatPersonaForPrompt, resolvePersona } from "../persona";

// ---------------------------------------------------------------------------
// Appeals Generation Agent
// ---------------------------------------------------------------------------
// Creates appeal packets for denied claims worth pursuing. Drafts the appeal
// letter, attaches supporting documentation, and either auto-submits (< $500)
// or routes for human review (≥ $500).
//
// This agent answers: "Given this denial, what's the strongest appeal we can make?"
//
// Layer 3 state transition: denied → appealed
// Layer 4 events: subscribes denial.classified (resolution=appeal)
//   emits: appeal.generated, appeal.submitted, human.review.required
// ---------------------------------------------------------------------------

const input = z.object({
  claimId: z.string(),
  denialEventId: z.string(),
  organizationId: z.string(),
});

const output = z.object({
  appealPacketId: z.string().nullable(),
  appealLevel: z.number(),
  autoSubmitted: z.boolean(),
  requiresHumanReview: z.boolean(),
  recoverableAmountCents: z.number(),
  usedLLM: z.boolean(),
});

// CARC code to appeal strategy mapping
const APPEAL_STRATEGIES: Record<string, string> = {
  "50": "Attach clinical documentation demonstrating medical necessity. Reference relevant clinical guidelines and the patient's treatment history.",
  "96": "Verify the service is covered under the patient's plan. If covered, appeal with plan documentation and the specific benefit language.",
  "197": "Attach the prior authorization number if one was obtained. If PA was not required per the plan, cite the specific policy.",
  "16": "Provide the missing/incomplete information referenced in the RARC code. Include all supporting documentation.",
  "4": "Review the modifier logic. If the modifier was correctly applied, cite the CCI/NCCI edit that supports it with documentation of the distinct service.",
  "29": "Provide proof of timely filing — original submission date, clearinghouse acceptance receipt, and any prior correspondence.",
};

export const appealsGenerationAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "appealsGeneration",
  version: "1.0.0",
  description:
    "Generates appeal packets for denied claims. Drafts appeal letters with " +
    "supporting documentation. Auto-submits recoverable amounts < $500, " +
    "routes ≥ $500 to human review.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.claim",
    "read.patient",
    "read.note",
    "write.claim.status",
  ],
  requiresApproval: false,

  async run({ claimId, denialEventId, organizationId }, ctx) {
    const trace = startReasoning("appealsGeneration", "1.0.0", ctx.jobId);
    trace.step("begin appeal generation", { claimId, denialEventId });

    ctx.assertCan("read.claim");

    // ── Load denial + claim + documentation ─────────────────────
    const denial = await prisma.denialEvent.findUnique({
      where: { id: denialEventId },
    });
    if (!denial) throw new Error(`DenialEvent ${denialEventId} not found`);

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        patient: true,
        encounter: {
          include: {
            notes: {
              where: { status: "finalized" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        provider: true,
      },
    });
    if (!claim) throw new Error(`Claim ${claimId} not found`);

    trace.step("loaded denial + claim", {
      carcCode: denial.carcCode,
      groupCode: denial.groupCode,
      amountDeniedCents: denial.amountDeniedCents,
      recoverableAmountCents: denial.recoverableAmountCents,
    });

    // ── Check if appeal is worth pursuing (Layer 1 guardrails) ──
    const recoverableAmount = denial.recoverableAmountCents ?? denial.amountDeniedCents;
    if (recoverableAmount < 7500) { // $75 minimum per Layer 5
      ctx.log("info", "Recoverable amount below $75 threshold — not worth appealing");
      trace.conclude({
        confidence: 0.95,
        summary: `Denial for $${(denial.amountDeniedCents / 100).toFixed(2)} below appeal threshold ($75). Recommend write-off.`,
      });
      await trace.persist();
      return {
        appealPacketId: null,
        appealLevel: 0,
        autoSubmitted: false,
        requiresHumanReview: false,
        recoverableAmountCents: recoverableAmount,
        usedLLM: false,
      };
    }

    // ── Check existing appeals (max 3 levels) ───────────────────
    const existingAppeals = await prisma.appealPacket.findMany({
      where: { claimId, denialEventId },
      orderBy: { appealLevel: "desc" },
    });
    const nextLevel = existingAppeals.length > 0
      ? (existingAppeals[0].appealLevel + 1)
      : 1;

    if (nextLevel > 3) {
      ctx.log("warn", "Max appeal levels (3) exhausted for this denial");
      trace.conclude({
        confidence: 0.95,
        summary: "All 3 appeal levels exhausted. Escalating for write-off review.",
      });
      await ctx.emit({
        name: "human.review.required",
        sourceAgent: "appealsGeneration",
        category: "high_dollar",
        claimId,
        patientId: claim.patientId,
        summary: `All 3 appeal levels exhausted for CARC ${denial.carcCode} denial ($${(denial.amountDeniedCents / 100).toFixed(2)}). Write-off decision needed.`,
        suggestedAction: "Review denial history and decide: write-off or external review.",
        tier: denial.amountDeniedCents >= 50000 ? 3 : 1, // $500+ = practice owner
        organizationId,
      });
      await trace.persist();
      return {
        appealPacketId: null,
        appealLevel: nextLevel,
        autoSubmitted: false,
        requiresHumanReview: true,
        recoverableAmountCents: recoverableAmount,
        usedLLM: false,
      };
    }

    trace.step("appeal level determined", { nextLevel, existingAppeals: existingAppeals.length });

    // ── Build supporting documentation references ───────────────
    const supportingDocIds: string[] = [];
    if (claim.encounter) {
      // Attach finalized clinical notes
      for (const note of claim.encounter.notes) {
        supportingDocIds.push(note.id);
      }
      // Attach any documents linked to the encounter
      const docs = await prisma.document.findMany({
        where: { encounterId: claim.encounterId!, deletedAt: null },
        select: { id: true },
      });
      supportingDocIds.push(...docs.map((d) => d.id));
    }

    trace.step("gathered supporting documents", { count: supportingDocIds.length });

    // ── Generate appeal letter via LLM ──────────────────────────
    const strategy = APPEAL_STRATEGIES[denial.carcCode] ?? "Provide clinical documentation supporting the medical necessity of the service.";
    const noteText = claim.encounter?.notes[0]
      ? (Array.isArray((claim.encounter.notes[0] as any).blocks)
          ? (claim.encounter.notes[0] as any).blocks.map((b: any) => `${b.heading}: ${b.body}`).join("\n")
          : "")
      : "";

    const prompt = `You are a medical billing appeals specialist. Draft a professional appeal letter for a denied claim.

DENIAL DETAILS:
- CARC Code: ${denial.carcCode}
- RARC Code: ${denial.rarcCode ?? "N/A"}
- Group Code: ${denial.groupCode}
- Amount Denied: $${(denial.amountDeniedCents / 100).toFixed(2)}
- Appeal Level: ${nextLevel} of 3

CLAIM DETAILS:
- Claim Number: ${claim.claimNumber}
- Date of Service: ${claim.serviceDate.toISOString().slice(0, 10)}
- CPT Codes: ${JSON.stringify(claim.cptCodes)}
- ICD-10 Codes: ${JSON.stringify(claim.icd10Codes)}
- Payer: ${claim.payerName ?? "Unknown"}
- Patient: ${claim.patient.firstName} ${claim.patient.lastName}
- Provider: ${claim.provider?.title ?? "Provider"}

CLINICAL DOCUMENTATION SUMMARY:
${noteText || "(not available)"}

APPEAL STRATEGY:
${strategy}

Draft a concise, professional appeal letter (under 400 words) that:
1. States the claim number, date of service, and denial reason
2. Explains why the denial should be overturned
3. References the specific clinical documentation that supports the service
4. Cites relevant clinical guidelines or payer policy where applicable
5. Requests reconsideration and full payment
6. Is firm but professional — not aggressive or threatening

Do NOT include placeholder brackets like [Doctor Name]. Use the actual data provided.
Return ONLY the letter text, no JSON.`;

    let appealLetter = "";
    let usedLLM = false;

    try {
      appealLetter = await ctx.model.complete(prompt, {
        maxTokens: 800,
        temperature: 0.25,
      });
      usedLLM = appealLetter.length > 50 && !appealLetter.startsWith("[stub");
      trace.step("generated appeal letter", { usedLLM, letterLen: appealLetter.length });
    } catch (err) {
      ctx.log("warn", "LLM appeal letter generation failed — using template", {
        error: err instanceof Error ? err.message : String(err),
      });
      trace.step("llm failed — using template letter");
    }

    // Deterministic fallback letter
    if (!usedLLM || appealLetter.length < 50) {
      appealLetter = `Dear Claims Review Department,

We are writing to appeal the denial of Claim ${claim.claimNumber ?? claimId} for date of service ${claim.serviceDate.toISOString().slice(0, 10)}.

The claim was denied with reason code ${denial.carcCode} (${denial.rarcCode ?? "no remark code"}). We believe this denial was issued in error and respectfully request reconsideration.

The services rendered were medically necessary and fully documented in the enclosed clinical records. ${strategy}

We are enclosing the complete clinical documentation for your review. We request that you overturn this denial and process payment of $${(denial.amountDeniedCents / 100).toFixed(2)} at your earliest convenience.

Please contact our office if additional information is needed.

Sincerely,
Leafjourney Billing Department`;
    }

    // ── Create the appeal packet ────────────────────────────────
    ctx.assertCan("write.claim.status");

    const packet = await prisma.appealPacket.create({
      data: {
        claimId,
        denialEventId,
        appealLevel: nextLevel,
        appealLetter,
        supportingDocIds,
        generatedBy: "appealsGeneration:1.0.0",
        status: "draft",
      },
    });

    trace.step("created appeal packet", { appealPacketId: packet.id, level: nextLevel });

    // ── Route: auto-submit or human review (Layer 5 thresholds) ─
    const requiresHumanReview = recoverableAmount >= 50000; // $500+

    if (requiresHumanReview) {
      await ctx.emit({
        name: "human.review.required",
        sourceAgent: "appealsGeneration",
        category: "high_dollar",
        claimId,
        patientId: claim.patientId,
        summary: `Appeal generated for $${(denial.amountDeniedCents / 100).toFixed(2)} denial (CARC ${denial.carcCode}, Level ${nextLevel}). Requires review before submission.`,
        suggestedAction: "Review appeal letter and supporting docs, then approve for submission.",
        tier: 1,
        organizationId,
      });
      trace.step("routed to human review", { reason: "recoverable >= $500" });
    } else {
      // Auto-submit (mark as submitted — actual submission is Phase 6)
      await prisma.appealPacket.update({
        where: { id: packet.id },
        data: { status: "submitted", submittedAt: new Date() },
      });
      await prisma.denialEvent.update({
        where: { id: denialEventId },
        data: { resolution: "appealed" },
      });
      await prisma.claim.update({
        where: { id: claimId },
        data: { status: "appealed" },
      });
      await ctx.emit({
        name: "appeal.submitted",
        claimId,
        appealPacketId: packet.id,
        organizationId,
      });
      trace.step("auto-submitted appeal", { level: nextLevel });
    }

    await ctx.emit({
      name: "appeal.generated",
      claimId,
      appealPacketId: packet.id,
      organizationId,
    });

    await writeAgentAudit(
      "appealsGeneration",
      "1.0.0",
      organizationId,
      "appeal.generated",
      { type: "AppealPacket", id: packet.id },
      {
        carcCode: denial.carcCode,
        level: nextLevel,
        recoverableCents: recoverableAmount,
        autoSubmitted: !requiresHumanReview,
        usedLLM,
      },
    );

    trace.conclude({
      confidence: usedLLM ? 0.8 : 0.65,
      summary: `Generated Level ${nextLevel} appeal for CARC ${denial.carcCode} denial ($${(denial.amountDeniedCents / 100).toFixed(2)}). ${requiresHumanReview ? "Routed to human review." : "Auto-submitted."}`,
    });
    await trace.persist();

    return {
      appealPacketId: packet.id,
      appealLevel: nextLevel,
      autoSubmitted: !requiresHumanReview,
      requiresHumanReview,
      recoverableAmountCents: recoverableAmount,
      usedLLM,
    };
  },
};

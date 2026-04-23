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

// ---------------------------------------------------------------------------
// Cannabis-specific appeal strategies
// ---------------------------------------------------------------------------
// Generic CARC strategies miss the cannabis sub-texture: an F12.x "50"
// denial needs DSM-5 severity + prior-treatment failure docs + a cited
// payer policy, not just "attach the clinical note." These templates
// enforce that the appeal letter explicitly asserts each of those four
// elements so we don't waste an appeal on a thin letter.
export const CANNABIS_APPEAL_STRATEGIES: Record<string, string> = {
  "50":
    "F12 medical-necessity denial. Appeal letter MUST assert four elements: " +
    "(1) exact DSM-5 severity count with quoted criteria met by the patient, " +
    "(2) documented prior-treatment failures with dates and outcomes, " +
    "(3) citation of this payer's cannabis / SUD coverage policy by number + effective date, " +
    "(4) provider credentials with NPI, specialty, and state license number. Do not submit without all four.",
  "96":
    "F12/Z71 non-covered denial. Before drafting, verify that the payer's published policy does NOT in fact exclude F12/Z71 services — if it does, convert to self-pay instead of appealing and burning timely filing. If covered per policy, cite the exact benefit booklet section.",
  "197":
    "Cannabis PA denial. Appeal with the PA reference number AND the approval letter. If no PA was ever obtained, stop — submit a new PA packet instead of an appeal (DSM-5 dx + prior failures + treatment plan).",
  "16":
    "Cannabis missing-information denial. The RARC code tells you what's missing; for F12 denials that's almost always the psych evaluation or prior-treatment documentation. Attach BOTH plus payer-specific coverage policy citation.",
  "4":
    "Cannabis modifier denial. For Z71.89 + E/M claims, confirm modifier 25 eligibility — not every payer honors -25 on Z71 services. If the payer policy explicitly disallows it, write off rather than appeal. Otherwise cite CCI/NCCI edit plus the separately-identifiable E/M documentation.",
};

/**
 * Pick the right appeal strategy template for a denial. If the claim has any
 * F12/Z71 diagnosis the cannabis-aware template is used; otherwise the
 * generic one. Exported so tests can exercise the matrix directly.
 */
export function resolveAppealStrategy(
  carc: string,
  icd10Codes: string[],
): string {
  const hasCannabisDx = icd10Codes.some(
    (c) => c.startsWith("F12") || c.startsWith("Z71"),
  );
  if (hasCannabisDx && CANNABIS_APPEAL_STRATEGIES[carc]) {
    return CANNABIS_APPEAL_STRATEGIES[carc];
  }
  return (
    APPEAL_STRATEGIES[carc] ??
    "Provide clinical documentation supporting the medical necessity of the service."
  );
}

// ---------------------------------------------------------------------------
// Supporting document ranking
// ---------------------------------------------------------------------------
// When an appeal letter references evidence, order matters: the payer's
// reviewer reads top-down, so the strongest document needs to be first.
// Weights reflect "how much persuasive load does this carry?":
//   1.0  finalized clinical notes (the single most-cited doc type)
//   0.95 psychiatric evaluations (decisive for F12 appeals)
//   0.9  validated assessments (PHQ-9 / GAD-7 / CUDIT-R — DSM-5 anchors)
//   0.85 prior authorization packets (show the payer already approved)
//   0.8  labs (objective anchors — toxicology, CBC, etc.)
//   0.7  imaging (context; rarely decisive for cannabis appeals)
//   0.6  generic uploaded docs (unknown content)
//   0.2  email / portal screenshots (weakest evidence, often discarded)
export function rankSupportingDoc(kind: string): number {
  const k = kind.toLowerCase();
  if (k === "note" || k === "finalized_note" || k === "clinical_note") return 1.0;
  if (k.includes("psych") || k.includes("behavioral_eval")) return 0.95;
  if (k.includes("assessment") || k.includes("phq") || k.includes("gad") || k.includes("cudit"))
    return 0.9;
  if (k === "prior_auth" || k === "pa_packet" || k.includes("authorization")) return 0.85;
  if (k === "lab" || k === "labs" || k.includes("labresult")) return 0.8;
  if (k === "image" || k === "imaging" || k === "radiology") return 0.7;
  if (k === "email" || k === "portal_screenshot" || k.includes("email")) return 0.2;
  return 0.6;
}

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

    // ── Build supporting documentation references (evidence-ranked) ──
    // Order matters: the payer's reviewer reads top-down, so the
    // strongest document needs to be first.
    const supportingDocs: Array<{ id: string; kind: string; weight: number }> = [];
    if (claim.encounter) {
      for (const note of claim.encounter.notes) {
        supportingDocs.push({ id: note.id, kind: "finalized_note", weight: rankSupportingDoc("finalized_note") });
      }
      const docs = await prisma.document.findMany({
        where: { encounterId: claim.encounterId!, deletedAt: null },
        select: { id: true, kind: true, tags: true },
      });
      for (const d of docs) {
        // Tag-aware ranking — e.g. a "document" with tag "psych_eval" should
        // rank as a psych eval, not as a generic doc.
        const kindKey =
          (d.tags ?? []).find((t) =>
            ["psych_eval", "phq-9", "gad-7", "cudit-r", "assessment", "prior_auth"].includes(t),
          ) ?? d.kind;
        supportingDocs.push({ id: d.id, kind: kindKey, weight: rankSupportingDoc(kindKey) });
      }
    }
    supportingDocs.sort((a, b) => b.weight - a.weight);
    const supportingDocIds = supportingDocs.map((d) => d.id);

    trace.step("gathered + ranked supporting documents", {
      count: supportingDocIds.length,
      topKinds: supportingDocs.slice(0, 3).map((d) => d.kind),
    });

    // ── Generate appeal letter via LLM ──────────────────────────
    const claimIcd10: string[] = Array.isArray(claim.icd10Codes)
      ? (claim.icd10Codes as any[])
          .map((c) => (typeof c === "string" ? c : c?.code))
          .filter((c): c is string => typeof c === "string")
      : [];
    const strategy = resolveAppealStrategy(denial.carcCode, claimIcd10);
    const isCannabisAppeal = claimIcd10.some(
      (c) => c.startsWith("F12") || c.startsWith("Z71"),
    );
    if (isCannabisAppeal) {
      trace.step("using cannabis-aware appeal strategy", { carcCode: denial.carcCode });
    }
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

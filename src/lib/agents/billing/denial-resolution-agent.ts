import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Denial Resolution Agent v2
// ---------------------------------------------------------------------------
// Upgrade of the v1 denialTriage agent. Now uses structured CARC/RARC codes
// from the DenialEvent model instead of keyword-matching the old denialReason
// text field. Implements the Layer 6 decision tree from the RCM spec:
//
//   1. Is this auto-correctable? (CARC 4, 16, 197 with fix data available)
//   2. Is this appealable? (CARC 50, 96 with supporting docs)
//   3. Is this a contractual adjustment? (CARC 45, group CO)
//   4. Is this patient responsibility? (group PR)
//   5. Unknown/complex → escalate to human
//
// For auto-correctable denials, creates a corrected claim (frequency code 7)
// and resubmits. For appealable denials, emits denial.classified with
// resolution=appeal so the Appeals Generation Agent picks up.
//
// Writes denial patterns to BillingMemory so the fleet learns which
// CARC/payer combinations keep recurring.
//
// Layer 3 state transition: denied → (draft [corrected] | appealed | closed)
// Layer 4 events: subscribes denial.detected
//   emits: denial.classified, claim.created (for resubmissions),
//          patient.balance.created (for PR), human.review.required
// ---------------------------------------------------------------------------

const input = z.object({
  claimId: z.string(),
  denialEventId: z.string(),
  carcCode: z.string(),
  groupCode: z.string(),
  amountDeniedCents: z.number(),
  organizationId: z.string(),
});

const output = z.object({
  claimId: z.string(),
  denialEventId: z.string(),
  resolution: z.string(),
  autoResolved: z.boolean(),
  resubmissionClaimId: z.string().nullable(),
  escalated: z.boolean(),
});

// ---------------------------------------------------------------------------
// CARC → action map (Layer 6 decision framework)
// ---------------------------------------------------------------------------

interface CarcAction {
  resolution: "correct_and_resubmit" | "appeal" | "contractual_adjustment" | "patient_responsibility" | "write_off" | "escalate";
  autoEligible: boolean;
  description: string;
  correctionFn?: string; // which correction to attempt
}

const CARC_ACTIONS: Record<string, CarcAction> = {
  "4": {
    resolution: "correct_and_resubmit",
    autoEligible: true,
    description: "Modifier issue — fix modifier and resubmit",
    correctionFn: "fix_modifier",
  },
  "16": {
    resolution: "correct_and_resubmit",
    autoEligible: true,
    description: "Missing/incomplete information — attach and resubmit",
    correctionFn: "attach_info",
  },
  "18": {
    resolution: "escalate",
    autoEligible: false,
    description: "Duplicate claim — verify not a true duplicate; human review",
  },
  "29": {
    resolution: "appeal",
    autoEligible: false, // conditional — need to verify dates
    description: "Timely filing — check dates; appeal if within window",
  },
  "45": {
    resolution: "contractual_adjustment",
    autoEligible: true,
    description: "Exceeds fee schedule — contractual adjustment, auto-process",
  },
  "50": {
    resolution: "appeal",
    autoEligible: true,
    description: "Not medically necessary — appeal with documentation",
  },
  "96": {
    resolution: "patient_responsibility",
    autoEligible: true,
    description: "Non-covered service — transfer to patient",
  },
  "97": {
    resolution: "correct_and_resubmit",
    autoEligible: false, // need to verify bundling
    description: "Payment included in another — check bundling; resubmit if error",
    correctionFn: "fix_bundling",
  },
  "197": {
    resolution: "correct_and_resubmit",
    autoEligible: true,
    description: "Precertification — attach auth number and resubmit",
    correctionFn: "attach_auth",
  },
};

export const denialResolutionAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "denialResolution",
  version: "2.0.0",
  description:
    "Classifies denials using CARC/RARC codes and determines the resolution " +
    "path: auto-correct + resubmit, appeal, contractual adjustment, patient " +
    "responsibility, or human escalation. Writes denial patterns to memory.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.claim",
    "read.patient",
    "write.claim.status",
    "write.denial.triage",
    "write.task",
  ],
  requiresApproval: false,

  async run({ claimId, denialEventId, carcCode, groupCode, amountDeniedCents, organizationId }, ctx) {
    const trace = startReasoning("denialResolution", "2.0.0", ctx.jobId);
    trace.step("begin denial resolution", { claimId, denialEventId, carcCode, groupCode, amountDeniedCents });

    ctx.assertCan("read.claim");

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { patient: true, charges: true },
    });
    if (!claim) throw new Error(`Claim ${claimId} not found`);

    const denial = await prisma.denialEvent.findUnique({
      where: { id: denialEventId },
    });
    if (!denial) throw new Error(`DenialEvent ${denialEventId} not found`);

    trace.step("loaded claim + denial", {
      claimStatus: claim.status,
      payerName: claim.payerName,
      resubmissionCount: claim.resubmissionCount,
    });

    // ── Step 1: Classify using CARC → action map ────────────────
    const carcAction = CARC_ACTIONS[carcCode];
    let resolution: string;
    let autoResolved = false;
    let resubmissionClaimId: string | null = null;
    let escalated = false;

    // Override: group PR is always patient responsibility regardless of CARC
    if (groupCode === "PR") {
      resolution = "patient_responsibility";
      trace.step("group PR → patient responsibility", { carcCode });

      await prisma.denialEvent.update({
        where: { id: denialEventId },
        data: { resolution: "patient_responsibility", denialCategory: "non_covered_service", resolvedAt: new Date() },
      });

      await ctx.emit({
        name: "patient.balance.created",
        patientId: claim.patientId,
        claimId,
        amountCents: amountDeniedCents,
        source: "denied_service",
        organizationId,
      });

      autoResolved = true;
    } else if (!carcAction) {
      // Unknown CARC code → escalate
      resolution = "escalate";
      escalated = true;
      trace.step("unknown CARC code → escalate", { carcCode });

      await prisma.denialEvent.update({
        where: { id: denialEventId },
        data: { resolution: "escalated", denialCategory: "other" },
      });

      await ctx.emit({
        name: "human.review.required",
        sourceAgent: "denialResolution",
        category: "novel_situation",
        claimId,
        patientId: claim.patientId,
        summary: `Unknown denial CARC ${carcCode} (${groupCode}) for $${(amountDeniedCents / 100).toFixed(2)}. No automated resolution available.`,
        suggestedAction: "Review the full payer message and determine the appropriate action.",
        tier: 2,
        organizationId,
      });
    } else {
      resolution = carcAction.resolution;
      trace.step("classified denial", {
        resolution: carcAction.resolution,
        autoEligible: carcAction.autoEligible,
        description: carcAction.description,
      });

      // Map resolution to denial category for the DenialEvent
      const categoryMap: Record<string, string> = {
        correct_and_resubmit: carcCode === "4" ? "modifier" : carcCode === "197" ? "precertification" : "missing_info",
        appeal: carcCode === "50" ? "medical_necessity" : "timely_filing",
        contractual_adjustment: "contractual",
        patient_responsibility: "non_covered_service",
        write_off: "other",
        escalate: "other",
      };

      // ── Handle each resolution type ───────────────────────────

      if (resolution === "correct_and_resubmit") {
        // Check resubmission guard (Layer 3: max 2 correction cycles)
        if (claim.resubmissionCount >= 2) {
          resolution = "escalate";
          escalated = true;
          trace.step("resubmission limit reached (2) → escalate", {
            resubmissionCount: claim.resubmissionCount,
          });

          await prisma.denialEvent.update({
            where: { id: denialEventId },
            data: { resolution: "escalated", denialCategory: categoryMap[carcAction.resolution] },
          });

          await ctx.emit({
            name: "human.review.required",
            sourceAgent: "denialResolution",
            category: "high_dollar",
            claimId,
            patientId: claim.patientId,
            summary: `Claim ${claim.claimNumber ?? claimId} has been denied and resubmitted ${claim.resubmissionCount} times (CARC ${carcCode}). Max correction cycles reached. Needs human eyes.`,
            suggestedAction: "Review full denial history and decide: appeal, write-off, or contact payer.",
            tier: 1,
            organizationId,
          });
        } else if (carcAction.autoEligible) {
          // Auto-correct and resubmit
          autoResolved = true;
          trace.step("auto-correcting and resubmitting", {
            correctionFn: carcAction.correctionFn,
          });

          await prisma.denialEvent.update({
            where: { id: denialEventId },
            data: {
              resolution: "corrected_and_resubmitted",
              denialCategory: categoryMap[carcAction.resolution],
              resolvedAt: new Date(),
            },
          });

          // Increment resubmission count on original claim
          await prisma.claim.update({
            where: { id: claimId },
            data: { resubmissionCount: { increment: 1 } },
          });

          // Emit claim.created for the corrected version → goes back through
          // scrub + submit pipeline (Flow 2 in Layer 8)
          await ctx.emit({
            name: "claim.created",
            claimId,
            organizationId,
            patientId: claim.patientId,
          });

          // Update claim status back to draft for reprocessing
          await prisma.claim.update({
            where: { id: claimId },
            data: { status: "draft" },
          });
        } else {
          // Not auto-eligible → escalate for human correction
          escalated = true;
          await prisma.denialEvent.update({
            where: { id: denialEventId },
            data: { resolution: "escalated", denialCategory: categoryMap[carcAction.resolution] },
          });

          await ctx.emit({
            name: "human.review.required",
            sourceAgent: "denialResolution",
            category: "coding_uncertainty",
            claimId,
            patientId: claim.patientId,
            summary: `CARC ${carcCode} denial: ${carcAction.description}. Auto-correction not available — needs human review.`,
            suggestedAction: carcAction.description,
            tier: 1,
            organizationId,
          });
        }
      } else if (resolution === "appeal") {
        // Route to Appeals Generation Agent via denial.classified
        trace.step("routing to appeals", { amountDeniedCents });

        await prisma.denialEvent.update({
          where: { id: denialEventId },
          data: { denialCategory: categoryMap.appeal },
        });

        await ctx.emit({
          name: "denial.classified",
          claimId,
          denialEventId,
          resolution: "appeal",
          organizationId,
        });
      } else if (resolution === "contractual_adjustment") {
        // Auto-process: this is expected behavior, not an error
        autoResolved = true;
        trace.step("contractual adjustment — auto-processing");

        await prisma.denialEvent.update({
          where: { id: denialEventId },
          data: {
            resolution: "written_off",
            denialCategory: "contractual",
            recoverable: false,
            resolvedAt: new Date(),
          },
        });

        await prisma.adjustment.create({
          data: {
            claimId,
            type: "contractual",
            amountCents: amountDeniedCents,
            reason: `Contractual adjustment per payer agreement (CARC ${carcCode})`,
            carcCode,
            postedAt: new Date(),
          },
        });
      } else if (resolution === "write_off") {
        // Small amount write-off
        if (amountDeniedCents <= 2500) { // ≤ $25 auto-write-off per Layer 1
          autoResolved = true;
          trace.step("auto write-off (≤ $25)");

          await prisma.denialEvent.update({
            where: { id: denialEventId },
            data: { resolution: "written_off", resolvedAt: new Date() },
          });

          await prisma.adjustment.create({
            data: {
              claimId,
              type: "write_off",
              amountCents: amountDeniedCents,
              reason: `Auto write-off: CARC ${carcCode}, amount ≤ $25`,
              carcCode,
              postedAt: new Date(),
            },
          });
        } else {
          escalated = true;
          await ctx.emit({
            name: "write_off.requested",
            claimId,
            amountCents: amountDeniedCents,
            reason: `CARC ${carcCode} denial — not recoverable`,
            requestedBy: "denialResolution:2.0.0",
            organizationId,
          });
        }
      } else {
        // Escalate
        escalated = true;
        await ctx.emit({
          name: "human.review.required",
          sourceAgent: "denialResolution",
          category: "novel_situation",
          claimId,
          patientId: claim.patientId,
          summary: `CARC ${carcCode} denial for $${(amountDeniedCents / 100).toFixed(2)}. Resolution: ${resolution}. Needs human review.`,
          suggestedAction: carcAction.description,
          tier: 2,
          organizationId,
        });
      }
    }

    // ── Write denial pattern to BillingMemory ───────────────────
    try {
      const existingMemory = await prisma.billingMemory.findFirst({
        where: {
          organizationId,
          scope: "payer",
          scopeId: claim.payerId ?? claim.payerName ?? "unknown",
          category: "denial_pattern",
          tags: { has: `carc:${carcCode}` },
        },
      });

      if (existingMemory) {
        await prisma.billingMemory.update({
          where: { id: existingMemory.id },
          data: {
            evidenceCount: { increment: 1 },
            lastEvidenceAt: new Date(),
            confidence: Math.min(0.95, existingMemory.confidence + 0.03),
          },
        });
      } else {
        await prisma.billingMemory.create({
          data: {
            organizationId,
            scope: "payer",
            scopeId: claim.payerId ?? claim.payerName ?? "unknown",
            category: "denial_pattern",
            content: `${claim.payerName ?? "Payer"} denied with CARC ${carcCode} (${groupCode}). Resolution: ${resolution}.`,
            confidence: 0.6,
            tags: [`carc:${carcCode}`, `group:${groupCode}`, `resolution:${resolution}`],
          },
        });
      }
      trace.step("wrote billing memory", { scope: "payer", carcCode });
    } catch (err) {
      // Memory write is best-effort
      ctx.log("warn", "Failed to write billing memory", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Audit + conclude ────────────────────────────────────────
    await writeAgentAudit(
      "denialResolution",
      "2.0.0",
      organizationId,
      "denial.resolved",
      { type: "DenialEvent", id: denialEventId },
      {
        carcCode,
        groupCode,
        resolution,
        autoResolved,
        escalated,
        amountCents: amountDeniedCents,
        payerName: claim.payerName,
      },
    );

    trace.conclude({
      confidence: autoResolved ? 0.9 : escalated ? 0.5 : 0.75,
      summary: `CARC ${carcCode} (${groupCode}): ${resolution}. ${autoResolved ? "Auto-resolved." : escalated ? "Escalated to human." : "Routed to next agent."}`,
    });
    await trace.persist();

    return {
      claimId,
      denialEventId,
      resolution,
      autoResolved,
      resubmissionClaimId,
      escalated,
    };
  },
};

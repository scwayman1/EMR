import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Claim Construction Agent
// ---------------------------------------------------------------------------
// Third agent in the clean claim path. Takes coded charges from an encounter
// and assembles them into a valid professional claim (837P structure).
//
// This agent answers: "Given these charges, what does the claim look like?"
//
// It pulls together: patient demographics, provider NPI, coverage/eligibility,
// coded charges (from Coding Optimization), place of service, and prior auth
// if applicable. It does NOT code — that's already done. It does NOT scrub —
// that's the next agent.
//
// Layer 3 state transition: (coded) → draft
// Layer 4 events: subscribes coding.recommended, emits claim.created
// ---------------------------------------------------------------------------

const input = z.object({
  encounterId: z.string(),
  patientId: z.string(),
  organizationId: z.string(),
});

const output = z.object({
  claimId: z.string().nullable(),
  claimNumber: z.string().nullable(),
  lineCount: z.number(),
  totalBilledCents: z.number(),
  blocked: z.boolean(),
  blockReason: z.string().nullable(),
});

export const claimConstructionAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "claimConstruction",
  version: "1.0.0",
  description:
    "Assembles coded charges into a valid professional claim. Pulls together " +
    "patient, provider, coverage, and charge data into a single claim object " +
    "ready for scrubbing.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.patient",
    "read.encounter",
    "read.claim",
    "write.claim.scrub",
  ],
  requiresApproval: false,

  async run({ encounterId, patientId, organizationId }, ctx) {
    const trace = startReasoning("claimConstruction", "1.0.0", ctx.jobId);
    trace.step("begin claim construction", { encounterId });

    ctx.assertCan("read.encounter");

    // ── Check if a claim already exists for this encounter ──────
    const existingClaim = await prisma.claim.findFirst({
      where: { encounterId, status: { notIn: ["voided", "written_off"] } },
    });
    if (existingClaim) {
      ctx.log("info", "Claim already exists for this encounter — skipping");
      trace.conclude({ confidence: 1.0, summary: "Skipped — claim already exists." });
      await trace.persist();
      return {
        claimId: existingClaim.id,
        claimNumber: existingClaim.claimNumber,
        lineCount: 0,
        totalBilledCents: existingClaim.billedAmountCents,
        blocked: false,
        blockReason: null,
      };
    }

    // ── Load encounter + patient + provider + coverage ──────────
    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patient: true,
        provider: { include: { user: true } },
      },
    });
    if (!encounter) throw new Error(`Encounter ${encounterId} not found`);
    trace.step("loaded encounter", { modality: encounter.modality });

    // Load pending charges for this encounter
    const charges = await prisma.charge.findMany({
      where: { encounterId, status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    trace.step("loaded charges", { count: charges.length });

    if (charges.length === 0) {
      ctx.log("warn", "No pending charges for this encounter — cannot construct claim");
      trace.conclude({ confidence: 0, summary: "No charges found." });
      await trace.persist();
      return {
        claimId: null,
        claimNumber: null,
        lineCount: 0,
        totalBilledCents: 0,
        blocked: true,
        blockReason: "No pending charges for this encounter",
      };
    }

    // Load primary coverage
    const coverage = await prisma.patientCoverage.findFirst({
      where: { patientId, active: true, type: "primary" },
    });
    trace.step("loaded coverage", {
      hasCoverage: !!coverage,
      payerName: coverage?.payerName ?? "none",
    });

    // ── Gating checks ───────────────────────────────────────────
    // Per Layer 5: will NOT create a claim if no active coverage
    if (!coverage) {
      ctx.log("warn", "No active primary coverage — blocking claim construction");
      await ctx.emit({
        name: "human.review.required",
        sourceAgent: "claimConstruction",
        category: "high_dollar",
        claimId: undefined,
        patientId,
        summary: `No active insurance coverage found for patient. Cannot construct claim for encounter ${encounterId}.`,
        suggestedAction: "Verify patient insurance and add coverage before billing.",
        tier: 1,
        organizationId,
      });
      trace.conclude({ confidence: 0, summary: "Blocked — no active coverage." });
      await trace.persist();
      return {
        claimId: null,
        claimNumber: null,
        lineCount: 0,
        totalBilledCents: 0,
        blocked: true,
        blockReason: "No active primary coverage",
      };
    }

    // ── Construct the claim ─────────────────────────────────────
    const serviceDate = encounter.completedAt ?? encounter.startedAt ?? encounter.createdAt;
    const totalBilledCents = charges.reduce((sum, c) => sum + c.feeAmountCents * c.units, 0);

    // Generate claim number: ORG-YYYYMMDD-SEQ
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const seq = await prisma.claim.count({ where: { organizationId } });
    const claimNumber = `CLM-${dateStr}-${String(seq + 1).padStart(4, "0")}`;

    // Determine POS
    const placeOfService =
      encounter.placeOfService ??
      (encounter.modality === "video" || encounter.modality === "phone"
        ? "02"
        : "11");

    // Build CPT and ICD-10 JSON arrays from charges
    const cptCodes = charges.map((c, i) => ({
      code: c.cptCode,
      label: c.cptDescription ?? c.cptCode,
      units: c.units,
      chargeAmount: c.feeAmountCents,
      modifiers: c.modifiers,
      sequence: i + 1,
    }));

    // Collect all unique ICD-10 codes from charges
    const allIcd10 = [...new Set(charges.flatMap((c) => c.icd10Codes))];
    const icd10Codes = allIcd10.map((code, i) => ({
      code,
      label: code, // TODO: lookup description from ICD-10 reference
      sequence: i + 1,
    }));

    trace.step("assembled claim data", {
      totalBilledCents,
      lineCount: charges.length,
      placeOfService,
      icd10Count: allIcd10.length,
    });

    // ── Persist the claim ───────────────────────────────────────
    ctx.assertCan("write.claim.scrub");

    const claim = await prisma.claim.create({
      data: {
        organizationId,
        patientId,
        encounterId,
        providerId: encounter.providerId,
        status: "draft",
        claimNumber,
        cptCodes: cptCodes as any,
        icd10Codes: icd10Codes as any,
        billedAmountCents: totalBilledCents,
        payerName: coverage.payerName,
        payerId: coverage.payerId,
        billingNpi: encounter.provider?.user?.id ? undefined : undefined, // TODO: NPI from provider profile
        renderingNpi: undefined, // TODO: from provider profile
        placeOfService,
        frequencyCode: "1", // original claim
        serviceDate,
      },
    });

    // Link charges to the claim
    await prisma.charge.updateMany({
      where: { id: { in: charges.map((c) => c.id) } },
      data: { claimId: claim.id, status: "claim_attached" },
    });

    // Emit claim.created → Claims Scrubbing Agent picks up
    await ctx.emit({
      name: "claim.created",
      claimId: claim.id,
      organizationId,
      patientId,
    });

    await writeAgentAudit(
      "claimConstruction",
      "1.0.0",
      organizationId,
      "claim.constructed",
      { type: "Claim", id: claim.id },
      {
        claimNumber,
        lineCount: charges.length,
        totalBilledCents,
        payerName: coverage.payerName,
      },
    );

    trace.conclude({
      confidence: 0.9,
      summary: `Constructed claim ${claimNumber} with ${charges.length} line(s) totaling $${(totalBilledCents / 100).toFixed(2)} for ${coverage.payerName}.`,
    });
    await trace.persist();

    ctx.log("info", "Claim constructed", {
      claimId: claim.id,
      claimNumber,
      lineCount: charges.length,
      totalBilledCents,
    });

    return {
      claimId: claim.id,
      claimNumber,
      lineCount: charges.length,
      totalBilledCents,
      blocked: false,
      blockReason: null,
    };
  },
};

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Prior Authorization Verification Agent
// ---------------------------------------------------------------------------
// Tracks prior authorization status for services that require it. Attaches
// auth numbers to claims. This agent does NOT initiate PA requests — that's
// a clinical workflow. It checks whether an auth already exists and, if not,
// escalates to the team.
//
// Phase 6 will add external payer API integration for real-time PA status
// checks. For now this is a status tracker that queries internal records.
//
// Layer 4 events: subscribes prior_auth.required
//   emits: prior_auth.obtained, human.review.required
// ---------------------------------------------------------------------------

const input = z.object({
  patientId: z.string(),
  coverageId: z.string(),
  cptCode: z.string(),
  organizationId: z.string(),
});

const output = z.object({
  patientId: z.string(),
  authNumber: z.string().nullable(),
  obtained: z.boolean(),
  escalated: z.boolean(),
});

export const priorAuthAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "priorAuthVerification",
  version: "1.0.0",
  description:
    "Tracks prior authorization status for services that require it. " +
    "Attaches auth numbers to claims. Escalates to human review when " +
    "a required PA is missing.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.patient",
    "read.claim",
    "write.claim.status",
  ],
  requiresApproval: false,

  async run({ patientId, coverageId, cptCode, organizationId }, ctx) {
    const trace = startReasoning("priorAuthVerification", "1.0.0", ctx.jobId);
    trace.step("begin prior auth check", { patientId, coverageId, cptCode });

    ctx.assertCan("read.claim");

    // ── Idempotency: check if we already obtained a PA for this combo ──
    // Look for existing claims for this patient that already have a
    // priorAuthNumber set for the same or similar CPT code.
    const claimsWithAuth = await prisma.claim.findMany({
      where: {
        patientId,
        organizationId,
        priorAuthNumber: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Filter in application code: find a claim whose cptCodes JSON array
    // contains an entry with the target CPT code.
    const existingClaim = claimsWithAuth.find((c) => {
      const codes = c.cptCodes as Array<{ code?: string }> | null;
      return Array.isArray(codes) && codes.some((entry) => entry.code === cptCode);
    });

    if (existingClaim?.priorAuthNumber) {
      const authNumber = existingClaim.priorAuthNumber;

      trace.step("found existing auth number", {
        authNumber,
        sourceClaimId: existingClaim.id,
      });

      ctx.log("info", "Prior auth number found on existing claim", {
        authNumber,
        sourceClaimId: existingClaim.id,
        cptCode,
      });

      await ctx.emit({
        name: "prior_auth.obtained",
        patientId,
        authNumber,
        organizationId,
      });

      await writeAgentAudit(
        "priorAuthVerification",
        "1.0.0",
        organizationId,
        "prior_auth.found",
        { type: "Claim", id: existingClaim.id },
        { authNumber, cptCode, coverageId, source: "existing_claim" },
      );

      trace.conclude({
        confidence: 0.9,
        summary: `Found existing prior auth ${authNumber} from claim ${existingClaim.id} for CPT ${cptCode}.`,
      });
      await trace.persist();

      return {
        patientId,
        authNumber,
        obtained: true,
        escalated: false,
      };
    }

    // ── Broader search: any auth for this patient regardless of CPT ─────
    // Some payer auths cover a range of services or a treatment episode.
    // Check if there's a recent claim with any auth that might apply.
    const broadClaim = await prisma.claim.findFirst({
      where: {
        patientId,
        organizationId,
        priorAuthNumber: { not: null },
        serviceDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // within 90 days
      },
      orderBy: { createdAt: "desc" },
    });

    if (broadClaim?.priorAuthNumber) {
      trace.step("found broad auth — different CPT, may not apply", {
        authNumber: broadClaim.priorAuthNumber,
        sourceClaimId: broadClaim.id,
      });
      trace.alternative(
        "use broad auth",
        "Auth found on a different CPT; may not cover this service. Escalating for human verification.",
      );
    }

    // ── No matching auth found — escalate to human review ───────────────
    trace.step("no prior auth found — escalating", { cptCode, coverageId });

    ctx.log("warn", "Prior auth required but not found — escalating to team", {
      patientId,
      cptCode,
      coverageId,
    });

    await ctx.emit({
      name: "human.review.required",
      sourceAgent: "priorAuthVerification",
      category: "prior_auth_missing",
      patientId,
      summary: `Prior authorization required for CPT ${cptCode} but no auth number on file. ` +
        (broadClaim?.priorAuthNumber
          ? `A related auth (${broadClaim.priorAuthNumber}) exists on claim ${broadClaim.id} but may not cover this service.`
          : "No related authorizations found for this patient."),
      suggestedAction:
        "Obtain prior authorization from the payer and attach the auth number to the pending claim.",
      tier: 1,
      organizationId,
    });

    await writeAgentAudit(
      "priorAuthVerification",
      "1.0.0",
      organizationId,
      "prior_auth.escalated",
      null,
      {
        patientId,
        cptCode,
        coverageId,
        reason: "No auth number found",
        broadAuthAvailable: !!broadClaim?.priorAuthNumber,
      },
    );

    trace.conclude({
      confidence: 0.85,
      summary: `No prior auth found for CPT ${cptCode}. Escalated to human review. ${
        broadClaim?.priorAuthNumber
          ? `Noted related auth ${broadClaim.priorAuthNumber} on a different service.`
          : "No related auths on file."
      }`,
    });
    await trace.persist();

    return {
      patientId,
      authNumber: null,
      obtained: false,
      escalated: true,
    };
  },
};

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Compliance & Audit Agent
// ---------------------------------------------------------------------------
// The fleet's adult supervision. Monitors billing patterns across the
// organization for compliance risks: upcoding, unbundling, modifier abuse,
// frequency anomalies, and documentation gaps.
//
// This agent does NOT block claims autonomously. It FLAGS and ROUTES to
// human review. Only the Claims Scrubbing Agent can block a claim. The
// Compliance Agent is a second set of eyes that operates across the full
// claims population, not on individual claims.
//
// Per Layer 1: "The system must optimize reimbursement without encouraging
// fraud, abuse, upcoding, or unsupported coding."
// Per Constitution Art. VI §4: "No shortcuts that compromise the Constitution."
//
// Layer 4 events: subscribes claim.created, claim.financial.closed
//   emits: compliance.flag.raised
// ---------------------------------------------------------------------------

const input = z.object({
  claimId: z.string(),
  organizationId: z.string(),
});

const output = z.object({
  claimId: z.string(),
  flagsRaised: z.number(),
  flags: z.array(z.object({
    flagType: z.string(),
    severity: z.string(),
    detail: z.string(),
  })),
});

// ---------------------------------------------------------------------------
// Compliance rules — each returns a flag or null
// ---------------------------------------------------------------------------

interface ComplianceFlag {
  flagType: string;
  severity: "warning" | "block";
  detail: string;
}

async function checkEmLevelDistribution(
  organizationId: string,
  providerId: string | null,
  currentCptCode: string,
): Promise<ComplianceFlag | null> {
  if (!providerId) return null;
  if (!currentCptCode.startsWith("992")) return null; // only E/M

  // Check: if >60% of this provider's visits are 99215, flag
  const recentClaims = await prisma.claim.findMany({
    where: {
      organizationId,
      providerId,
      serviceDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      status: { notIn: ["voided", "written_off", "draft"] },
    },
    select: { cptCodes: true },
    take: 100,
  });

  if (recentClaims.length < 10) return null; // not enough data

  const emCounts: Record<string, number> = {};
  let totalEM = 0;
  for (const claim of recentClaims) {
    const codes = Array.isArray(claim.cptCodes) ? claim.cptCodes : [];
    for (const c of codes as any[]) {
      const code = c.code ?? c;
      if (typeof code === "string" && code.startsWith("992")) {
        emCounts[code] = (emCounts[code] ?? 0) + 1;
        totalEM++;
      }
    }
  }

  if (totalEM === 0) return null;

  // Flag if 99215 is >60% of E/M visits
  const pct99215 = ((emCounts["99215"] ?? 0) / totalEM) * 100;
  if (pct99215 > 60) {
    return {
      flagType: "upcoding_risk",
      severity: "warning",
      detail: `Provider has ${Math.round(pct99215)}% of E/M visits coded as 99215 over the last 90 days (${emCounts["99215"]}/${totalEM}). Specialty benchmark is typically 15-25%. Review documentation to ensure E/M levels are supported.`,
    };
  }

  // Flag if 99214+99215 combined is >85%
  const highLevel = (emCounts["99214"] ?? 0) + (emCounts["99215"] ?? 0);
  const pctHigh = (highLevel / totalEM) * 100;
  if (pctHigh > 85) {
    return {
      flagType: "upcoding_risk",
      severity: "warning",
      detail: `Provider codes ${Math.round(pctHigh)}% of E/M visits as 99214 or 99215. This distribution is atypical for ambulatory care and may trigger payer audits.`,
    };
  }

  return null;
}

async function checkModifier25Frequency(
  organizationId: string,
  providerId: string | null,
  currentClaim: any,
): Promise<ComplianceFlag | null> {
  if (!providerId) return null;

  // Check if current claim uses modifier 25
  const codes = Array.isArray(currentClaim.cptCodes) ? currentClaim.cptCodes : [];
  const hasMod25 = codes.some(
    (c: any) => Array.isArray(c.modifiers) && c.modifiers.includes("25"),
  );
  if (!hasMod25) return null;

  // Count how often this provider uses mod 25
  const recentClaims = await prisma.claim.findMany({
    where: {
      organizationId,
      providerId,
      serviceDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      status: { notIn: ["voided", "written_off", "draft"] },
    },
    select: { cptCodes: true },
    take: 100,
  });

  if (recentClaims.length < 10) return null;

  let emVisits = 0;
  let mod25Count = 0;
  for (const claim of recentClaims) {
    const claimCodes = Array.isArray(claim.cptCodes) ? claim.cptCodes : [];
    for (const c of claimCodes as any[]) {
      const code = c.code ?? c;
      if (typeof code === "string" && code.startsWith("992")) {
        emVisits++;
        if (Array.isArray(c.modifiers) && c.modifiers.includes("25")) {
          mod25Count++;
        }
      }
    }
  }

  if (emVisits === 0) return null;

  const mod25Pct = (mod25Count / emVisits) * 100;
  if (mod25Pct > 40) {
    return {
      flagType: "modifier_abuse",
      severity: "warning",
      detail: `Modifier 25 used on ${Math.round(mod25Pct)}% of E/M visits over the last 90 days (${mod25Count}/${emVisits}). National average is ~15-20%. Payers may audit this pattern.`,
    };
  }

  return null;
}

function checkDuplicateService(
  currentClaim: any,
  recentClaims: any[],
): ComplianceFlag | null {
  // Check for same CPT on same date of service (excluding current claim)
  const currentDOS = currentClaim.serviceDate?.toISOString().slice(0, 10);
  const currentCodes = Array.isArray(currentClaim.cptCodes)
    ? (currentClaim.cptCodes as any[]).map((c: any) => c.code ?? c)
    : [];

  for (const prior of recentClaims) {
    if (prior.id === currentClaim.id) continue;
    const priorDOS = prior.serviceDate?.toISOString().slice(0, 10);
    if (priorDOS !== currentDOS) continue;

    const priorCodes = Array.isArray(prior.cptCodes)
      ? (prior.cptCodes as any[]).map((c: any) => c.code ?? c)
      : [];

    const overlap = currentCodes.filter((c: string) => priorCodes.includes(c));
    if (overlap.length > 0) {
      return {
        flagType: "frequency_anomaly",
        severity: "warning",
        detail: `Same CPT code(s) ${overlap.join(", ")} billed on the same date of service (${currentDOS}) across multiple claims. Verify not a duplicate.`,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export const complianceAuditAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "complianceAudit",
  version: "1.0.0",
  description:
    "Monitors billing patterns for compliance risks: upcoding, modifier " +
    "abuse, frequency anomalies. Flags and routes to human review — never " +
    "blocks claims autonomously.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "read.patient"],
  requiresApproval: false,

  async run({ claimId, organizationId }, ctx) {
    const trace = startReasoning("complianceAudit", "1.0.0", ctx.jobId);
    trace.step("begin compliance audit", { claimId });

    ctx.assertCan("read.claim");

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { patient: true },
    });
    if (!claim) throw new Error(`Claim ${claimId} not found`);

    trace.step("loaded claim", {
      providerId: claim.providerId,
      payerName: claim.payerName,
      billedCents: claim.billedAmountCents,
    });

    // Load recent claims from same provider for pattern analysis
    const recentClaims = await prisma.claim.findMany({
      where: {
        organizationId,
        providerId: claim.providerId,
        serviceDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        id: { not: claimId },
      },
      select: { id: true, cptCodes: true, serviceDate: true },
      take: 20,
    });

    // ── Run compliance checks ───────────────────────────────────
    const flags: ComplianceFlag[] = [];

    // Extract primary CPT for checks
    const codes = Array.isArray(claim.cptCodes) ? claim.cptCodes : [];
    const primaryCpt = (codes[0] as any)?.code ?? "";

    // Check 1: E/M level distribution
    const emFlag = await checkEmLevelDistribution(
      organizationId,
      claim.providerId,
      primaryCpt,
    );
    if (emFlag) flags.push(emFlag);

    // Check 2: Modifier 25 frequency
    const mod25Flag = await checkModifier25Frequency(
      organizationId,
      claim.providerId,
      claim,
    );
    if (mod25Flag) flags.push(mod25Flag);

    // Check 3: Same-day duplicate services
    const dupFlag = checkDuplicateService(claim, recentClaims);
    if (dupFlag) flags.push(dupFlag);

    // Check 4: High-dollar claim threshold
    if (claim.billedAmountCents > 100000) { // >$1000
      flags.push({
        flagType: "frequency_anomaly",
        severity: "warning",
        detail: `High-dollar claim: $${(claim.billedAmountCents / 100).toFixed(2)}. Ambulatory cannabis visits rarely exceed $500. Verify charges are correct.`,
      });
    }

    trace.step("compliance checks complete", {
      flagCount: flags.length,
      flagTypes: flags.map((f) => f.flagType),
    });

    // ── Emit flags ──────────────────────────────────────────────
    for (const flag of flags) {
      await ctx.emit({
        name: "compliance.flag.raised",
        claimId,
        flagType: flag.flagType,
        severity: flag.severity,
        detail: flag.detail,
        organizationId,
      });
    }

    // If any flags, route to human review
    if (flags.length > 0) {
      const hasBlock = flags.some((f) => f.severity === "block");
      await ctx.emit({
        name: "human.review.required",
        sourceAgent: "complianceAudit",
        category: "compliance_risk",
        claimId,
        patientId: claim.patientId,
        summary: `${flags.length} compliance flag(s) raised: ${flags.map((f) => f.flagType).join(", ")}`,
        suggestedAction: hasBlock
          ? "Review and resolve blocking compliance issues before claim can proceed."
          : "Review flagged patterns. No immediate action required but pattern should be monitored.",
        tier: 2, // compliance officer
        organizationId,
      });
      trace.step("escalated to compliance officer", { flagCount: flags.length });
    }

    await writeAgentAudit(
      "complianceAudit",
      "1.0.0",
      organizationId,
      "compliance.audit.complete",
      { type: "Claim", id: claimId },
      { flagCount: flags.length, flagTypes: flags.map((f) => f.flagType) },
    );

    trace.conclude({
      confidence: 0.9,
      summary: flags.length === 0
        ? "No compliance flags. Claim patterns are within normal ranges."
        : `Raised ${flags.length} flag(s): ${flags.map((f) => f.flagType).join(", ")}. Routed to compliance officer (Tier 2).`,
    });
    await trace.persist();

    return {
      claimId,
      flagsRaised: flags.length,
      flags,
    };
  },
};

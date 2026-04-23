import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Eligibility & Benefits Agent
// ---------------------------------------------------------------------------
// Verifies patient insurance eligibility and benefit details BEFORE claim
// construction. Catches eligibility-based denials at the source — the
// cheapest denial to prevent is the one that never happens.
//
// Creates EligibilitySnapshot objects and caches them to avoid redundant
// checks. When a patient's coverage looks problematic (termed, out-of-
// network, PA required), this agent flags it BEFORE the claim enters the
// pipeline instead of waiting for a payer denial 3 weeks later.
//
// Layer 3: feeds into the Claim Construction gating check
// Layer 4 events: subscribes encounter.completed
//   emits: eligibility.checked, eligibility.failed, prior_auth.required
// ---------------------------------------------------------------------------

const input = z.object({
  encounterId: z.string(),
  patientId: z.string(),
});

const output = z.object({
  patientId: z.string(),
  snapshotId: z.string().nullable(),
  eligible: z.boolean(),
  networkStatus: z.string(),
  priorAuthRequired: z.boolean(),
  usedCache: z.boolean(),
  blocked: z.boolean(),
  blockReason: z.string().nullable(),
  /** Pre-screen warnings when the encounter's charges contain cannabis-risk
   * ICD-10 or CPT codes. Commercial payers frequently deny these even with
   * an active eligibility snapshot, so the billing team needs a heads-up. */
  cannabisCoverageWarnings: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Per-payer cache TTLs
// ---------------------------------------------------------------------------
// Commercial coverage data is more volatile than government programs (ERA
// posting cadence, plan year resets, rider changes). We bias toward a fresh
// check for commercial (4h) and trust the EDI response longer for govt
// (12h). Anything else (self-pay, rare payers, unknowns) gets a 6h middle
// ground.
const COMMERCIAL_PAYERS = [
  "aetna",
  "united",
  "uhc",
  "cigna",
  "bcbs",
  "blue cross",
  "blue shield",
  "humana",
  "anthem",
  "kaiser",
];
const GOVT_PAYERS = ["medicare", "medicaid", "tricare", "champva", "va "];

export function ttlForPayer(payerName: string | null | undefined): number {
  if (!payerName) return 6 * 3600 * 1000;
  const name = payerName.toLowerCase();
  if (GOVT_PAYERS.some((k) => name.includes(k))) return 12 * 3600 * 1000;
  if (COMMERCIAL_PAYERS.some((k) => name.includes(k))) return 4 * 3600 * 1000;
  return 6 * 3600 * 1000;
}

// ---------------------------------------------------------------------------
// Cannabis-risk code pre-screen
// ---------------------------------------------------------------------------
// ICD-10 prefixes and CPT codes that frequently trigger cannabis-related
// coverage issues — benefit exclusions, PA requirements, or outright
// denials even when the patient is eligible on the date of service.
const CANNABIS_RISK_ICD10_PREFIXES = ["F12.", "Z71.41", "Z71.51", "Z71.89", "Z03.89"];
const CANNABIS_RISK_CPT_CODES = new Set(["99406", "99407", "96160", "96161"]);

export function screenCannabisCoverageRisks(
  charges: Array<{ cptCode: string; icd10Codes: string[] }>,
): string[] {
  const warnings: string[] = [];
  const icd10Hits = new Set<string>();
  const cptHits = new Set<string>();
  for (const c of charges) {
    for (const icd of c.icd10Codes) {
      if (CANNABIS_RISK_ICD10_PREFIXES.some((p) => icd.startsWith(p))) {
        icd10Hits.add(icd);
      }
    }
    if (CANNABIS_RISK_CPT_CODES.has(c.cptCode)) {
      cptHits.add(c.cptCode);
    }
  }
  if (icd10Hits.size > 0) {
    warnings.push(
      `Cannabis-risk diagnoses on this encounter (${Array.from(icd10Hits).join(", ")}). Commercial plans frequently deny these as non-covered or require PA — verify benefit language before submission.`,
    );
  }
  if (cptHits.size > 0) {
    warnings.push(
      `Counseling/screening CPTs on this encounter (${Array.from(cptHits).join(", ")}) that are NOT reliably covered for cannabis indications. 99406/99407 are tobacco-specific; consider Z71.89 + E/M time for cannabis counseling.`,
    );
  }
  return warnings;
}

export const eligibilityBenefitsAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "eligibilityBenefits",
  version: "1.0.0",
  description:
    "Verifies patient insurance eligibility and benefits before claim submission. " +
    "Creates cached EligibilitySnapshot objects. Catches coverage problems " +
    "before they become denials.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.patient",
    "read.encounter",
    "write.claim.scrub", // reusing for eligibility writes
  ],
  requiresApproval: false,

  async run({ encounterId, patientId }, ctx) {
    const trace = startReasoning("eligibilityBenefits", "1.0.0", ctx.jobId);
    trace.step("begin eligibility check", { encounterId, patientId });

    ctx.assertCan("read.patient");

    // ── Load patient coverage ───────────────────────────────────
    const coverage = await prisma.patientCoverage.findFirst({
      where: { patientId, active: true, type: "primary" },
    });

    // Load encounter charges early so we can pre-screen for cannabis-risk
    // codes regardless of which path this run takes (no coverage / cache
    // hit / fresh check).
    const encounterCharges = await prisma.charge.findMany({
      where: { encounterId },
      select: { cptCode: true, icd10Codes: true },
    });
    const cannabisCoverageWarnings = screenCannabisCoverageRisks(encounterCharges);
    if (cannabisCoverageWarnings.length > 0) {
      trace.step("cannabis coverage risk pre-screen", {
        warningCount: cannabisCoverageWarnings.length,
      });
    }

    if (!coverage) {
      ctx.log("warn", "No active primary coverage found");
      trace.conclude({ confidence: 0.95, summary: "No active coverage — patient may be self-pay." });
      await trace.persist();

      await ctx.emit({
        name: "eligibility.failed",
        patientId,
        coverageId: "",
        reason: "No active primary coverage found. Patient may be self-pay.",
        organizationId: ctx.organizationId ?? "",
      });

      return {
        patientId,
        snapshotId: null,
        eligible: false,
        networkStatus: "unknown",
        priorAuthRequired: false,
        usedCache: false,
        blocked: true,
        blockReason: "No active primary coverage",
        cannabisCoverageWarnings,
      };
    }

    trace.step("loaded coverage", {
      payerName: coverage.payerName,
      memberId: coverage.memberId,
      eligibilityStatus: coverage.eligibilityStatus,
    });

    // ── Check for valid cached snapshot (per-payer TTL) ─────────
    // Even if the stored expiresAt is still in the future, we re-enforce
    // the per-payer TTL at read time so a stale-but-unexpired commercial
    // snapshot doesn't linger past its 4h window. This is the "enforce at
    // both read and write" contract.
    const ttlMs = ttlForPayer(coverage.payerName);
    const freshestAcceptableCheckedAt = new Date(Date.now() - ttlMs);
    const cachedSnapshot = await prisma.eligibilitySnapshot.findFirst({
      where: {
        patientId,
        coverageId: coverage.id,
        expiresAt: { gt: new Date() },
        checkedAt: { gte: freshestAcceptableCheckedAt },
      },
      orderBy: { checkedAt: "desc" },
    });

    if (cachedSnapshot) {
      ctx.log("info", "Using cached eligibility snapshot", {
        snapshotId: cachedSnapshot.id,
        checkedAt: cachedSnapshot.checkedAt,
      });
      trace.step("using cached snapshot", {
        snapshotId: cachedSnapshot.id,
        eligible: cachedSnapshot.eligible,
        age: `${Math.round((Date.now() - cachedSnapshot.checkedAt.getTime()) / 3600000)}h`,
      });

      // Even with cache, emit the event so downstream agents can proceed
      await ctx.emit({
        name: "eligibility.checked",
        patientId,
        coverageId: coverage.id,
        snapshotId: cachedSnapshot.id,
        eligible: cachedSnapshot.eligible,
        networkStatus: cachedSnapshot.networkStatus,
        priorAuthRequired: cachedSnapshot.priorAuthRequired,
      });

      if (cachedSnapshot.priorAuthRequired) {
        await ctx.emit({
          name: "prior_auth.required",
          patientId,
          coverageId: coverage.id,
          cptCode: "", // will be filled by downstream
          organizationId: ctx.organizationId ?? "",
        });
      }

      trace.conclude({
        confidence: 0.9,
        summary: `Used cached snapshot (${Math.round((Date.now() - cachedSnapshot.checkedAt.getTime()) / 3600000)}h old). Eligible: ${cachedSnapshot.eligible}, network: ${cachedSnapshot.networkStatus}.`,
      });
      await trace.persist();

      return {
        patientId,
        snapshotId: cachedSnapshot.id,
        eligible: cachedSnapshot.eligible,
        networkStatus: cachedSnapshot.networkStatus,
        priorAuthRequired: cachedSnapshot.priorAuthRequired,
        usedCache: true,
        blocked: !cachedSnapshot.eligible,
        blockReason: cachedSnapshot.eligible ? null : "Patient not eligible per cached snapshot",
        cannabisCoverageWarnings,
      };
    }

    // ── No cache — perform real-time eligibility check ──────────
    // In production this would be a 270/271 EDI transaction via the
    // clearinghouse API. For now we do a deterministic check based on
    // the coverage record fields and emit the result.
    trace.step("no valid cache — performing eligibility check");

    const now = new Date();
    const eligible = coverage.eligibilityStatus !== "termed" &&
      coverage.eligibilityStatus !== "inactive" &&
      (!coverage.terminationDate || coverage.terminationDate > now);

    const networkStatus =
      coverage.eligibilityStatus === "active" ? "in_network" : "unknown";

    // Determine if the coverage's deductible/OOP situation implies PA
    // (simplified heuristic — real implementation checks payer rules per CPT)
    const priorAuthRequired = false; // default; would be per-service in production

    // Estimate remaining benefits from coverage record
    const copayAmountCents = coverage.copayCents ?? null;
    const deductibleRemainingCents = coverage.deductibleCents
      ? Math.max(0, coverage.deductibleCents - coverage.deductibleMetCents)
      : null;
    const oopRemainingCents = coverage.outOfPocketMaxCents
      ? Math.max(0, coverage.outOfPocketMaxCents - coverage.outOfPocketMetCents)
      : null;

    // ── Create EligibilitySnapshot ──────────────────────────────
    ctx.assertCan("write.claim.scrub");

    const snapshot = await prisma.eligibilitySnapshot.create({
      data: {
        patientId,
        coverageId: coverage.id,
        eligible,
        planStatus: eligible ? "active" : (coverage.eligibilityStatus ?? "unknown"),
        copayAmountCents: copayAmountCents ?? 0,
        deductibleRemainingCents,
        oopRemainingCents,
        coinsurancePct: coverage.coinsurancePct,
        priorAuthRequired,
        referralRequired: false,
        networkStatus,
        // Enforce the same per-payer TTL on write so downstream readers
        // see an honest expiresAt even if they skip the read-side TTL
        // enforcement above.
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });

    trace.step("created eligibility snapshot", {
      snapshotId: snapshot.id,
      eligible,
      networkStatus,
      copayAmountCents,
      deductibleRemainingCents,
    });

    // Update coverage's last-checked timestamp
    await prisma.patientCoverage.update({
      where: { id: coverage.id },
      data: {
        eligibilityStatus: eligible ? "active" : coverage.eligibilityStatus,
        eligibilityLastCheckedAt: now,
      },
    });

    // ── Emit events ─────────────────────────────────────────────
    await ctx.emit({
      name: "eligibility.checked",
      patientId,
      coverageId: coverage.id,
      snapshotId: snapshot.id,
      eligible,
      networkStatus,
      priorAuthRequired,
    });

    if (!eligible) {
      await ctx.emit({
        name: "eligibility.failed",
        patientId,
        coverageId: coverage.id,
        reason: `Coverage status: ${coverage.eligibilityStatus}. ${coverage.terminationDate ? `Terminated: ${coverage.terminationDate.toISOString().slice(0, 10)}` : ""}`,
        organizationId: ctx.organizationId ?? "",
      });
    }

    if (priorAuthRequired) {
      await ctx.emit({
        name: "prior_auth.required",
        patientId,
        coverageId: coverage.id,
        cptCode: "",
        organizationId: ctx.organizationId ?? "",
      });
    }

    await writeAgentAudit(
      "eligibilityBenefits",
      "1.0.0",
      ctx.organizationId,
      "eligibility.verified",
      { type: "EligibilitySnapshot", id: snapshot.id },
      { eligible, networkStatus, priorAuthRequired, usedCache: false },
    );

    trace.conclude({
      confidence: 0.85,
      summary: `Eligibility verified: ${eligible ? "eligible" : "NOT eligible"}, ${networkStatus}. Copay: ${copayAmountCents ? `$${(copayAmountCents / 100).toFixed(2)}` : "unknown"}. Deductible remaining: ${deductibleRemainingCents != null ? `$${(deductibleRemainingCents / 100).toFixed(2)}` : "unknown"}.`,
    });
    await trace.persist();

    return {
      patientId,
      snapshotId: snapshot.id,
      eligible,
      networkStatus,
      priorAuthRequired,
      usedCache: false,
      blocked: !eligible,
      blockReason: eligible ? null : `Coverage not active: ${coverage.eligibilityStatus}`,
      cannabisCoverageWarnings,
    };
  },
};

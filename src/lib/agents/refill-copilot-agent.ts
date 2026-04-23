import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Refill Copilot Agent — MALLIK-007
// ---------------------------------------------------------------------------
// Evaluates a RefillRequest against a small set of hard-coded safety rules
// and produces a suggestion for the physician. Deterministic at Phase 1 —
// no LLM call. The value is not fancy inference; it's surfacing the few
// things a physician should never miss.
//
// Flags implemented at Phase 1:
//   - MONITORING_LAB_STALE  — drug class needs monitoring and last relevant
//                             lab is more than MONITORING_STALE_DAYS old.
//   - MONITORING_LAB_MISSING — drug class needs monitoring and no relevant
//                              lab is on file.
//   - CONTROLLED_SUBSTANCE  — controlled med requires extra scrutiny.
//
// Flags deferred to later slices (when real data exists to check them):
//   - OPIOID_MME_OVER_THRESHOLD
//   - OPIOID_BENZO_COMBO
//   - RENAL_DOSE_ADJUSTMENT (GFR < 30)
//   - PHARMACY_MISMATCH (requires refill history)
// ---------------------------------------------------------------------------

const input = z.object({ refillRequestId: z.string() });

const output = z.object({
  suggestion: z.enum(["approve", "review", "deny"]),
  safetyFlags: z.array(z.string()),
  rationale: z.string(),
});

const AGENT_NAME = "refillCopilot";
const AGENT_VERSION = "1.0.0";

// Drug class → monitoring lab marker. Keeps the lookup local to this file so
// the mapping is obvious next to the rule that uses it. Real production
// systems pull this from a clinical database; fine for Phase 1 demo.
const MONITORING_BY_DRUG: Record<string, { marker: string; maxAgeDays: number }> = {
  warfarin: { marker: "INR", maxAgeDays: 35 },
  metformin: { marker: "A1C", maxAgeDays: 365 },
  atorvastatin: { marker: "LDL", maxAgeDays: 365 },
  simvastatin: { marker: "LDL", maxAgeDays: 365 },
  lisinopril: { marker: "Cr", maxAgeDays: 365 },
  losartan: { marker: "Cr", maxAgeDays: 365 },
  levothyroxine: { marker: "TSH", maxAgeDays: 180 },
  amiodarone: { marker: "TSH", maxAgeDays: 180 },
};

const CONTROLLED_SUBSTANCES = new Set([
  "oxycodone",
  "hydrocodone",
  "alprazolam",
  "lorazepam",
  "clonazepam",
  "diazepam",
  "zolpidem",
  "adderall",
  "methylphenidate",
]);

const MONITORING_STALE_SEVERITY: Record<string, "review" | "deny"> = {
  warfarin: "deny", // INR out of date = unsafe to refill
  metformin: "review",
  atorvastatin: "review",
  simvastatin: "review",
  lisinopril: "review",
  losartan: "review",
  levothyroxine: "review",
  amiodarone: "review",
};

function normalizeDrugKey(name: string): string {
  return name.toLowerCase().trim().split(/\s+/)[0];
}

export async function evaluateRefill(
  refillRequestId: string
): Promise<z.infer<typeof output>> {
  const refill = await prisma.refillRequest.findUnique({
    where: { id: refillRequestId },
    include: {
      medication: true,
      patient: { select: { id: true, organizationId: true } },
    },
  });
  if (!refill) throw new Error(`RefillRequest not found: ${refillRequestId}`);

  const flags: string[] = [];
  const rationaleParts: string[] = [];
  let worstSeverity: "approve" | "review" | "deny" = "approve";

  const drugKey = normalizeDrugKey(refill.medication.name);

  // Rule 1: controlled substance — always at least a review.
  if (CONTROLLED_SUBSTANCES.has(drugKey)) {
    flags.push("CONTROLLED_SUBSTANCE");
    rationaleParts.push(
      `${refill.medication.name} is a controlled substance — verify PMP before signing.`
    );
    if (worstSeverity === "approve") worstSeverity = "review";
  }

  // Rule 2: monitoring lab staleness / missing.
  const monitoring = MONITORING_BY_DRUG[drugKey];
  if (monitoring) {
    // Fetch recent labs and filter in JS — Prisma's JSON filter path syntax
    // is brittle across providers, and at Phase 1 demo scale the extra rows
    // are negligible.
    const recentLabs = await prisma.labResult.findMany({
      where: { patientId: refill.patientId },
      orderBy: { receivedAt: "desc" },
      take: 30,
    });
    const relevantLab = recentLabs.find((l) => {
      const results = l.results as Record<string, unknown> | null;
      return (
        results && typeof results === "object" && monitoring.marker in results
      );
    });

    if (!relevantLab) {
      flags.push("MONITORING_LAB_MISSING");
      rationaleParts.push(
        `No ${monitoring.marker} on file — ${refill.medication.name} typically requires monitoring.`
      );
      const severity = MONITORING_STALE_SEVERITY[drugKey] ?? "review";
      if (severity === "deny" || worstSeverity === "approve") {
        worstSeverity = severity;
      }
    } else {
      const ageDays = Math.floor(
        (Date.now() - relevantLab.receivedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (ageDays > monitoring.maxAgeDays) {
        flags.push("MONITORING_LAB_STALE");
        rationaleParts.push(
          `${monitoring.marker} last drawn ${ageDays} days ago (recommended within ${monitoring.maxAgeDays}).`
        );
        const severity = MONITORING_STALE_SEVERITY[drugKey] ?? "review";
        if (severity === "deny" || worstSeverity === "approve") {
          worstSeverity = severity;
        }
      }

      // Bind the lab reference on the refill so the overlay can show it
      // inline without another round-trip. Upsert-style.
      if (refill.lastRelevantLabId !== relevantLab.id) {
        await prisma.refillRequest.update({
          where: { id: refill.id },
          data: { lastRelevantLabId: relevantLab.id },
        });
      }
    }
  }

  const suggestion = worstSeverity;
  const rationale =
    rationaleParts.length > 0
      ? rationaleParts.join(" ")
      : "Routine refill — no safety flags detected. Approve when ready.";

  await prisma.refillRequest.update({
    where: { id: refill.id },
    data: {
      copilotSuggestion: suggestion,
      safetyFlags: flags,
      rationale,
      status: flags.length > 0 ? "flagged" : "new",
    },
  });

  await writeAgentAudit(
    AGENT_NAME,
    AGENT_VERSION,
    refill.organizationId,
    "refill.evaluated",
    { type: "RefillRequest", id: refill.id },
    { suggestion, flagCount: flags.length, drugKey }
  );

  return { suggestion, safetyFlags: flags, rationale };
}

export const refillCopilotAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: AGENT_NAME,
  version: AGENT_VERSION,
  description:
    "Evaluates a refill request against safety rules (monitoring lab " +
    "staleness, controlled substance scrutiny) and produces an approve / " +
    "review / deny suggestion. Deterministic at Phase 1.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "read.document"],
  requiresApproval: true,

  async run({ refillRequestId }, ctx) {
    ctx.assertCan("read.patient");
    return evaluateRefill(refillRequestId);
  },
};


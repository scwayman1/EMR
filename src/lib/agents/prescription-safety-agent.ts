import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import {
  checkInteractions,
  type DrugInteraction,
} from "@/lib/domain/drug-interactions";
import {
  CANNABIS_CONTRAINDICATIONS,
  type CannabisContraindication,
} from "@/lib/domain/contraindications";
import { recordObservation } from "@/lib/agents/memory/clinical-observation";
import type { ObservationSeverity } from "@prisma/client";

// ---------------------------------------------------------------------------
// Prescription Safety Agent
// ---------------------------------------------------------------------------
// Fires when a DosingRegimen is created. Runs two checks against the
// existing domain modules:
//
//   1. checkInteractions(patient's active meds, product's cannabinoids)
//      — flags red/yellow cannabinoid × drug interactions.
//   2. keyword match against CANNABIS_CONTRAINDICATIONS.matchKeywords
//      — flags conditions the patient's history mentions that make
//      cannabis clinically inadvisable.
//
// Anything concerning becomes a ClinicalObservation. The Command Center's
// Clinical Discovery tile reads those observations and surfaces them to
// the physician automatically.
//
// This is a cold-temperature background check — no LLM, no approval
// gate, deterministic. It's the first "ambient physician assistant"
// skill: the agent looks over the physician's shoulder and writes a
// note into the chart when it sees something worth a second look.
// ---------------------------------------------------------------------------

const input = z.object({
  regimenId: z.string(),
  patientId: z.string(),
});

const output = z.object({
  interactionsFound: z.number(),
  contraindicationsFound: z.number(),
  observationsWritten: z.number(),
  observationIds: z.array(z.string()),
});

// red interaction → urgent observation, yellow → concern.
const INTERACTION_SEVERITY: Record<
  DrugInteraction["severity"],
  ObservationSeverity | null
> = {
  red: "urgent",
  yellow: "concern",
  green: null, // green interactions are documented-safe, not observation-worthy
};

// absolute contraindication → urgent, relative → concern, caution → notable.
const CONTRAINDICATION_SEVERITY: Record<
  CannabisContraindication["severity"],
  ObservationSeverity
> = {
  absolute: "urgent",
  relative: "concern",
  caution: "notable",
};

export const prescriptionSafetyAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "prescriptionSafety",
  version: "1.0.0",
  description:
    "Cold-check every new dosing regimen for drug-cannabinoid interactions and " +
    "cannabis contraindications. Writes a ClinicalObservation for anything " +
    "worth the physician's attention; stays silent when the prescription is clean.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.outcome.reminder"],
  requiresApproval: false,

  async run({ regimenId, patientId }, ctx) {
    ctx.assertCan("read.patient");

    const regimen = await prisma.dosingRegimen.findUnique({
      where: { id: regimenId },
      include: { product: true },
    });
    if (!regimen) {
      ctx.log("info", "Regimen not found — nothing to check", { regimenId });
      return {
        interactionsFound: 0,
        contraindicationsFound: 0,
        observationsWritten: 0,
        observationIds: [],
      };
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        presentingConcerns: true,
        contraindications: true,
        allergies: true,
      },
    });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    // Vulnerability escalators — pediatric and pregnancy BOTH push every
    // surfaced issue up a severity tier. A yellow interaction that is
    // "notable" in a healthy adult is "urgent" in a 14-year-old or a
    // pregnant patient. We also detect pregnancy/lactation via history
    // free-text since there's no dedicated column yet.
    const patientAge = patient.dateOfBirth
      ? Math.floor(
          (Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 86_400_000),
        )
      : null;
    const isPediatric = patientAge !== null && patientAge < 18;

    const historyBlob = [
      patient.presentingConcerns ?? "",
      ...(patient.contraindications ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const isPregnantOrLactating =
      /\b(pregnan|gestation|trying to conceive|breastfeed|lactat|postpartum)/.test(
        historyBlob,
      );

    const vulnerabilityEscalate = isPediatric || isPregnantOrLactating;

    function escalate(sev: ObservationSeverity): ObservationSeverity {
      if (!vulnerabilityEscalate) return sev;
      if (sev === "notable") return "concern";
      if (sev === "concern") return "urgent";
      return sev;
    }

    // Identify cannabinoids present in the prescribed product.
    const cannabinoids: string[] = [];
    if (regimen.product.thcConcentration && regimen.product.thcConcentration > 0)
      cannabinoids.push("THC");
    if (regimen.product.cbdConcentration && regimen.product.cbdConcentration > 0)
      cannabinoids.push("CBD");
    if (regimen.product.cbnConcentration && regimen.product.cbnConcentration > 0)
      cannabinoids.push("CBN");
    if (regimen.product.cbgConcentration && regimen.product.cbgConcentration > 0)
      cannabinoids.push("CBG");

    const meds = await prisma.patientMedication.findMany({
      where: { patientId, active: true },
      select: { name: true },
    });

    const interactions =
      cannabinoids.length > 0 && meds.length > 0
        ? checkInteractions(
            meds.map((m) => m.name),
            cannabinoids,
          ).filter((i) => INTERACTION_SEVERITY[i.severity] != null)
        : [];

    // Reuse the historyBlob built above for vulnerability detection.
    const historyText = historyBlob;

    // If the clinician already overrode a contraindication at prescribe
    // time, don't re-surface it — they documented the override reason
    // and that's the record of decision. BUT: an override WITHOUT a
    // documented reason is worse than no override; we refuse to honor
    // blank overrides and keep the contraindication flagged.
    const overriddenIds = new Set<string>(
      extractOverriddenContraindicationIds(regimen.contraindicationOverride),
    );
    const { hasReason, reason } = extractOverrideReason(
      regimen.contraindicationOverride,
    );
    if (overriddenIds.size > 0 && !hasReason) {
      ctx.log("warn", "Contraindication override has no reason — keeping flag", {
        regimenId,
        overriddenIdCount: overriddenIds.size,
      });
      overriddenIds.clear(); // refuse blank overrides
    }

    const matchedContraindications = historyText.trim()
      ? CANNABIS_CONTRAINDICATIONS.filter(
          (c) =>
            !overriddenIds.has(c.id) &&
            c.matchKeywords.some((kw) => historyText.includes(kw.toLowerCase())),
        )
      : [];

    ctx.log("info", "Prescription safety scan complete", {
      regimenId,
      interactionsFound: interactions.length,
      contraindicationsFound: matchedContraindications.length,
    });

    if (interactions.length === 0 && matchedContraindications.length === 0) {
      return {
        interactionsFound: 0,
        contraindicationsFound: 0,
        observationsWritten: 0,
        observationIds: [],
      };
    }

    ctx.assertCan("write.outcome.reminder");

    const observationIds: string[] = [];
    const productName = regimen.product.name;

    const vulnerabilityNote = isPediatric
      ? " [PEDIATRIC escalation]"
      : isPregnantOrLactating
        ? " [PREGNANCY/LACTATION escalation]"
        : "";

    for (const i of interactions) {
      const baseSeverity = INTERACTION_SEVERITY[i.severity];
      if (!baseSeverity) continue;
      const severity = escalate(baseSeverity);
      const obs = await recordObservation({
        patientId,
        observedBy: "prescriptionSafety@1.0.0",
        observedByKind: "agent",
        category: "medication_response",
        severity,
        summary: `${productName} (${i.cannabinoid}) × ${i.drug}: ${i.mechanism}${vulnerabilityNote}`,
        actionSuggested: i.recommendation,
        evidence: {},
        metadata: {
          regimenId,
          productId: regimen.productId,
          checkKind: "interaction",
          interactionSeverity: i.severity,
          escalated: vulnerabilityEscalate,
          isPediatric,
          isPregnantOrLactating,
          drug: i.drug,
          cannabinoid: i.cannabinoid,
        },
      });
      observationIds.push(obs.id);
    }

    for (const c of matchedContraindications) {
      const severity = escalate(CONTRAINDICATION_SEVERITY[c.severity]);
      const obs = await recordObservation({
        patientId,
        observedBy: "prescriptionSafety@1.0.0",
        observedByKind: "agent",
        category: "red_flag",
        severity,
        summary: `${c.label} flagged in history vs. ${productName}: ${c.rationale}${vulnerabilityNote}`,
        actionSuggested:
          c.severity === "absolute"
            ? "Review before dispense — this is typically an absolute contraindication."
            : "Review at next touchpoint — consider dose adjustment or alternate therapy.",
        evidence: {},
        metadata: {
          regimenId,
          productId: regimen.productId,
          checkKind: "contraindication",
          contraindicationId: c.id,
          contraindicationSeverity: c.severity,
          escalated: vulnerabilityEscalate,
          isPediatric,
          isPregnantOrLactating,
        },
      });
      observationIds.push(obs.id);
    }

    // Audit trail: if a clinician tried to override without a reason, write
    // a standalone observation so the compliance audit catches it.
    if (extractOverriddenContraindicationIds(regimen.contraindicationOverride).length > 0 && !hasReason) {
      const obs = await recordObservation({
        patientId,
        observedBy: "prescriptionSafety@1.0.0",
        observedByKind: "agent",
        category: "red_flag",
        severity: "concern",
        summary: `Contraindication override on ${productName} had no documented reason. Flag refused.`,
        actionSuggested:
          "Require the prescriber to document override rationale before dispensing.",
        evidence: {},
        metadata: { regimenId, checkKind: "override_missing_reason", reason },
      });
      observationIds.push(obs.id);
    }

    return {
      interactionsFound: interactions.length,
      contraindicationsFound: matchedContraindications.length,
      observationsWritten: observationIds.length,
      observationIds,
    };
  },
};

export function extractOverriddenContraindicationIds(
  override: unknown,
): string[] {
  if (!override || typeof override !== "object") return [];
  const ids = (override as { contraindicationIds?: unknown })
    .contraindicationIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((x): x is string => typeof x === "string");
}

export function extractOverrideReason(
  override: unknown,
): { hasReason: boolean; reason: string | null } {
  if (!override || typeof override !== "object")
    return { hasReason: false, reason: null };
  const reason = (override as { reason?: unknown }).reason;
  if (typeof reason !== "string") return { hasReason: false, reason: null };
  const trimmed = reason.trim();
  // Require at least 20 characters — matches the prescribe-form UI rule.
  return { hasReason: trimmed.length >= 20, reason: trimmed };
}

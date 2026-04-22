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

const SEVERITY_ORDER: ObservationSeverity[] = ["info", "notable", "concern", "urgent"];

/** Escalate an observation severity by one tier (notable→concern, concern→urgent).
 * Returning unchanged when we're already at the top. Exposed for tests. */
export function escalateSeverity(s: ObservationSeverity): ObservationSeverity {
  const idx = SEVERITY_ORDER.indexOf(s);
  if (idx < 0) return s;
  return SEVERITY_ORDER[Math.min(idx + 1, SEVERITY_ORDER.length - 1)];
}

function ageFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const md = now.getMonth() - dob.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/** Extract the human-written override reason from a regimen's override
 * blob. Returns null if the override is missing, malformed, or if the
 * reason string is shorter than 20 characters — anything shorter is
 * treated as "no reason provided" since it can't meaningfully justify
 * prescribing through a contraindication. */
export function extractOverrideReason(override: unknown): string | null {
  if (!override || typeof override !== "object") return null;
  const reason = (override as { reason?: unknown }).reason;
  if (typeof reason !== "string") return null;
  const trimmed = reason.trim();
  if (trimmed.length < 20) return null;
  return trimmed;
}

function isPregnantOrLactating(text: string): boolean {
  return (
    text.includes("pregnan") ||
    text.includes("gravid") ||
    text.includes("embarazada") ||
    text.includes("lactation") ||
    text.includes("breastfeed") ||
    text.includes("nursing")
  );
}

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

    // Vulnerability escalator — pediatric or pregnant/lactating patients
    // bump every observation one severity tier. A "notable" drug-cannabinoid
    // interaction becomes a "concern" when the patient is 9 years old.
    const age = patient.dateOfBirth ? ageFromDob(patient.dateOfBirth) : null;
    const vulnText = [
      patient.presentingConcerns ?? "",
      ...(patient.contraindications ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const isVulnerable = (age !== null && age < 18) || isPregnantOrLactating(vulnText);
    const escalate = (s: ObservationSeverity): ObservationSeverity =>
      isVulnerable ? escalateSeverity(s) : s;
    if (isVulnerable) {
      ctx.log("info", "Vulnerability escalator active", {
        patientId,
        age,
        reason:
          age !== null && age < 18 ? "pediatric" : "pregnant_or_lactating",
      });
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

    const historyText = [
      patient.presentingConcerns ?? "",
      ...(patient.contraindications ?? []),
    ]
      .join(" ")
      .toLowerCase();

    // Contraindication override handling. Two rules:
    //   (a) If the clinician documented an override WITH a meaningful
    //       reason (≥20 chars), we trust it and skip re-surfacing those
    //       contraindications.
    //   (b) If the override blob exists but the reason is missing or too
    //       short to justify prescribing through a contraindication, we
    //       REFUSE to honor it — the contraindications are still surfaced
    //       AND we emit an explicit concern-severity "override without
    //       reason" observation so audit trails capture the gap.
    const allOverriddenIds = new Set<string>(
      extractOverriddenContraindicationIds(regimen.contraindicationOverride),
    );
    const overrideReason = extractOverrideReason(regimen.contraindicationOverride);
    const overrideIsHonored = overrideReason !== null;
    const overriddenIds = overrideIsHonored ? allOverriddenIds : new Set<string>();
    const overrideLacksReason = allOverriddenIds.size > 0 && !overrideIsHonored;

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

    if (
      interactions.length === 0 &&
      matchedContraindications.length === 0 &&
      !overrideLacksReason
    ) {
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
        summary: `${productName} (${i.cannabinoid}) × ${i.drug}: ${i.mechanism}`,
        actionSuggested: i.recommendation,
        evidence: {},
        metadata: {
          regimenId,
          productId: regimen.productId,
          checkKind: "interaction",
          interactionSeverity: i.severity,
          drug: i.drug,
          cannabinoid: i.cannabinoid,
          vulnerabilityEscalated: isVulnerable,
        },
      });
      observationIds.push(obs.id);
    }

    for (const c of matchedContraindications) {
      const obs = await recordObservation({
        patientId,
        observedBy: "prescriptionSafety@1.0.0",
        observedByKind: "agent",
        category: "red_flag",
        severity: escalate(CONTRAINDICATION_SEVERITY[c.severity]),
        summary: `${c.label} flagged in history vs. ${productName}: ${c.rationale}`,
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
          vulnerabilityEscalated: isVulnerable,
        },
      });
      observationIds.push(obs.id);
    }

    if (overrideLacksReason) {
      const obs = await recordObservation({
        patientId,
        observedBy: "prescriptionSafety@1.0.0",
        observedByKind: "agent",
        category: "red_flag",
        severity: escalate("concern"),
        summary: `Contraindication override without a documented reason on ${productName}. Override blob listed ${allOverriddenIds.size} contraindication id(s) but no reason ≥20 chars was provided.`,
        actionSuggested:
          "Obtain a written rationale from the prescriber before the next dispense. The override is not honored until a reason is on file.",
        evidence: {},
        metadata: {
          regimenId,
          productId: regimen.productId,
          checkKind: "override_missing_reason",
          overriddenContraindicationIds: Array.from(allOverriddenIds),
          vulnerabilityEscalated: isVulnerable,
        },
      });
      observationIds.push(obs.id);
    }

    return {
      interactionsFound: interactions.length,
      contraindicationsFound: matchedContraindications.length + (overrideLacksReason ? 1 : 0),
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

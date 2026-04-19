import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import {
  CANNABIS_CONTRAINDICATIONS,
  type CannabisContraindication,
} from "@/lib/domain/contraindications";
import { recordObservation } from "@/lib/agents/memory/clinical-observation";
import type { ObservationSeverity } from "@prisma/client";

// ---------------------------------------------------------------------------
// Diagnosis Safety Agent
// ---------------------------------------------------------------------------
// The mirror image of prescriptionSafetyAgent. Fires when a patient's
// diagnosis / contraindication / presenting-concern record changes (via
// the `patient.diagnosis.updated` event) and re-checks every ACTIVE
// DosingRegimen against CANNABIS_CONTRAINDICATIONS.
//
// Clinical rationale: a patient may have been safely prescribed THC six
// months ago. Today they get diagnosed with bipolar I disorder. Nothing
// in the existing pipeline re-evaluates the regimen against the new
// diagnosis — prescriptionSafety only runs at prescribe-time. This agent
// closes that gap.
//
// For each active regimen × each newly-matched contraindication (where
// "newly" means: not already covered by an existing unresolved
// ClinicalObservation against the same regimen+contraindication) a new
// ClinicalObservation is written. Severity mapping mirrors
// prescriptionSafety: absolute → urgent, relative → concern,
// caution → notable.
//
// Cold-temperature, deterministic, no LLM, no approval gate.
// ---------------------------------------------------------------------------

const input = z.object({
  patientId: z.string(),
});

const output = z.object({
  regimensChecked: z.number(),
  contraindicationsFound: z.number(),
  observationsWritten: z.number(),
  observationIds: z.array(z.string()),
});

// absolute → urgent, relative → concern, caution → notable.
// Same mapping prescriptionSafetyAgent uses.
const CONTRAINDICATION_SEVERITY: Record<
  CannabisContraindication["severity"],
  ObservationSeverity
> = {
  absolute: "urgent",
  relative: "concern",
  caution: "notable",
};

/**
 * Build the searchable patient history text from the patient's
 * presenting concerns + stored contraindication strings. Lower-cased,
 * space-joined — same shape prescriptionSafetyAgent uses so that the
 * keyword matching behaves identically.
 */
export function buildHistoryText(input: {
  presentingConcerns?: string | null;
  contraindications?: string[] | null;
}): string {
  return [input.presentingConcerns ?? "", ...(input.contraindications ?? [])]
    .join(" ")
    .toLowerCase();
}

/**
 * From the set of contraindications matched against a patient's history,
 * drop any that are ALREADY covered by an existing unresolved observation
 * against the same regimen. This prevents the agent from writing a new
 * observation every time the event fires when the flag hasn't changed.
 *
 * An existing observation "covers" a contraindication if:
 *   - metadata.regimenId === regimenId, AND
 *   - metadata.contraindicationId === contraindication.id, AND
 *   - resolvedAt === null (observation still open).
 */
export function filterNewContraindications(
  matched: CannabisContraindication[],
  regimenId: string,
  existingObservations: Array<{
    metadata: unknown;
    resolvedAt: Date | null;
  }>,
): CannabisContraindication[] {
  const coveredIds = new Set<string>();
  for (const obs of existingObservations) {
    if (obs.resolvedAt !== null) continue;
    const meta = obs.metadata;
    if (!meta || typeof meta !== "object") continue;
    const m = meta as { regimenId?: unknown; contraindicationId?: unknown };
    if (m.regimenId !== regimenId) continue;
    if (typeof m.contraindicationId !== "string") continue;
    coveredIds.add(m.contraindicationId);
  }
  return matched.filter((c) => !coveredIds.has(c.id));
}

export const diagnosisSafetyAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "diagnosisSafety",
  version: "1.0.0",
  description:
    "Re-check every active dosing regimen against cannabis contraindications " +
    "whenever the patient's diagnosis or presenting-concern record changes. " +
    "Writes a ClinicalObservation for each newly-flagged regimen×contraindication " +
    "pair; stays silent when nothing new is flagged.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.outcome.reminder"],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    ctx.assertCan("read.patient");

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        presentingConcerns: true,
        contraindications: true,
      },
    });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    const regimens = await prisma.dosingRegimen.findMany({
      where: { patientId, active: true },
      include: { product: true },
    });

    if (regimens.length === 0) {
      ctx.log("info", "No active regimens — nothing to check", { patientId });
      return {
        regimensChecked: 0,
        contraindicationsFound: 0,
        observationsWritten: 0,
        observationIds: [],
      };
    }

    const historyText = buildHistoryText(patient);

    // If history is entirely empty there's no text to match keywords
    // against — short-circuit before querying observations.
    if (!historyText.trim()) {
      ctx.log("info", "Patient history empty — no keywords to match", {
        patientId,
        regimensChecked: regimens.length,
      });
      return {
        regimensChecked: regimens.length,
        contraindicationsFound: 0,
        observationsWritten: 0,
        observationIds: [],
      };
    }

    // Load every unresolved red-flag observation for this patient a single
    // time; we'll filter per-regimen in memory.
    const existingObservations = await prisma.clinicalObservation.findMany({
      where: {
        patientId,
        category: "red_flag",
        resolvedAt: null,
      },
      select: { metadata: true, resolvedAt: true },
    });

    const matchedAll = CANNABIS_CONTRAINDICATIONS.filter((c) =>
      c.matchKeywords.some((kw) => historyText.includes(kw.toLowerCase())),
    );

    ctx.log("info", "Diagnosis safety scan started", {
      patientId,
      regimensChecked: regimens.length,
      matchedContraindications: matchedAll.length,
    });

    const observationIds: string[] = [];
    let totalContraindicationsFound = 0;

    if (matchedAll.length > 0) {
      ctx.assertCan("write.outcome.reminder");
    }

    for (const regimen of regimens) {
      // The prescription-time agent only surfaces contraindications
      // relevant to the cannabinoids actually in the product. We preserve
      // that behavior here: if the product contains no cannabinoids at
      // all (a placeholder / custom product), skip it.
      const cannabinoids: string[] = [];
      if (
        regimen.product.thcConcentration &&
        regimen.product.thcConcentration > 0
      )
        cannabinoids.push("THC");
      if (
        regimen.product.cbdConcentration &&
        regimen.product.cbdConcentration > 0
      )
        cannabinoids.push("CBD");
      if (
        regimen.product.cbnConcentration &&
        regimen.product.cbnConcentration > 0
      )
        cannabinoids.push("CBN");
      if (
        regimen.product.cbgConcentration &&
        regimen.product.cbgConcentration > 0
      )
        cannabinoids.push("CBG");

      if (cannabinoids.length === 0) continue;

      const newContraindications = filterNewContraindications(
        matchedAll,
        regimen.id,
        existingObservations,
      );

      totalContraindicationsFound += newContraindications.length;

      for (const c of newContraindications) {
        const obs = await recordObservation({
          patientId,
          observedBy: "diagnosisSafety@1.0.0",
          observedByKind: "agent",
          category: "red_flag",
          severity: CONTRAINDICATION_SEVERITY[c.severity],
          summary: `Diagnosis update — ${c.label} now flagged against active ${regimen.product.name} regimen: ${c.rationale}`,
          actionSuggested:
            "Patient's regimen predates this flag. Review whether to taper, " +
            "switch, or continue with documented override.",
          evidence: {},
          metadata: {
            regimenId: regimen.id,
            productId: regimen.productId,
            checkKind: "post_diagnosis_contraindication",
            contraindicationId: c.id,
            contraindicationSeverity: c.severity,
          },
        });
        observationIds.push(obs.id);
      }
    }

    ctx.log("info", "Diagnosis safety scan complete", {
      patientId,
      regimensChecked: regimens.length,
      contraindicationsFound: totalContraindicationsFound,
      observationsWritten: observationIds.length,
    });

    return {
      regimensChecked: regimens.length,
      contraindicationsFound: totalContraindicationsFound,
      observationsWritten: observationIds.length,
      observationIds,
    };
  },
};

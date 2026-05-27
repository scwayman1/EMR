import type { ClinicalObservation, OutcomeLog } from "@prisma/client";

export interface CDSTrigger {
  patientId: string;
  ruleName: string;
  severity: "info" | "notable" | "concern" | "urgent";
  description: string;
}

export function evaluatePatientCDS(
  patientId: string,
  logs: OutcomeLog[],
  observations: ClinicalObservation[],
): CDSTrigger[] {
  const triggers: CDSTrigger[] = [];

  const recentHighStrain = observations.find(
    (obs) =>
      obs.category === "lifestyle_shift" &&
      obs.metadata &&
      typeof obs.metadata === "object" &&
      (obs.metadata as any).strain > 16,
  );

  if (recentHighStrain) {
    triggers.push({
      patientId,
      ruleName: "OvertrainingRisk",
      severity: "notable",
      description: `Patient exhibits high strain (${(recentHighStrain.metadata as any).strain}/21) indicating overtraining risk.`,
    });
  }

  return triggers;
}

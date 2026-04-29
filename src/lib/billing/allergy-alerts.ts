/**
 * Allergies + Contraindications Surfacing (EMR-113)
 * -------------------------------------------------
 * The contraindication check already runs at prescribe-time. Per Dr.
 * Patel: the data must also be visible from the moment a chart loads,
 * not buried behind the prescribe modal.
 *
 * This module produces the chart-banner payload + sort/dedupe rules
 * the chart shell renders. Pure logic — the React banner reads what
 * comes out of `summarizeAlerts()` and renders it without computing
 * priority itself.
 *
 * Lives in `lib/billing` because the same alert payload is consumed by
 * the claim-scrub engine (a contraindication is a denial-pattern
 * predictor) and the prior-auth packet builder (auth submissions
 * require an allergy roster). Keeping one source of truth avoids the
 * "the chart shows X but the claim says Y" drift Dr. Patel called
 * out in TICKETS.md.
 */

export type AllergySeverity = "fatal" | "severe" | "moderate" | "mild" | "unknown";
export type ContraindicationSeverity = "absolute" | "major" | "moderate" | "monitor";

export interface AllergyRecord {
  id: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  recordedAt: Date;
  selfReported: boolean;
}

export interface ContraindicationRecord {
  id: string;
  trigger: string;
  description: string;
  severity: ContraindicationSeverity;
  source: "drug-drug" | "drug-condition" | "drug-cannabis";
  recordedAt: Date;
}

export interface ChartAlert {
  id: string;
  kind: "allergy" | "contraindication";
  headline: string;
  detail: string;
  tone: "danger" | "warning" | "caution" | "info";
  priority: number;
  dismissible: boolean;
}

const ALLERGY_PRIORITY: Record<AllergySeverity, number> = {
  fatal: 100,
  severe: 80,
  moderate: 50,
  mild: 30,
  unknown: 20,
};

const CONTRA_PRIORITY: Record<ContraindicationSeverity, number> = {
  absolute: 95,
  major: 75,
  moderate: 45,
  monitor: 25,
};

const ALLERGY_TONE: Record<AllergySeverity, ChartAlert["tone"]> = {
  fatal: "danger",
  severe: "danger",
  moderate: "warning",
  mild: "caution",
  unknown: "info",
};

const CONTRA_TONE: Record<ContraindicationSeverity, ChartAlert["tone"]> = {
  absolute: "danger",
  major: "warning",
  moderate: "caution",
  monitor: "info",
};

/**
 * Convert raw allergy + contraindication records into the banner-ready
 * alert list. Sorted by priority desc; deduplicated by substance so a
 * patient with three "PCN" entries doesn't get three banners.
 */
export function summarizeAlerts(
  allergies: AllergyRecord[],
  contraindications: ContraindicationRecord[],
): ChartAlert[] {
  const seenSubstances = new Set<string>();
  const out: ChartAlert[] = [];

  for (const a of allergies) {
    const key = a.substance.trim().toLowerCase();
    if (seenSubstances.has(key)) continue;
    seenSubstances.add(key);
    const sevLabel =
      a.severity === "unknown"
        ? "Allergy"
        : `${a.severity[0].toUpperCase()}${a.severity.slice(1)} allergy`;
    out.push({
      id: `allergy:${a.id}`,
      kind: "allergy",
      headline: `${sevLabel}: ${a.substance}`,
      detail: a.selfReported
        ? `Patient-reported reaction: ${a.reaction}`
        : `Confirmed reaction: ${a.reaction}`,
      tone: ALLERGY_TONE[a.severity],
      priority: ALLERGY_PRIORITY[a.severity],
      dismissible: a.severity !== "fatal" && a.severity !== "severe",
    });
  }

  for (const c of contraindications) {
    const sevLabel =
      c.severity === "absolute"
        ? "Absolute contraindication"
        : `${c.severity[0].toUpperCase()}${c.severity.slice(1)} interaction`;
    out.push({
      id: `contra:${c.id}`,
      kind: "contraindication",
      headline: `${sevLabel}: ${c.trigger}`,
      detail: c.description,
      tone: CONTRA_TONE[c.severity],
      priority: CONTRA_PRIORITY[c.severity],
      dismissible: c.severity !== "absolute",
    });
  }

  out.sort((a, b) => b.priority - a.priority);
  return out;
}

/** Returns true if the chart's top banner should be the "STOP — review
 * before prescribing" interstitial rather than a standard alert strip. */
export function requiresStopInterstitial(alerts: ChartAlert[]): boolean {
  return alerts.some((a) => !a.dismissible);
}

/** Cross-check a planned prescription against the active alert list. */
export function alertsForPrescription(
  drugName: string,
  alerts: ChartAlert[],
): ChartAlert[] {
  const needle = drugName.toLowerCase();
  return alerts.filter(
    (a) => a.headline.toLowerCase().includes(needle) || a.detail.toLowerCase().includes(needle),
  );
}

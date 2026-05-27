/**
 * EMR-109: Patient age + age-band utilities.
 *
 * Centralizes the inline age math the chart was using and exposes a small
 * "age band" abstraction that downstream surfaces (overlays, screening
 * recommendations, dosing, consent flows) can branch on without each one
 * picking its own thresholds.
 *
 * Age cutoffs follow standard US clinical practice:
 *   infant:     < 2y
 *   child:      2–11y
 *   adolescent: 12–17y
 *   adult:      18–64y
 *   geriatric:  ≥ 65y
 */

export type AgeBand =
  | "infant"
  | "child"
  | "adolescent"
  | "adult"
  | "geriatric"
  | "unknown";

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  infant: "Infant",
  child: "Child",
  adolescent: "Adolescent",
  adult: "Adult",
  geriatric: "Geriatric",
  unknown: "Unknown age",
};

/** Soft Tailwind utility class for the band's primary tint, used by the
 *  small chart-header badge. Keep these to safe palette tokens so the
 *  rest of the design system stays consistent. */
export const AGE_BAND_BADGE_CLASS: Record<AgeBand, string> = {
  infant: "bg-rose-50 text-rose-700 border-rose-200",
  child: "bg-amber-50 text-amber-700 border-amber-200",
  adolescent: "bg-sky-50 text-sky-700 border-sky-200",
  adult: "bg-emerald-50 text-emerald-700 border-emerald-200",
  geriatric: "bg-purple-50 text-purple-700 border-purple-200",
  unknown: "bg-slate-50 text-slate-600 border-slate-200",
};

export const AGE_BAND_DESCRIPTION: Record<AgeBand, string> = {
  infant:
    "Birth–24 months. Pediatric overlay enabled. Growth velocity, immunization series, and parental-consent workflows apply.",
  child:
    "Ages 2–11. Pediatric overlay enabled. School performance and growth tracking are part of the chart.",
  adolescent:
    "Ages 12–17. Pediatric overlay with adolescent privacy considerations. Confidential care for sensitive conditions follows state-of-residence law.",
  adult: "Ages 18–64. Standard adult chart layout.",
  geriatric:
    "Age 65+. Geriatric overlay surfaces falls risk, polypharmacy review, cognitive screen, and advance directive prompts.",
  unknown:
    "Date of birth not on file. Please complete demographics to enable age-banded chart features.",
};

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function getAge(dob: Date | string | null | undefined): number | null {
  if (!dob) return null;
  const date = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(date.getTime())) return null;
  const years = (Date.now() - date.getTime()) / MS_PER_YEAR;
  return Math.max(0, Math.floor(years));
}

export function getAgeBand(
  dob: Date | string | null | undefined,
): AgeBand {
  const age = getAge(dob);
  if (age === null) return "unknown";
  if (age < 2) return "infant";
  if (age < 12) return "child";
  if (age < 18) return "adolescent";
  if (age < 65) return "adult";
  return "geriatric";
}

/** True for any patient under 18 — convenience for pediatric-module gating. */
export function isPediatric(dob: Date | string | null | undefined): boolean {
  const band = getAgeBand(dob);
  return band === "infant" || band === "child" || band === "adolescent";
}

/** True for patients 65+ — convenience for geriatric overlays. */
export function isGeriatric(dob: Date | string | null | undefined): boolean {
  return getAgeBand(dob) === "geriatric";
}

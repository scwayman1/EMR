/**
 * EMR-334 — De-medicalized marketing language screen.
 *
 * Companion to fda-claim-screening.ts. That module flags drug-disease
 * claims ("treats anxiety"). This module flags credential-grounded
 * marketing claims that imply a clinician endorses or prescribes the
 * product ("doctor recommended", "physician formulated", "I recommend
 * this to patients").
 *
 * Why split: drug-claim flags are FDA/FTC structural rules. Credential
 * flags are voice/positioning rules driven by the founder's medical
 * background — they evolve faster, ship as platform copy guidance, and
 * have safer-alternative suggestions paired to each banned phrase.
 *
 * Mirror of Dr. Patel's banned/safer phrase list. Keep this file as the
 * single source of truth — vendor-portal copy editor, marketing pages,
 * and product-description review all consume it.
 */

export type CredentialVerdict = "clean" | "flagged";

export interface CredentialFlag {
  term: string;
  offset: number;
  length: number;
  reason: string;
  saferAlternative: string;
}

export interface CredentialScreeningResult {
  verdict: CredentialVerdict;
  flags: CredentialFlag[];
}

/**
 * Each entry is a banned credential-claim pattern paired with the
 * specific safer-alternative phrasing surfaced to the editor. The
 * pattern is matched case-insensitively across word boundaries.
 *
 * Patterns intentionally allow common spacing/hyphen/possessive
 * variants ("doctor-recommended" / "doctor recommended" / "doctor's
 * recommendation").
 */
export const BANNED_CREDENTIAL_PHRASES: ReadonlyArray<{
  pattern: RegExp;
  display: string;
  reason: string;
  saferAlternative: string;
}> = [
  {
    pattern: /\bdoctor[\s-]?recommend(?:ed|s|ation)\b/gi,
    display: "doctor recommended",
    reason:
      "Implies a treating-physician endorsement, which creates malpractice and FDA-claim exposure for the clinician and the platform.",
    saferAlternative:
      "Clinician-curated · selected by our medical desk for product quality.",
  },
  {
    pattern: /\bclinician[\s-]?approved\b/gi,
    display: "clinician approved",
    reason:
      'Reads as a regulatory or clinical endorsement. We curate; we don\'t "approve" products.',
    saferAlternative: "Curated by our medical desk for quality and lab transparency.",
  },
  {
    pattern: /\bphysician[\s-]?(formulated|prescribed)\b/gi,
    display: "physician formulated/prescribed",
    reason:
      "Implies the listed clinician personally compounded or prescribed the product. Hard to substantiate; opens malpractice door.",
    saferAlternative:
      "Reviewed by a licensed clinician for formulation transparency and label accuracy.",
  },
  {
    pattern: /\bused in (?:my|our) practice\b/gi,
    display: "used in my practice",
    reason:
      "Mixes commercial language with clinical practice — creates a treating-physician relationship and a CSA/DEA red flag if combined with cannabis.",
    saferAlternative:
      "Featured on our shelf because it meets our clinician-set quality bar.",
  },
  {
    pattern: /\bI recommend this to (?:my )?patients\b/gi,
    display: "I recommend this to patients",
    reason:
      "Treating-physician endorsement of a specific product to a specific patient population.",
    saferAlternative:
      "Selected for our shelf because it meets our quality criteria — talk to your provider before you start.",
  },
  {
    pattern: /\b(?:cures?|treats?|heals?|prevents?)\b[^.!?\n]{0,80}\b(?:cancer|anxiety disorder|depression|insomnia|chronic pain|arthritis)\b/gi,
    display: "drug-claim phrasing",
    reason:
      "Mirrors fda-claim-screening rules but caught here so credential-claim editors see the violation in context.",
    saferAlternative:
      "Reframe around supporting normal bodily functions or routines (rest, calm, recovery), not treating a disease.",
  },
];

/**
 * Safer-alternative phrasing patterns that the editor *should* prefer.
 * Surfaced as positive examples in the marketing copy editor and the
 * vendor onboarding wizard.
 */
export const SAFER_PHRASING_PRESETS = [
  "Curated by our medical desk.",
  "Reviewed for quality, lab verification, and label accuracy.",
  "Founded by a physician — for product transparency, not personal medical advice.",
  "Talk to your provider before you start.",
  "Selected because it meets our clinician-set shelf criteria.",
  "Plant-powered, plainly labeled.",
] as const;

/**
 * Scan text for credential-claim violations. Returns a verdict + the
 * specific suggested replacement for each flagged phrase.
 *
 * Used by:
 *  - Product description editor (real-time linting)
 *  - Marketing page CMS (pre-publish gate)
 *  - Vendor onboarding wizard (description-step validation)
 */
export function screenCredentialClaims(text: string): CredentialScreeningResult {
  const flags: CredentialFlag[] = [];

  if (!text.trim()) {
    return { verdict: "clean", flags };
  }

  for (const rule of BANNED_CREDENTIAL_PHRASES) {
    rule.pattern.lastIndex = 0;
    let match = rule.pattern.exec(text);
    while (match) {
      flags.push({
        term: match[0],
        offset: match.index,
        length: match[0].length,
        reason: rule.reason,
        saferAlternative: rule.saferAlternative,
      });
      match = rule.pattern.exec(text);
    }
  }

  flags.sort((a, b) => a.offset - b.offset);

  return {
    verdict: flags.length > 0 ? "flagged" : "clean",
    flags,
  };
}

/**
 * EMR-094 — Mental-health record sensitivity + access wall.
 *
 * Federal rule (42 CFR Part 2) and most state mental-health statutes treat
 * substance-use and behavioral-health records as more sensitive than
 * general medical records. The user-facing experience is:
 *
 *   1. Encounters / notes / diagnoses tagged with a sensitive category
 *      (psychotherapy notes, SUD treatment, custody-related, suicidal
 *      ideation, gender-identity care, abortion care) are hidden behind a
 *      "break-glass" wall on the chart.
 *   2. The wall asks the clinician to acknowledge the sensitivity, attest
 *      a treatment relationship, and e-sign their full name.
 *   3. Every break-glass event writes an `AuditLog` row with the
 *      sensitivity category and reason — the privacy officer reviews
 *      these weekly.
 *   4. Patients see their own sensitive records without a wall when
 *      logged in as themselves.
 *
 * This file is the single source of truth for:
 *   • the "is this resource sensitive?" classifier,
 *   • the e-signature validation rules,
 *   • the structured `AuditLog` payload.
 *
 * It is intentionally framework-free so the same logic can be called
 * from server actions, tRPC handlers, and unit tests.
 */

export type SensitivityCategory =
  | "psychotherapy_notes"
  | "substance_use"
  | "suicidal_ideation"
  | "gender_affirming_care"
  | "reproductive_care"
  | "domestic_violence"
  | "minor_confidential"
  | "general_mental_health";

export interface SensitivityClassification {
  isSensitive: boolean;
  categories: SensitivityCategory[];
  /** Highest-precedence category — drives the access-wall copy. */
  primary: SensitivityCategory | null;
  /** Plain-English description for the access wall. */
  rationale: string;
}

interface CategoryDef {
  id: SensitivityCategory;
  /** Higher number = higher precedence in the wall copy. */
  precedence: number;
  /** Free-text keywords that trigger this category. */
  keywords: string[];
  /** ICD-10 prefixes that trigger this category. */
  icdPrefixes: string[];
  /** CPT codes that trigger this category. */
  cptCodes: string[];
  /** Encounter / note types that trigger this category. */
  noteTypes: string[];
  rationale: string;
}

// 42 CFR Part 2 = SUD records.
// HIPAA "psychotherapy notes" = a separate, unusually-protected category.
// The remaining categories are state-law-driven sensitivities most
// behavioral-health practices honor by convention.
const CATEGORY_DEFS: CategoryDef[] = [
  {
    id: "psychotherapy_notes",
    precedence: 100,
    keywords: [
      "psychotherapy notes",
      "process notes",
      "therapist personal notes",
    ],
    icdPrefixes: [],
    cptCodes: ["90832", "90834", "90837", "90846", "90847"],
    noteTypes: ["psychotherapy_progress", "process_note"],
    rationale:
      "Psychotherapy process notes are separately protected under HIPAA " +
      "and require explicit patient authorization for most disclosures.",
  },
  {
    id: "substance_use",
    precedence: 90,
    keywords: [
      "substance use",
      "alcohol use disorder",
      "opioid use",
      "cannabis use disorder",
      "stimulant use",
      "methadone",
      "buprenorphine",
      "suboxone",
      "naltrexone",
      "detox",
      "rehab",
    ],
    icdPrefixes: ["F10", "F11", "F12", "F13", "F14", "F15", "F16", "F18", "F19"],
    cptCodes: ["H0001", "H0004", "H0005", "H0020", "G2086", "G2087", "G2088"],
    noteTypes: ["sud_treatment", "mat_visit"],
    rationale:
      "Records of substance-use disorder treatment are protected under " +
      "42 CFR Part 2. Disclosure outside the treating program requires " +
      "specific patient consent.",
  },
  {
    id: "suicidal_ideation",
    precedence: 80,
    keywords: [
      "suicidal ideation",
      "suicide attempt",
      "self-harm",
      "self harm",
      "cutting",
      "wants to die",
      "kill myself",
    ],
    icdPrefixes: ["R45.85", "T14.91", "X71", "X72", "X73", "X74", "X75", "X76", "X77", "X78"],
    cptCodes: [],
    noteTypes: ["columbia_assessment", "safety_plan"],
    rationale:
      "Documentation of suicidal ideation is restricted to clinicians " +
      "with a direct treatment relationship to prevent stigma and harm.",
  },
  {
    id: "gender_affirming_care",
    precedence: 70,
    keywords: [
      "gender dysphoria",
      "gender identity",
      "transition",
      "gender-affirming",
      "hormone therapy",
      "hrt",
    ],
    icdPrefixes: ["F64"],
    cptCodes: [],
    noteTypes: ["gender_care"],
    rationale:
      "Gender-affirming-care records are restricted because of state-law " +
      "and safety considerations.",
  },
  {
    id: "reproductive_care",
    precedence: 60,
    keywords: [
      "abortion",
      "termination of pregnancy",
      "pregnancy options",
      "miscarriage management",
      "emergency contraception",
    ],
    icdPrefixes: ["O04", "Z33.2"],
    cptCodes: ["59840", "59841", "59850", "59851", "59852"],
    noteTypes: ["reproductive_options"],
    rationale:
      "Reproductive-care records are restricted because of state-law " +
      "considerations for both patient and clinician safety.",
  },
  {
    id: "domestic_violence",
    precedence: 50,
    keywords: [
      "domestic violence",
      "intimate partner violence",
      "abuse by partner",
      "ipv screening",
    ],
    icdPrefixes: ["T74", "T76", "Z69.1"],
    cptCodes: [],
    noteTypes: ["dv_screening"],
    rationale:
      "Documentation of intimate-partner violence is restricted to prevent " +
      "inadvertent disclosure to a perpetrator with portal access.",
  },
  {
    id: "minor_confidential",
    precedence: 40,
    keywords: [
      "confidential adolescent visit",
      "minor confidential",
      "sti screening (minor)",
    ],
    icdPrefixes: [],
    cptCodes: [],
    noteTypes: ["minor_confidential"],
    rationale:
      "State minor-consent law lets adolescents access certain services " +
      "without parental disclosure. Parent / guardian portal access is " +
      "blocked for these records.",
  },
  {
    id: "general_mental_health",
    precedence: 10,
    keywords: [
      "depression",
      "anxiety",
      "panic",
      "ptsd",
      "bipolar",
      "schizophrenia",
      "psychosis",
      "mood disorder",
      "personality disorder",
      "eating disorder",
    ],
    icdPrefixes: ["F20", "F21", "F22", "F23", "F25", "F30", "F31", "F32", "F33", "F40", "F41", "F42", "F43", "F50", "F60", "F84", "F90"],
    cptCodes: ["90791", "90792", "90785"],
    noteTypes: ["psychiatric_eval", "mental_health"],
    rationale:
      "Mental-health treatment records carry stigma risk and are " +
      "restricted to clinicians with a treatment relationship.",
  },
];

export interface SensitivityProbe {
  noteType?: string | null;
  text?: string | null;
  icd10Codes?: string[] | null;
  cptCodes?: string[] | null;
  /** Resource-level override: an encounter the clinician explicitly tagged
   *  as confidential is sensitive even if no other signal fires. */
  flaggedConfidential?: boolean | null;
}

export function classifySensitivity(
  probe: SensitivityProbe,
): SensitivityClassification {
  const text = (probe.text ?? "").toLowerCase();
  const icd = new Set((probe.icd10Codes ?? []).map((c) => c.toUpperCase()));
  const cpt = new Set((probe.cptCodes ?? []).map((c) => c.toUpperCase()));
  const noteType = probe.noteType?.toLowerCase().trim() ?? "";

  const matched = new Set<SensitivityCategory>();

  for (const def of CATEGORY_DEFS) {
    if (def.noteTypes.some((nt) => nt.toLowerCase() === noteType)) {
      matched.add(def.id);
      continue;
    }
    if (def.cptCodes.some((c) => cpt.has(c.toUpperCase()))) {
      matched.add(def.id);
      continue;
    }
    if (
      def.icdPrefixes.some((prefix) => {
        for (const code of icd) {
          if (code.startsWith(prefix)) return true;
        }
        return false;
      })
    ) {
      matched.add(def.id);
      continue;
    }
    if (def.keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      matched.add(def.id);
    }
  }

  if (probe.flaggedConfidential) {
    matched.add("general_mental_health");
  }

  const categories = [...matched];
  if (categories.length === 0) {
    return {
      isSensitive: false,
      categories: [],
      primary: null,
      rationale: "",
    };
  }

  const sorted = categories
    .map((id) => CATEGORY_DEFS.find((d) => d.id === id)!)
    .sort((a, b) => b.precedence - a.precedence);
  const primary = sorted[0];

  return {
    isSensitive: true,
    categories: sorted.map((d) => d.id),
    primary: primary.id,
    rationale: primary.rationale,
  };
}

// ---------------------------------------------------------------------------
// Access wall
// ---------------------------------------------------------------------------

export type ViewerRole =
  | "patient_self"
  | "treating_clinician"
  | "covering_clinician"
  | "ma_or_front_desk"
  | "billing_or_back_office"
  | "researcher"
  | "guardian"
  | "operator_admin"
  | "external";

export interface AccessAttempt {
  viewerRole: ViewerRole;
  /** True when the viewer is the patient themselves (cross-checked separately). */
  isViewingOwnRecord?: boolean;
  /** True when the viewer has an established treatment relationship. */
  hasTreatmentRelationship?: boolean;
  /** The signed acknowledgement the wall captured (if any). */
  breakGlassAttestation?: BreakGlassAttestation;
}

export interface BreakGlassAttestation {
  reason: string;
  /** Clinician-typed full name (e-signature). */
  clinicianAttestation: string;
  /** Acknowledged that they are NOT the patient and have a clinical purpose. */
  acknowledgedClinicalPurpose: boolean;
  /** Acknowledged 42 CFR Part 2 / state mental-health redisclosure rules. */
  acknowledgedRedisclosureRules: boolean;
}

export type AccessGate =
  | { kind: "allow" }
  | { kind: "wall"; reason: string }
  | { kind: "deny"; reason: string };

const MIN_BREAK_GLASS_REASON_LENGTH = 20;

export function decideAccess(
  classification: SensitivityClassification,
  attempt: AccessAttempt,
): AccessGate {
  if (!classification.isSensitive) {
    return { kind: "allow" };
  }

  // Patients viewing their own record bypass the wall, EXCEPT for
  // psychotherapy process notes — those are HIPAA-restricted from the
  // patient too unless the clinician explicitly releases.
  if (attempt.isViewingOwnRecord && attempt.viewerRole === "patient_self") {
    if (classification.primary === "psychotherapy_notes") {
      return {
        kind: "deny",
        reason:
          "Psychotherapy process notes are not viewable through the patient portal.",
      };
    }
    return { kind: "allow" };
  }

  // External viewers (record-release recipients) are denied — they need a
  // formal release-of-information packet, not chart access.
  if (attempt.viewerRole === "external") {
    return {
      kind: "deny",
      reason:
        "External viewers must request records through the Release of Information process.",
    };
  }

  // SUD records (42 CFR Part 2) cannot be accessed by billing / front
  // desk / researchers without specific consent — block them outright.
  if (
    classification.categories.includes("substance_use") &&
    (attempt.viewerRole === "billing_or_back_office" ||
      attempt.viewerRole === "researcher" ||
      attempt.viewerRole === "ma_or_front_desk")
  ) {
    return {
      kind: "deny",
      reason:
        "42 CFR Part 2 prohibits access to SUD records by this role without specific patient consent.",
    };
  }

  // Treating clinicians breeze through with a notice but no e-signature.
  if (
    attempt.viewerRole === "treating_clinician" &&
    attempt.hasTreatmentRelationship
  ) {
    return { kind: "allow" };
  }

  // Anyone else: break-glass wall.
  if (!attempt.breakGlassAttestation) {
    return { kind: "wall", reason: classification.rationale };
  }

  const att = attempt.breakGlassAttestation;
  if (
    att.reason.trim().length >= MIN_BREAK_GLASS_REASON_LENGTH &&
    att.clinicianAttestation.trim().length > 0 &&
    att.acknowledgedClinicalPurpose &&
    att.acknowledgedRedisclosureRules
  ) {
    return { kind: "allow" };
  }

  return { kind: "wall", reason: classification.rationale };
}

// ---------------------------------------------------------------------------
// Audit payload
// ---------------------------------------------------------------------------

export interface SensitiveAccessAudit {
  action: "phi.sensitive.viewed" | "phi.sensitive.break_glass";
  at: string;
  resourceType: string;
  resourceId: string;
  patientId: string;
  viewerUserId: string;
  viewerRole: ViewerRole;
  categories: SensitivityCategory[];
  /** "allow" or "wall" — populated from decideAccess result. */
  outcome: "allowed" | "blocked";
  breakGlass?: {
    reason: string;
    clinicianAttestation: string;
  };
}

export function buildAccessAudit(
  classification: SensitivityClassification,
  attempt: AccessAttempt,
  resource: { type: string; id: string; patientId: string; viewerUserId: string },
  outcome: AccessGate,
): SensitiveAccessAudit {
  const wasBreakGlass =
    attempt.breakGlassAttestation && outcome.kind === "allow";
  return {
    action: wasBreakGlass ? "phi.sensitive.break_glass" : "phi.sensitive.viewed",
    at: new Date().toISOString(),
    resourceType: resource.type,
    resourceId: resource.id,
    patientId: resource.patientId,
    viewerUserId: resource.viewerUserId,
    viewerRole: attempt.viewerRole,
    categories: classification.categories,
    outcome: outcome.kind === "allow" ? "allowed" : "blocked",
    breakGlass: wasBreakGlass
      ? {
          reason: attempt.breakGlassAttestation!.reason,
          clinicianAttestation:
            attempt.breakGlassAttestation!.clinicianAttestation,
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// User-facing copy helpers
// ---------------------------------------------------------------------------

export const CATEGORY_LABEL: Record<SensitivityCategory, string> = {
  psychotherapy_notes: "Psychotherapy notes",
  substance_use: "Substance-use treatment",
  suicidal_ideation: "Suicidality / safety planning",
  gender_affirming_care: "Gender-affirming care",
  reproductive_care: "Reproductive care",
  domestic_violence: "Intimate-partner violence",
  minor_confidential: "Confidential adolescent visit",
  general_mental_health: "Mental health",
};

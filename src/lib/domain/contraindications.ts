/**
 * Cannabis Contraindication Database (EMR-088)
 *
 * Per the medical literature, certain conditions and patient histories
 * make cannabis use clinically inadvisable or require extreme caution.
 * When a clinician attempts to prescribe to a patient with one or more
 * of these flags, the system displays a popup warning that MUST be
 * acknowledged with documented override reasoning before submission.
 *
 * The override is recorded on the dosing regimen + audit log.
 *
 * Sources: NIDA cannabis use guidelines, Russo 2016 cannabis pharmacology,
 * Hoch et al. 2020 (psychiatric contraindications), expert clinical consensus.
 */

export type ContraindicationSeverity = "absolute" | "relative" | "caution";

export interface CannabisContraindication {
  id: string;
  label: string;
  severity: ContraindicationSeverity;
  /** Why this is a contraindication, in clinician-facing language */
  rationale: string;
  /** Patient-facing plain-language warning */
  patientWarning: string;
  /** Keywords/ICD-10 codes that match patient history */
  matchKeywords: string[];
  matchIcdPrefixes?: string[];
  /** Whether the warning blocks submission until overridden */
  requiresOverride: boolean;
}

export const CANNABIS_CONTRAINDICATIONS: CannabisContraindication[] = [
  {
    id: "schizophrenia",
    label: "Schizophrenia / psychotic disorder",
    severity: "absolute",
    rationale:
      "THC can precipitate or worsen psychotic episodes. Cannabis use is associated with earlier onset and more frequent relapses in patients with schizophrenia spectrum disorders. Most expert consensus considers this an absolute contraindication.",
    patientWarning:
      "Cannabis can make psychotic symptoms worse. We need to talk about whether this is the right medicine for you.",
    matchKeywords: ["schizophrenia", "psychosis", "psychotic", "schizoaffective", "delusional disorder"],
    matchIcdPrefixes: ["F20", "F21", "F22", "F23", "F25", "F28", "F29"],
    requiresOverride: true,
  },
  {
    id: "bipolar_type_1",
    label: "Bipolar I disorder (history of mania)",
    severity: "absolute",
    rationale:
      "THC can trigger manic episodes in patients with bipolar I disorder. Cannabis use is associated with worse mood stabilization, longer episodes, and increased rapid cycling. Particularly contraindicated in patients with active or recent mania.",
    patientWarning:
      "Cannabis (especially THC) can trigger mood episodes if you have bipolar disorder. Let's talk through this carefully before deciding.",
    matchKeywords: ["bipolar i", "bipolar 1", "mania", "manic episode", "bipolar type 1"],
    matchIcdPrefixes: ["F30", "F31.0", "F31.1", "F31.2"],
    requiresOverride: true,
  },
  {
    id: "pregnancy",
    label: "Pregnancy",
    severity: "absolute",
    rationale:
      "Cannabis use during pregnancy is associated with low birth weight, preterm birth, and adverse neurodevelopmental outcomes in the child. ACOG recommends against any cannabis use during pregnancy. THC crosses the placenta.",
    patientWarning:
      "Cannabis isn't safe to use while you're pregnant — it can affect your baby's growth and development. Let's find a different option together.",
    matchKeywords: ["pregnant", "pregnancy", "gravid", "antepartum"],
    matchIcdPrefixes: ["O00", "O01", "O02", "O03", "O04", "O09", "Z33", "Z34"],
    requiresOverride: true,
  },
  {
    id: "breastfeeding",
    label: "Breastfeeding / lactation",
    severity: "relative",
    rationale:
      "THC is excreted into breast milk and can persist for days after last use. Effects on the breastfed infant include sedation and possible developmental effects. AAP recommends against cannabis use while breastfeeding.",
    patientWarning:
      "Cannabis passes into breast milk and can affect your baby. While you're breastfeeding, we should find a different option.",
    matchKeywords: ["breastfeeding", "lactation", "nursing"],
    matchIcdPrefixes: ["Z39.1", "O92"],
    requiresOverride: true,
  },
  {
    id: "active_substance_use",
    label: "Active substance use disorder",
    severity: "relative",
    rationale:
      "Patients with active substance use disorders, particularly cannabis use disorder or stimulant use, are at higher risk of cannabis dependence and worse SUD outcomes. Consider alternative pain/anxiety management strategies.",
    patientWarning:
      "Because of your history with substance use, cannabis carries extra risk for you. Let's talk about safer paths forward.",
    matchKeywords: ["substance use disorder", "cannabis use disorder", "polysubstance", "stimulant use disorder"],
    matchIcdPrefixes: ["F11", "F12.20", "F12.21", "F14", "F15", "F19"],
    requiresOverride: true,
  },
  {
    id: "severe_cv_disease",
    label: "Severe cardiovascular disease",
    severity: "relative",
    rationale:
      "THC causes acute increases in heart rate (tachycardia) and can cause peripheral vasodilation. Smoked cannabis is associated with acute coronary syndrome in vulnerable patients within 1-2 hours of use. Avoid in unstable angina, recent MI, severe heart failure, and uncontrolled arrhythmias.",
    patientWarning:
      "Cannabis can put extra strain on your heart. Given your heart condition, this isn't a safe choice right now.",
    matchKeywords: ["unstable angina", "recent mi", "myocardial infarction", "heart failure", "cardiomyopathy"],
    matchIcdPrefixes: ["I20.0", "I21", "I22", "I50", "I46"],
    requiresOverride: true,
  },
  {
    id: "severe_liver_dysfunction",
    label: "Severe hepatic dysfunction",
    severity: "caution",
    rationale:
      "Cannabinoids are extensively metabolized by hepatic CYP450 enzymes (primarily CYP2C9, CYP3A4, CYP2D6). Severe liver impairment can lead to accumulation, prolonged effects, and increased adverse events. Start with significantly reduced doses.",
    patientWarning:
      "Your liver helps process cannabis, so we need to use a much smaller dose to keep you safe.",
    matchKeywords: ["cirrhosis", "liver failure", "hepatic failure", "child-pugh c"],
    matchIcdPrefixes: ["K70.3", "K71.1", "K72", "K74"],
    requiresOverride: false,
  },
  {
    id: "cannabis_hyperemesis",
    label: "Cannabis hyperemesis syndrome (history)",
    severity: "absolute",
    rationale:
      "Cannabis hyperemesis syndrome is a paradoxical reaction where chronic cannabis use causes cyclical vomiting that resolves only with cessation. Continued cannabis use will perpetuate symptoms.",
    patientWarning:
      "Your history of cannabis hyperemesis means cannabis itself is causing the vomiting episodes. Stopping cannabis is the only treatment.",
    matchKeywords: ["cannabis hyperemesis", "chs", "cannabinoid hyperemesis"],
    matchIcdPrefixes: ["F12.288"],
    requiresOverride: true,
  },
  {
    id: "minor",
    label: "Patient under 18",
    severity: "relative",
    rationale:
      "Adolescent cannabis exposure is associated with adverse cognitive, psychiatric, and developmental outcomes. The endocannabinoid system continues to develop into the mid-20s. Avoid recreational/high-THC formulations in minors. Pediatric medical use (e.g. Epidiolex for refractory epilepsy) should follow specialty guidelines.",
    patientWarning:
      "Cannabis affects developing brains differently. We need extra caution here and likely a specialist's input.",
    matchKeywords: ["pediatric", "adolescent", "minor"],
    requiresOverride: true,
  },
  {
    id: "severe_mental_health_history",
    label: "Severe anxiety / panic disorder",
    severity: "caution",
    rationale:
      "While low-dose THC and CBD can help mild anxiety, high-dose THC paradoxically worsens anxiety and can trigger panic attacks in susceptible patients. Start at very low doses and titrate slowly. CBD-dominant formulations are safer.",
    patientWarning:
      "Cannabis can sometimes make anxiety worse. We'll start very low and see how you respond.",
    matchKeywords: ["panic disorder", "severe anxiety"],
    matchIcdPrefixes: ["F40.0", "F41.0"],
    requiresOverride: false,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PatientForContraindicationCheck {
  dateOfBirth?: Date | null;
  presentingConcerns?: string | null;
  intakeAnswers?: any;
  medicationNames?: string[];
  /** ICD-10 codes from problem list / chart summary */
  icd10Codes?: string[];
  /** Free-text history (e.g. chart summary md) */
  historyText?: string | null;
}

export interface ContraindicationMatch {
  contraindication: CannabisContraindication;
  matchedOn: string;
}

/**
 * Check a patient's record for cannabis contraindications.
 * Returns an array of matches — empty array means no flags.
 */
export function checkContraindications(
  patient: PatientForContraindicationCheck,
): ContraindicationMatch[] {
  const matches: ContraindicationMatch[] = [];

  // Build searchable text from all the available patient context
  const searchText = [
    patient.presentingConcerns ?? "",
    patient.historyText ?? "",
    typeof patient.intakeAnswers === "string"
      ? patient.intakeAnswers
      : patient.intakeAnswers
        ? JSON.stringify(patient.intakeAnswers)
        : "",
    (patient.medicationNames ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const icdSet = new Set(
    (patient.icd10Codes ?? []).map((c) => c.toUpperCase()),
  );

  // Age check for minor flag
  let age: number | null = null;
  if (patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    age = Math.floor(
      (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    );
  }

  for (const ci of CANNABIS_CONTRAINDICATIONS) {
    // Special case: minor flag uses age
    if (ci.id === "minor") {
      if (age != null && age < 18) {
        matches.push({
          contraindication: ci,
          matchedOn: `patient age ${age}`,
        });
      }
      continue;
    }

    // Match on ICD-10 prefix
    if (ci.matchIcdPrefixes && ci.matchIcdPrefixes.length > 0) {
      for (const prefix of ci.matchIcdPrefixes) {
        for (const code of icdSet) {
          if (code.startsWith(prefix)) {
            matches.push({
              contraindication: ci,
              matchedOn: `ICD-10 ${code}`,
            });
            break;
          }
        }
        if (matches[matches.length - 1]?.contraindication.id === ci.id) break;
      }
      // Skip keyword check if we already matched
      if (matches[matches.length - 1]?.contraindication.id === ci.id) continue;
    }

    // Match on free-text keywords
    for (const kw of ci.matchKeywords) {
      if (searchText.includes(kw.toLowerCase())) {
        matches.push({
          contraindication: ci,
          matchedOn: `mention of "${kw}"`,
        });
        break;
      }
    }
  }

  return matches;
}

/**
 * Highest severity in a list of matches. Useful for determining
 * whether to force an override popup vs. show a warning.
 */
export function highestSeverity(
  matches: ContraindicationMatch[],
): ContraindicationSeverity | null {
  if (matches.length === 0) return null;
  if (matches.some((m) => m.contraindication.severity === "absolute"))
    return "absolute";
  if (matches.some((m) => m.contraindication.severity === "relative"))
    return "relative";
  return "caution";
}

/**
 * Whether ANY match requires the override workflow (block submission
 * until clinician documents override reasoning).
 */
export function requiresOverride(matches: ContraindicationMatch[]): boolean {
  return matches.some((m) => m.contraindication.requiresOverride);
}

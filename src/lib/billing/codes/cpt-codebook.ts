/**
 * EMR-101 — Full CPT / ICD-10 Codebook (canonical for the demo)
 *
 * This is the "starter" codebook the EMR ships with — broad coverage of
 * the codes a primary-care + cannabis-medicine practice will hit 90 % of
 * the time, with enough metadata to drive:
 *
 *   • the CPT / ICD picker UI (`src/components/ui/cpt-picker.tsx`),
 *   • coding-readiness checks in the scribe agent,
 *   • payer scrubbing rules,
 *   • patient-facing plain-language descriptions.
 *
 * Real production deploys swap this for the licensed AMA + WHO source
 * (we only ship the public RVU + descriptor mappings the AMA permits in
 * a non-commercial demo). Code shape stays identical — `CPTCode[]` and
 * `ICD10Code[]` — so the swap is one import.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CPTCategory =
  | "evaluation_and_management"
  | "preventive_services"
  | "behavioral_health"
  | "telehealth"
  | "imaging"
  | "lab"
  | "vaccines"
  | "minor_procedures"
  | "care_management"
  | "transitional_care"
  | "remote_monitoring"
  | "screening_brief_intervention"
  | "cannabis_certification";

export interface CPTCode {
  code: string;
  shortDescription: string;
  longDescription: string;
  category: CPTCategory;
  /** Standard total-RVU for the code (CMS national, non-facility). */
  rvu: number;
  /** Demo-grade national price (CMS conversion factor × RVU, rounded). */
  approxAllowableUsd: number;
  /** Common ICD-10 prefixes that pair cleanly with this CPT. */
  commonIcd10Prefixes: string[];
  /** Modifiers most commonly appended (e.g., 25, 95, 33). */
  commonModifiers: string[];
  /** Patient-facing plain-language description. */
  plainLanguage: string;
  /** Documentation requirements / NCCI hints surfaced inline. */
  documentationHint?: string;
}

export type ICD10Chapter =
  | "infectious"
  | "neoplasms"
  | "blood_immune"
  | "endocrine_metabolic"
  | "mental_behavioral"
  | "nervous"
  | "eye"
  | "ear"
  | "circulatory"
  | "respiratory"
  | "digestive"
  | "skin"
  | "musculoskeletal"
  | "genitourinary"
  | "pregnancy"
  | "perinatal"
  | "congenital"
  | "symptoms_signs"
  | "injury_poisoning"
  | "external_causes"
  | "z_codes";

export interface ICD10Code {
  code: string;
  description: string;
  chapter: ICD10Chapter;
  /** Friendly synonym list — drives picker autocomplete. */
  synonyms: string[];
  /** True for billable leaf codes, false for parent/header codes. */
  billable: boolean;
  /** Plain-language patient-facing description. */
  plainLanguage: string;
  /** Cannabis-relevance flag — many of these tie to therapeutic indications. */
  cannabisRelevant?: boolean;
}

// ---------------------------------------------------------------------------
// CPT codebook
// ---------------------------------------------------------------------------

export const CPT_CODEBOOK: CPTCode[] = [
  // ── E&M, established patient ──
  {
    code: "99211",
    shortDescription: "Established pt, minimal",
    longDescription:
      "Office/outpatient visit, established patient, minimal problem; nurse visit.",
    category: "evaluation_and_management",
    rvu: 0.7,
    approxAllowableUsd: 24,
    commonIcd10Prefixes: ["Z", "R"],
    commonModifiers: [],
    plainLanguage: "A quick check-in with the nurse.",
  },
  {
    code: "99212",
    shortDescription: "Established pt, level 2",
    longDescription:
      "Office/outpatient established patient, straightforward MDM, 10–19 min total.",
    category: "evaluation_and_management",
    rvu: 1.3,
    approxAllowableUsd: 56,
    commonIcd10Prefixes: ["F", "G", "M", "R"],
    commonModifiers: ["25"],
    plainLanguage: "A short doctor visit.",
  },
  {
    code: "99213",
    shortDescription: "Established pt, level 3",
    longDescription:
      "Office/outpatient established, low MDM, 20–29 min total.",
    category: "evaluation_and_management",
    rvu: 1.93,
    approxAllowableUsd: 92,
    commonIcd10Prefixes: ["F", "G", "M", "R", "K"],
    commonModifiers: ["25", "95"],
    plainLanguage: "A standard doctor visit.",
    documentationHint:
      "Document at least 1 chronic problem or 2 self-limited problems + simple data review.",
  },
  {
    code: "99214",
    shortDescription: "Established pt, level 4",
    longDescription:
      "Office/outpatient established, moderate MDM, 30–39 min total.",
    category: "evaluation_and_management",
    rvu: 2.85,
    approxAllowableUsd: 132,
    commonIcd10Prefixes: ["F", "G", "M", "K", "I", "E"],
    commonModifiers: ["25", "95"],
    plainLanguage: "A longer / more involved visit.",
    documentationHint:
      "Document moderate-complexity MDM: 1 chronic + exacerbation OR 2+ stable chronic, plus prescription drug management.",
  },
  {
    code: "99215",
    shortDescription: "Established pt, level 5",
    longDescription:
      "Office/outpatient established, high MDM, 40–54 min total.",
    category: "evaluation_and_management",
    rvu: 4.0,
    approxAllowableUsd: 184,
    commonIcd10Prefixes: ["F", "G", "I", "E"],
    commonModifiers: ["25", "95"],
    plainLanguage: "A very involved doctor visit for a complex problem.",
  },
  // ── E&M, new patient ──
  {
    code: "99202",
    shortDescription: "New pt, level 2",
    longDescription:
      "Office/outpatient new patient, straightforward MDM, 15–29 min total.",
    category: "evaluation_and_management",
    rvu: 1.7,
    approxAllowableUsd: 73,
    commonIcd10Prefixes: ["Z", "R"],
    commonModifiers: ["25"],
    plainLanguage: "First-time visit, simple problem.",
  },
  {
    code: "99203",
    shortDescription: "New pt, level 3",
    longDescription:
      "Office/outpatient new patient, low MDM, 30–44 min total.",
    category: "evaluation_and_management",
    rvu: 2.6,
    approxAllowableUsd: 113,
    commonIcd10Prefixes: ["F", "M", "G"],
    commonModifiers: ["25", "95"],
    plainLanguage: "First-time visit.",
  },
  {
    code: "99204",
    shortDescription: "New pt, level 4",
    longDescription:
      "Office/outpatient new patient, moderate MDM, 45–59 min total.",
    category: "evaluation_and_management",
    rvu: 3.9,
    approxAllowableUsd: 169,
    commonIcd10Prefixes: ["F", "M", "G", "I", "E"],
    commonModifiers: ["25", "95"],
    plainLanguage: "A longer first-time visit for a complex problem.",
  },
  {
    code: "99205",
    shortDescription: "New pt, level 5",
    longDescription:
      "Office/outpatient new patient, high MDM, 60–74 min total.",
    category: "evaluation_and_management",
    rvu: 5.04,
    approxAllowableUsd: 223,
    commonIcd10Prefixes: ["F", "G", "I"],
    commonModifiers: ["25", "95"],
    plainLanguage: "A very involved first-time visit.",
  },

  // ── Preventive ──
  {
    code: "99395",
    shortDescription: "Preventive, established 18–39",
    longDescription: "Periodic preventive medicine, established patient 18–39.",
    category: "preventive_services",
    rvu: 2.43,
    approxAllowableUsd: 110,
    commonIcd10Prefixes: ["Z00"],
    commonModifiers: ["33"],
    plainLanguage: "Annual wellness visit (adult).",
  },
  {
    code: "99396",
    shortDescription: "Preventive, established 40–64",
    longDescription: "Periodic preventive medicine, established 40–64.",
    category: "preventive_services",
    rvu: 2.6,
    approxAllowableUsd: 119,
    commonIcd10Prefixes: ["Z00"],
    commonModifiers: ["33"],
    plainLanguage: "Annual wellness visit (adult).",
  },
  {
    code: "G0438",
    shortDescription: "Initial Medicare AWV",
    longDescription:
      "Annual Wellness Visit; includes a Personalized Prevention Plan, initial visit.",
    category: "preventive_services",
    rvu: 4.66,
    approxAllowableUsd: 173,
    commonIcd10Prefixes: ["Z00.00"],
    commonModifiers: ["33"],
    plainLanguage: "Medicare Annual Wellness Visit, first time.",
  },
  {
    code: "G0439",
    shortDescription: "Subsequent Medicare AWV",
    longDescription:
      "Annual Wellness Visit; subsequent visit with Personalized Prevention Plan.",
    category: "preventive_services",
    rvu: 3.06,
    approxAllowableUsd: 117,
    commonIcd10Prefixes: ["Z00.00"],
    commonModifiers: ["33"],
    plainLanguage: "Medicare Annual Wellness Visit, follow-up.",
  },

  // ── Behavioral health ──
  {
    code: "90791",
    shortDescription: "Psych diagnostic eval",
    longDescription:
      "Psychiatric diagnostic evaluation without medical services.",
    category: "behavioral_health",
    rvu: 3.75,
    approxAllowableUsd: 169,
    commonIcd10Prefixes: ["F32", "F33", "F41", "F43"],
    commonModifiers: ["95"],
    plainLanguage: "First mental-health intake visit.",
  },
  {
    code: "90792",
    shortDescription: "Psych diagnostic eval w/ medical",
    longDescription:
      "Psychiatric diagnostic evaluation with medical services (medication management possible).",
    category: "behavioral_health",
    rvu: 4.13,
    approxAllowableUsd: 188,
    commonIcd10Prefixes: ["F32", "F33", "F41", "F43"],
    commonModifiers: ["95"],
    plainLanguage: "First psychiatric visit including medication review.",
  },
  {
    code: "90832",
    shortDescription: "Psychotherapy 30 min",
    longDescription: "Individual psychotherapy, 30 minutes.",
    category: "behavioral_health",
    rvu: 1.69,
    approxAllowableUsd: 75,
    commonIcd10Prefixes: ["F32", "F33", "F41", "F43"],
    commonModifiers: ["95"],
    plainLanguage: "Talk therapy, half hour.",
  },
  {
    code: "90834",
    shortDescription: "Psychotherapy 45 min",
    longDescription: "Individual psychotherapy, 45 minutes.",
    category: "behavioral_health",
    rvu: 2.25,
    approxAllowableUsd: 100,
    commonIcd10Prefixes: ["F32", "F33", "F41", "F43"],
    commonModifiers: ["95"],
    plainLanguage: "Talk therapy, 45 minutes.",
  },
  {
    code: "90837",
    shortDescription: "Psychotherapy 60 min",
    longDescription: "Individual psychotherapy, 60 minutes.",
    category: "behavioral_health",
    rvu: 3.4,
    approxAllowableUsd: 153,
    commonIcd10Prefixes: ["F32", "F33", "F41", "F43"],
    commonModifiers: ["95"],
    plainLanguage: "Talk therapy, full hour.",
  },

  // ── Telehealth modifier-aware ──
  {
    code: "99441",
    shortDescription: "Telephone E&M 5–10 min",
    longDescription: "Telephone E&M, 5–10 minutes of medical discussion.",
    category: "telehealth",
    rvu: 0.5,
    approxAllowableUsd: 23,
    commonIcd10Prefixes: ["R", "F", "M"],
    commonModifiers: [],
    plainLanguage: "Quick phone visit.",
  },

  // ── Care management ──
  {
    code: "99490",
    shortDescription: "Chronic care mgmt 20 min",
    longDescription:
      "Chronic care management services, 20 min of clinical staff time, per month.",
    category: "care_management",
    rvu: 1.0,
    approxAllowableUsd: 64,
    commonIcd10Prefixes: ["I", "E11", "F"],
    commonModifiers: [],
    plainLanguage: "Help managing your long-term conditions between visits.",
  },
  {
    code: "99439",
    shortDescription: "Chronic care mgmt addl 20 min",
    longDescription:
      "Each additional 20 minutes of chronic care management services per month.",
    category: "care_management",
    rvu: 1.0,
    approxAllowableUsd: 47,
    commonIcd10Prefixes: ["I", "E11", "F"],
    commonModifiers: [],
    plainLanguage: "More between-visit care for chronic conditions.",
  },

  // ── Remote monitoring ──
  {
    code: "99453",
    shortDescription: "RPM device setup",
    longDescription:
      "Remote monitoring of physiologic parameters, initial setup and patient education.",
    category: "remote_monitoring",
    rvu: 0.59,
    approxAllowableUsd: 19,
    commonIcd10Prefixes: ["I10", "E11", "I50"],
    commonModifiers: [],
    plainLanguage: "Setting you up with a home monitoring device.",
  },
  {
    code: "99454",
    shortDescription: "RPM device 30-day supply",
    longDescription:
      "Remote monitoring; device with daily recording or alert transmission, each 30 days.",
    category: "remote_monitoring",
    rvu: 1.81,
    approxAllowableUsd: 50,
    commonIcd10Prefixes: ["I10", "E11", "I50"],
    commonModifiers: [],
    plainLanguage: "Monthly home monitoring device.",
  },
  {
    code: "99457",
    shortDescription: "RPM 20 min mgmt",
    longDescription:
      "Remote monitoring treatment management, 20 minutes/month.",
    category: "remote_monitoring",
    rvu: 1.21,
    approxAllowableUsd: 50,
    commonIcd10Prefixes: ["I10", "E11", "I50"],
    commonModifiers: [],
    plainLanguage: "Reviewing your home monitoring data with your clinician.",
  },

  // ── Screening / brief intervention ──
  {
    code: "99408",
    shortDescription: "SBIRT 15–30 min",
    longDescription:
      "Alcohol/substance screening and brief intervention, 15–30 minutes.",
    category: "screening_brief_intervention",
    rvu: 0.65,
    approxAllowableUsd: 33,
    commonIcd10Prefixes: ["F10", "F11", "F12", "Z71"],
    commonModifiers: [],
    plainLanguage: "Substance use screening + counseling.",
  },
  {
    code: "G0444",
    shortDescription: "Depression screening, annual",
    longDescription:
      "Annual depression screening, 15 minutes (Medicare).",
    category: "preventive_services",
    rvu: 0.18,
    approxAllowableUsd: 18,
    commonIcd10Prefixes: ["Z13.31"],
    commonModifiers: [],
    plainLanguage: "Once-a-year mood check.",
  },

  // ── Vaccines ──
  {
    code: "90471",
    shortDescription: "Vaccine admin first",
    longDescription:
      "Immunization administration, percutaneous/IM, one vaccine.",
    category: "vaccines",
    rvu: 0.67,
    approxAllowableUsd: 26,
    commonIcd10Prefixes: ["Z23"],
    commonModifiers: [],
    plainLanguage: "Giving you a shot.",
  },

  // ── Cannabis certification ──
  {
    code: "S0610",
    shortDescription: "Cannabis cert eval",
    longDescription:
      "Annual gynecological exam — repurposed in-state to bill for medical-cannabis annual certification under state Medicaid plans that recognize HCPCS S-codes.",
    category: "cannabis_certification",
    rvu: 0,
    approxAllowableUsd: 0,
    commonIcd10Prefixes: ["Z79", "G89", "F41"],
    commonModifiers: [],
    plainLanguage: "Annual medical-cannabis certification visit.",
    documentationHint:
      "State-specific. Confirm payer accepts S0610 for cannabis certification before submitting.",
  },
];

// ---------------------------------------------------------------------------
// ICD-10 codebook (broad starter)
// ---------------------------------------------------------------------------

export const ICD10_CODEBOOK: ICD10Code[] = [
  // ── Wellness ──
  {
    code: "Z00.00",
    description: "Encounter for general adult medical examination without abnormal findings",
    chapter: "z_codes",
    synonyms: ["annual physical", "wellness exam", "well visit"],
    billable: true,
    plainLanguage: "A regular wellness check-up.",
  },
  {
    code: "Z23",
    description: "Encounter for immunization",
    chapter: "z_codes",
    synonyms: ["vaccine", "vaccination", "immunization"],
    billable: true,
    plainLanguage: "Visit to get a vaccine.",
  },
  {
    code: "Z79.891",
    description: "Long-term (current) use of opiate analgesic",
    chapter: "z_codes",
    synonyms: ["chronic opioid", "long-term opioid"],
    billable: true,
    plainLanguage: "On long-term opioid pain medicine.",
  },

  // ── Pain ──
  {
    code: "G89.29",
    description: "Other chronic pain",
    chapter: "nervous",
    synonyms: ["chronic pain", "long-standing pain"],
    billable: true,
    plainLanguage: "Long-lasting pain.",
    cannabisRelevant: true,
  },
  {
    code: "G89.0",
    description: "Central pain syndrome",
    chapter: "nervous",
    synonyms: ["central pain", "neuropathic pain"],
    billable: true,
    plainLanguage: "Pain caused by nerve damage.",
    cannabisRelevant: true,
  },
  {
    code: "M54.5",
    description: "Low back pain",
    chapter: "musculoskeletal",
    synonyms: ["low back pain", "lumbar pain", "lumbago"],
    billable: false,
    plainLanguage: "Lower-back pain.",
    cannabisRelevant: true,
  },
  {
    code: "M79.7",
    description: "Fibromyalgia",
    chapter: "musculoskeletal",
    synonyms: ["fibromyalgia", "fibro"],
    billable: true,
    plainLanguage: "Widespread muscle pain (fibromyalgia).",
    cannabisRelevant: true,
  },
  {
    code: "G43.909",
    description: "Migraine, unspecified, not intractable, without status migrainosus",
    chapter: "nervous",
    synonyms: ["migraine", "migraine headache"],
    billable: true,
    plainLanguage: "Migraine.",
    cannabisRelevant: true,
  },

  // ── Mental health ──
  {
    code: "F32.9",
    description: "Major depressive disorder, single episode, unspecified",
    chapter: "mental_behavioral",
    synonyms: ["depression", "MDD"],
    billable: true,
    plainLanguage: "Depression.",
    cannabisRelevant: true,
  },
  {
    code: "F33.1",
    description: "Major depressive disorder, recurrent, moderate",
    chapter: "mental_behavioral",
    synonyms: ["recurrent depression"],
    billable: true,
    plainLanguage: "Depression that comes back.",
    cannabisRelevant: true,
  },
  {
    code: "F41.1",
    description: "Generalized anxiety disorder",
    chapter: "mental_behavioral",
    synonyms: ["GAD", "anxiety", "generalized anxiety"],
    billable: true,
    plainLanguage: "Anxiety that's frequent and hard to control.",
    cannabisRelevant: true,
  },
  {
    code: "F43.10",
    description: "Post-traumatic stress disorder, unspecified",
    chapter: "mental_behavioral",
    synonyms: ["PTSD", "post-traumatic stress"],
    billable: true,
    plainLanguage: "Post-traumatic stress disorder.",
    cannabisRelevant: true,
  },
  {
    code: "F40.10",
    description: "Social phobia, unspecified",
    chapter: "mental_behavioral",
    synonyms: ["social anxiety"],
    billable: true,
    plainLanguage: "Social anxiety.",
    cannabisRelevant: true,
  },
  {
    code: "F31.10",
    description: "Bipolar disorder, current episode manic without psychotic features, unspecified",
    chapter: "mental_behavioral",
    synonyms: ["bipolar", "bipolar 1"],
    billable: true,
    plainLanguage: "Bipolar disorder (currently manic).",
  },
  {
    code: "F20.9",
    description: "Schizophrenia, unspecified",
    chapter: "mental_behavioral",
    synonyms: ["schizophrenia"],
    billable: true,
    plainLanguage: "Schizophrenia.",
  },

  // ── Sleep ──
  {
    code: "G47.00",
    description: "Insomnia, unspecified",
    chapter: "nervous",
    synonyms: ["insomnia", "trouble sleeping"],
    billable: true,
    plainLanguage: "Trouble falling/staying asleep.",
    cannabisRelevant: true,
  },
  {
    code: "G47.33",
    description: "Obstructive sleep apnea (adult) (pediatric)",
    chapter: "nervous",
    synonyms: ["sleep apnea", "OSA"],
    billable: true,
    plainLanguage: "Sleep apnea (breathing pauses during sleep).",
  },

  // ── Cardiometabolic ──
  {
    code: "I10",
    description: "Essential (primary) hypertension",
    chapter: "circulatory",
    synonyms: ["hypertension", "high blood pressure", "HTN"],
    billable: true,
    plainLanguage: "High blood pressure.",
  },
  {
    code: "E11.9",
    description: "Type 2 diabetes mellitus without complications",
    chapter: "endocrine_metabolic",
    synonyms: ["type 2 diabetes", "T2DM", "diabetes"],
    billable: true,
    plainLanguage: "Type 2 diabetes.",
  },
  {
    code: "E78.5",
    description: "Hyperlipidemia, unspecified",
    chapter: "endocrine_metabolic",
    synonyms: ["high cholesterol", "hyperlipidemia"],
    billable: true,
    plainLanguage: "High cholesterol.",
  },
  {
    code: "E66.9",
    description: "Obesity, unspecified",
    chapter: "endocrine_metabolic",
    synonyms: ["obesity"],
    billable: true,
    plainLanguage: "Obesity.",
  },

  // ── GI ──
  {
    code: "K58.9",
    description: "Irritable bowel syndrome without diarrhea",
    chapter: "digestive",
    synonyms: ["IBS"],
    billable: true,
    plainLanguage: "Irritable bowel syndrome.",
    cannabisRelevant: true,
  },
  {
    code: "K50.90",
    description: "Crohn's disease, unspecified, without complications",
    chapter: "digestive",
    synonyms: ["Crohn's", "Crohn disease"],
    billable: true,
    plainLanguage: "Crohn's disease.",
    cannabisRelevant: true,
  },
  {
    code: "K51.90",
    description: "Ulcerative colitis, unspecified, without complications",
    chapter: "digestive",
    synonyms: ["UC", "ulcerative colitis"],
    billable: true,
    plainLanguage: "Ulcerative colitis.",
    cannabisRelevant: true,
  },

  // ── Neuro ──
  {
    code: "G35",
    description: "Multiple sclerosis",
    chapter: "nervous",
    synonyms: ["MS", "multiple sclerosis"],
    billable: true,
    plainLanguage: "Multiple sclerosis.",
    cannabisRelevant: true,
  },
  {
    code: "G40.909",
    description: "Epilepsy, unspecified, not intractable, without status epilepticus",
    chapter: "nervous",
    synonyms: ["epilepsy", "seizures"],
    billable: true,
    plainLanguage: "Epilepsy.",
    cannabisRelevant: true,
  },

  // ── Substance use ──
  {
    code: "F12.20",
    description: "Cannabis dependence, uncomplicated",
    chapter: "mental_behavioral",
    synonyms: ["cannabis dependence", "marijuana dependence"],
    billable: true,
    plainLanguage: "Cannabis use disorder.",
  },
  {
    code: "F11.20",
    description: "Opioid dependence, uncomplicated",
    chapter: "mental_behavioral",
    synonyms: ["opioid dependence", "opioid use disorder"],
    billable: true,
    plainLanguage: "Opioid use disorder.",
  },
  {
    code: "F10.20",
    description: "Alcohol dependence, uncomplicated",
    chapter: "mental_behavioral",
    synonyms: ["alcohol use disorder", "alcoholism"],
    billable: true,
    plainLanguage: "Alcohol use disorder.",
  },

  // ── Symptoms / signs ──
  {
    code: "R51.9",
    description: "Headache, unspecified",
    chapter: "symptoms_signs",
    synonyms: ["headache"],
    billable: true,
    plainLanguage: "Headache.",
  },
  {
    code: "R11.2",
    description: "Nausea with vomiting, unspecified",
    chapter: "symptoms_signs",
    synonyms: ["nausea and vomiting"],
    billable: true,
    plainLanguage: "Feeling sick to your stomach.",
    cannabisRelevant: true,
  },
  {
    code: "R45.85",
    description: "Homicidal and suicidal ideations",
    chapter: "symptoms_signs",
    synonyms: ["suicidal ideation", "SI"],
    billable: true,
    plainLanguage: "Thoughts of harming oneself or others.",
  },

  // ── Pregnancy ──
  {
    code: "Z33.1",
    description: "Pregnant state, incidental",
    chapter: "z_codes",
    synonyms: ["pregnancy", "pregnant"],
    billable: true,
    plainLanguage: "Pregnant.",
  },

  // ── Cancer / palliative ──
  {
    code: "Z51.5",
    description: "Encounter for palliative care",
    chapter: "z_codes",
    synonyms: ["palliative care"],
    billable: true,
    plainLanguage: "Palliative care visit.",
    cannabisRelevant: true,
  },
  {
    code: "C80.1",
    description: "Malignant (primary) neoplasm, unspecified",
    chapter: "neoplasms",
    synonyms: ["cancer"],
    billable: true,
    plainLanguage: "Cancer (unspecified).",
    cannabisRelevant: true,
  },

  // ── Respiratory ──
  {
    code: "J45.909",
    description: "Unspecified asthma, uncomplicated",
    chapter: "respiratory",
    synonyms: ["asthma"],
    billable: true,
    plainLanguage: "Asthma.",
  },
  {
    code: "J44.9",
    description: "Chronic obstructive pulmonary disease, unspecified",
    chapter: "respiratory",
    synonyms: ["COPD"],
    billable: true,
    plainLanguage: "COPD (chronic obstructive pulmonary disease).",
  },

  // ── Skin ──
  {
    code: "L20.9",
    description: "Atopic dermatitis, unspecified",
    chapter: "skin",
    synonyms: ["eczema", "atopic dermatitis"],
    billable: true,
    plainLanguage: "Eczema.",
    cannabisRelevant: true,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const CPT_BY_CODE = new Map(CPT_CODEBOOK.map((c) => [c.code, c]));
const ICD_BY_CODE = new Map(ICD10_CODEBOOK.map((c) => [c.code, c]));

export function findCpt(code: string): CPTCode | undefined {
  return CPT_BY_CODE.get(code.toUpperCase());
}

export function findIcd(code: string): ICD10Code | undefined {
  return ICD_BY_CODE.get(code.toUpperCase());
}

export function searchCpt(query: string, limit = 20): CPTCode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CPT_CODEBOOK.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.shortDescription.toLowerCase().includes(q) ||
      c.longDescription.toLowerCase().includes(q),
  ).slice(0, limit);
}

export function searchIcd(query: string, limit = 20): ICD10Code[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ICD10_CODEBOOK.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.synonyms.some((s) => s.toLowerCase().includes(q)),
  ).slice(0, limit);
}

/** Pair-friendliness check used by the scrubber: does this CPT pair plausibly
 *  with these diagnoses? */
export function pairsCleanly(cptCode: string, icdCodes: string[]): boolean {
  const cpt = findCpt(cptCode);
  if (!cpt || cpt.commonIcd10Prefixes.length === 0) return true;
  return icdCodes.some((icd) =>
    cpt.commonIcd10Prefixes.some((prefix) => icd.toUpperCase().startsWith(prefix)),
  );
}

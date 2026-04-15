// Cannabis Therapeutics ICD-10 Mapping — EMR-146
// Maps conditions with cannabis therapeutic potential to ICD-10 codes.
// Evidence levels from Health Canada reference + peer-reviewed literature.

export type EvidenceLevel = "I" | "II" | "III" | "IV";

export interface TherapeuticIndication {
  condition: string;
  icd10: string;
  category: string;
  cannabinoids: string[];
  evidenceLevel: EvidenceLevel;
  evidenceSummary: string;
}

export const THERAPEUTIC_INDICATIONS: TherapeuticIndication[] = [
  // ── Nausea & Vomiting ─────────────────────────────
  { condition: "Chemotherapy-induced nausea and vomiting", icd10: "T45.1X5A", category: "Nausea/Vomiting", cannabinoids: ["THC", "CBD"], evidenceLevel: "I", evidenceSummary: "Strongest evidence. Nabilone and dronabinol FDA-approved. Multiple RCTs confirm efficacy." },
  { condition: "Nausea and vomiting, unspecified", icd10: "R11.2", category: "Nausea/Vomiting", cannabinoids: ["THC"], evidenceLevel: "II", evidenceSummary: "Moderate evidence for non-chemo nausea. THC effective as antiemetic." },

  // ── Pain ───────────────────────────────────────────
  { condition: "Chronic pain, unspecified", icd10: "G89.29", category: "Pain", cannabinoids: ["THC", "CBD"], evidenceLevel: "I", evidenceSummary: "Strong evidence from multiple systematic reviews. THC:CBD combinations most effective." },
  { condition: "Neuropathic pain", icd10: "G89.0", category: "Pain", cannabinoids: ["THC", "CBD"], evidenceLevel: "I", evidenceSummary: "Strong evidence. Nabiximols (Sativex) approved in multiple countries for MS-related neuropathic pain." },
  { condition: "Cancer pain", icd10: "G89.3", category: "Pain", cannabinoids: ["THC", "CBD"], evidenceLevel: "II", evidenceSummary: "Moderate evidence as adjunct to opioids. May reduce opioid dose requirements." },
  { condition: "Fibromyalgia", icd10: "M79.7", category: "Pain", cannabinoids: ["THC", "CBD", "CBG"], evidenceLevel: "III", evidenceSummary: "Limited but promising. Observational studies show symptom improvement." },
  { condition: "Low back pain, unspecified", icd10: "M54.5", category: "Pain", cannabinoids: ["THC", "CBD"], evidenceLevel: "III", evidenceSummary: "Limited evidence. Patient surveys report benefit; RCTs ongoing." },
  { condition: "Migraine, unspecified", icd10: "G43.909", category: "Pain", cannabinoids: ["THC", "CBD"], evidenceLevel: "III", evidenceSummary: "Emerging evidence. Retrospective studies show reduced frequency and severity." },
  { condition: "Arthritis, unspecified", icd10: "M13.9", category: "Pain", cannabinoids: ["CBD", "THC"], evidenceLevel: "III", evidenceSummary: "Topical CBD shows promise for joint pain. Oral THC:CBD for systemic inflammation." },

  // ── Spasticity ─────────────────────────────────────
  { condition: "Multiple sclerosis with spasticity", icd10: "G35", category: "Spasticity", cannabinoids: ["THC", "CBD"], evidenceLevel: "I", evidenceSummary: "Strong evidence. Nabiximols (Sativex) approved for MS spasticity in 25+ countries." },
  { condition: "Spinal cord injury with spasticity", icd10: "G95.89", category: "Spasticity", cannabinoids: ["THC", "CBD"], evidenceLevel: "II", evidenceSummary: "Moderate evidence extrapolated from MS data. Case series supportive." },

  // ── Epilepsy ───────────────────────────────────────
  { condition: "Lennox-Gastaut syndrome", icd10: "G40.812", category: "Epilepsy", cannabinoids: ["CBD"], evidenceLevel: "I", evidenceSummary: "Strong evidence. Epidiolex (CBD) FDA-approved. Phase III RCTs show 40%+ seizure reduction." },
  { condition: "Dravet syndrome", icd10: "G40.834", category: "Epilepsy", cannabinoids: ["CBD"], evidenceLevel: "I", evidenceSummary: "Strong evidence. Epidiolex FDA-approved. Significant seizure reduction in RCTs." },
  { condition: "Epilepsy, unspecified", icd10: "G40.909", category: "Epilepsy", cannabinoids: ["CBD"], evidenceLevel: "II", evidenceSummary: "Moderate evidence for treatment-resistant epilepsy. CBD as adjunct therapy." },

  // ── Mental Health ──────────────────────────────────
  { condition: "Generalized anxiety disorder", icd10: "F41.1", category: "Mental Health", cannabinoids: ["CBD", "CBG"], evidenceLevel: "II", evidenceSummary: "Moderate evidence for CBD anxiolytic effects. CBG emerging. Caution: THC can worsen anxiety." },
  { condition: "Post-traumatic stress disorder", icd10: "F43.10", category: "Mental Health", cannabinoids: ["THC", "CBD"], evidenceLevel: "II", evidenceSummary: "Moderate evidence. Low-dose THC may reduce nightmares. CBD for daytime anxiety." },
  { condition: "Major depressive disorder", icd10: "F32.9", category: "Mental Health", cannabinoids: ["CBD"], evidenceLevel: "III", evidenceSummary: "Limited evidence. Some observational data. THC may worsen depression at high doses." },
  { condition: "Insomnia", icd10: "G47.00", category: "Sleep", cannabinoids: ["THC", "CBN", "CBD"], evidenceLevel: "II", evidenceSummary: "Moderate evidence. THC reduces sleep latency. CBN mildly sedating. CBD may help at higher doses." },
  { condition: "Social anxiety disorder", icd10: "F40.10", category: "Mental Health", cannabinoids: ["CBD"], evidenceLevel: "II", evidenceSummary: "Moderate evidence. CBD 300-600mg shown to reduce anxiety in simulated public speaking." },

  // ── Appetite & Wasting ─────────────────────────────
  { condition: "Anorexia in AIDS/HIV", icd10: "B20", category: "Appetite/Wasting", cannabinoids: ["THC"], evidenceLevel: "I", evidenceSummary: "Strong evidence. Dronabinol FDA-approved for AIDS-related anorexia. Increases appetite and weight." },
  { condition: "Cachexia (wasting syndrome)", icd10: "R64", category: "Appetite/Wasting", cannabinoids: ["THC"], evidenceLevel: "II", evidenceSummary: "Moderate evidence in cancer cachexia. THC stimulates appetite via CB1 receptor." },
  { condition: "Anorexia nervosa", icd10: "F50.00", category: "Appetite/Wasting", cannabinoids: ["THC"], evidenceLevel: "IV", evidenceSummary: "Limited case reports only. Not established. Requires specialist oversight." },

  // ── Inflammatory Conditions ────────────────────────
  { condition: "Crohn's disease", icd10: "K50.90", category: "GI/Inflammatory", cannabinoids: ["CBD", "THC"], evidenceLevel: "II", evidenceSummary: "Moderate evidence. CBD anti-inflammatory. Small RCTs show symptom improvement." },
  { condition: "Ulcerative colitis", icd10: "K51.90", category: "GI/Inflammatory", cannabinoids: ["CBD", "THC"], evidenceLevel: "III", evidenceSummary: "Limited evidence. CBD may reduce intestinal inflammation. Studies ongoing." },
  { condition: "Irritable bowel syndrome", icd10: "K58.9", category: "GI/Inflammatory", cannabinoids: ["CBD"], evidenceLevel: "III", evidenceSummary: "Limited evidence. ECS modulation of gut motility. Patient surveys supportive." },
  { condition: "Rheumatoid arthritis", icd10: "M06.9", category: "GI/Inflammatory", cannabinoids: ["CBD", "THC"], evidenceLevel: "III", evidenceSummary: "Limited evidence. Nabiximols showed benefit in one small RCT. Anti-inflammatory mechanism." },

  // ── Palliative Care ────────────────────────────────
  { condition: "Palliative care encounter", icd10: "Z51.5", category: "Palliative", cannabinoids: ["THC", "CBD"], evidenceLevel: "II", evidenceSummary: "Moderate evidence for symptom management: pain, nausea, appetite, anxiety, sleep." },
  { condition: "Malignant neoplasm, unspecified", icd10: "C80.1", category: "Palliative", cannabinoids: ["THC", "CBD"], evidenceLevel: "II", evidenceSummary: "Evidence for symptom palliation. No evidence for anti-tumor effects in humans." },

  // ── Other ──────────────────────────────────────────
  { condition: "Glaucoma", icd10: "H40.9", category: "Other", cannabinoids: ["THC"], evidenceLevel: "III", evidenceSummary: "THC reduces IOP but effect is short-lived (3-4h). Not first-line. Standard treatments preferred." },
  { condition: "Tourette syndrome", icd10: "F95.2", category: "Other", cannabinoids: ["THC"], evidenceLevel: "III", evidenceSummary: "Limited evidence. Small studies suggest THC may reduce tics. More research needed." },
  { condition: "Alcohol use disorder", icd10: "F10.20", category: "Other", cannabinoids: ["CBD"], evidenceLevel: "IV", evidenceSummary: "Preclinical data promising. Human studies limited. CBD may reduce craving." },
  { condition: "Opioid use disorder", icd10: "F11.20", category: "Other", cannabinoids: ["CBD"], evidenceLevel: "IV", evidenceSummary: "Early evidence CBD reduces cue-induced craving. Not a replacement for MAT." },
  { condition: "Nicotine dependence", icd10: "F17.210", category: "Other", cannabinoids: ["CBD"], evidenceLevel: "III", evidenceSummary: "One RCT showed CBD inhaler reduced cigarette consumption by 40%." },
  { condition: "Obesity", icd10: "E66.9", category: "Other", cannabinoids: ["THCV"], evidenceLevel: "IV", evidenceSummary: "THCV may suppress appetite at low doses. Very early research." },
  { condition: "Type 2 diabetes", icd10: "E11.9", category: "Other", cannabinoids: ["THCV", "CBD"], evidenceLevel: "IV", evidenceSummary: "THCV may improve glycemic control. Preclinical. Phase II trials initiated." },
];

// CPT codes for cannabis counseling visits
export const CANNABIS_CPT_CODES = [
  { code: "99213", description: "Office visit, established patient, low complexity", typical: "Follow-up cannabis dosing adjustment, 15-20 min" },
  { code: "99214", description: "Office visit, established patient, moderate complexity", typical: "Cannabis initiation with full assessment, 25-35 min" },
  { code: "99215", description: "Office visit, established patient, high complexity", typical: "Complex cannabis case with multiple comorbidities, 40+ min" },
  { code: "99242", description: "Office consultation, straightforward", typical: "Cannabis consultation for pain management referral" },
  { code: "99243", description: "Office consultation, low complexity", typical: "Cannabis consultation with review of prior treatments" },
  { code: "99401", description: "Preventive medicine counseling, 15 min", typical: "Cannabis risk/benefit counseling" },
  { code: "99402", description: "Preventive medicine counseling, 30 min", typical: "Extended cannabis education and safety counseling" },
  { code: "96160", description: "Health risk assessment instrument", typical: "Cannabis use screening tool administration" },
  { code: "96127", description: "Brief emotional/behavioral assessment", typical: "PHQ-9/GAD-7 with cannabis therapy monitoring" },
];

// Lookup helpers
export function findIndicationsByCondition(query: string): TherapeuticIndication[] {
  const q = query.toLowerCase();
  return THERAPEUTIC_INDICATIONS.filter((ind) =>
    ind.condition.toLowerCase().includes(q) ||
    ind.icd10.toLowerCase().includes(q) ||
    ind.category.toLowerCase().includes(q)
  );
}

export function findIndicationsByCannabinoid(cannabinoid: string): TherapeuticIndication[] {
  const q = cannabinoid.toUpperCase();
  return THERAPEUTIC_INDICATIONS.filter((ind) =>
    ind.cannabinoids.includes(q)
  );
}

export function findIndicationsByEvidence(level: EvidenceLevel): TherapeuticIndication[] {
  return THERAPEUTIC_INDICATIONS.filter((ind) => ind.evidenceLevel === level);
}

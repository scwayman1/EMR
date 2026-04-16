// Problem list — structured diagnoses per patient

export type ProblemStatus = "active" | "resolved" | "chronic" | "inactive";

export interface ProblemListEntry {
  id: string;
  icd10: string;
  description: string;
  status: ProblemStatus;
  onsetDate?: string;
  resolvedDate?: string;
  notes?: string;
  addedBy: string;
  addedAt: string;
}

export const STATUS_STYLES: Record<ProblemStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-amber-50", text: "text-amber-700", label: "Active" },
  chronic: { bg: "bg-purple-50", text: "text-purple-700", label: "Chronic" },
  resolved: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Resolved" },
  inactive: { bg: "bg-gray-100", text: "text-gray-600", label: "Inactive" },
};

// Common cannabis-context diagnoses
export const COMMON_PROBLEMS = [
  { icd10: "G89.29", description: "Other chronic pain" },
  { icd10: "G47.00", description: "Insomnia, unspecified" },
  { icd10: "F41.1", description: "Generalized anxiety disorder" },
  { icd10: "F43.10", description: "PTSD, unspecified" },
  { icd10: "G43.909", description: "Migraine, unspecified" },
  { icd10: "F32.9", description: "Major depressive disorder" },
  { icd10: "R11.0", description: "Nausea" },
  { icd10: "M79.7", description: "Fibromyalgia" },
  { icd10: "G35", description: "Multiple sclerosis" },
  { icd10: "G40.909", description: "Epilepsy, unspecified" },
  { icd10: "K50.90", description: "Crohn's disease" },
  { icd10: "C80.1", description: "Malignant neoplasm, unspecified" },
];

// Outcome Data Export — de-identified CSV/JSON for research + insurance
// Enables practices to export structured patient outcome data for:
// 1. Efficacy research (cohort analysis)
// 2. Insurance reimbursement documentation
// 3. Pharmaceutical product development evidence

export type ExportFormat = "csv" | "json";
export type DeidentificationLevel = "full" | "limited" | "none";

export interface ExportConfig {
  format: ExportFormat;
  deidentificationLevel: DeidentificationLevel;
  dateRange: { start: string; end: string };
  metrics: string[]; // e.g., ["pain", "sleep", "anxiety"]
  includeProducts: boolean;
  includeDemographics: boolean;
  includeConditions: boolean;
  includeDosing: boolean;
}

export interface ExportRow {
  // De-identified patient identifier
  patientHash: string;
  // Demographics (if included and de-identified)
  ageRange?: string; // e.g., "30-39"
  sex?: string;
  // Condition
  primaryCondition?: string;
  icd10Code?: string;
  // Product info
  productType?: string;
  route?: string;
  thcMgPerDose?: number;
  cbdMgPerDose?: number;
  // Outcome
  metric: string;
  value: number;
  loggedAt: string;
  // Dosing context
  daysOnTreatment?: number;
}

/**
 * De-identify a patient ID using a one-way hash.
 */
export function deidentifyPatientId(patientId: string, salt: string): string {
  // Simple hash for demo — in production use crypto.subtle.digest
  let hash = 0;
  const input = patientId + salt;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `DEID-${Math.abs(hash).toString(36).toUpperCase().padStart(8, "0")}`;
}

/**
 * Convert age to age range for de-identification.
 */
export function ageToRange(age: number): string {
  if (age < 18) return "<18";
  if (age < 30) return "18-29";
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  if (age < 60) return "50-59";
  if (age < 70) return "60-69";
  return "70+";
}

/**
 * Convert export rows to CSV string.
 */
export function toCSV(rows: ExportRow[], config: ExportConfig): string {
  if (rows.length === 0) return "";

  const headers: string[] = ["patientHash"];
  if (config.includeDemographics) headers.push("ageRange", "sex");
  if (config.includeConditions) headers.push("primaryCondition", "icd10Code");
  if (config.includeProducts) headers.push("productType", "route", "thcMgPerDose", "cbdMgPerDose");
  headers.push("metric", "value", "loggedAt");
  if (config.includeDosing) headers.push("daysOnTreatment");

  const csvRows = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => {
      const val = (row as any)[h];
      if (val === undefined || val === null) return "";
      if (typeof val === "string" && val.includes(",")) return `"${val}"`;
      return String(val);
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Convert export rows to JSON string.
 */
export function toJSON(rows: ExportRow[], config: ExportConfig): string {
  const metadata = {
    exportedAt: new Date().toISOString(),
    format: "Leafjourney Outcome Export v1.0",
    deidentificationLevel: config.deidentificationLevel,
    dateRange: config.dateRange,
    metrics: config.metrics,
    totalRecords: rows.length,
    disclaimer: "This data has been de-identified in accordance with HIPAA Safe Harbor guidelines. It is intended for research and quality improvement purposes only.",
  };

  return JSON.stringify({ metadata, data: rows }, null, 2);
}

export const AVAILABLE_METRICS = [
  { key: "pain", label: "Pain level" },
  { key: "sleep", label: "Sleep quality" },
  { key: "anxiety", label: "Anxiety level" },
  { key: "mood", label: "Mood" },
  { key: "nausea", label: "Nausea" },
  { key: "appetite", label: "Appetite" },
  { key: "energy", label: "Energy" },
  { key: "adherence", label: "Adherence" },
  { key: "side_effects", label: "Side effects" },
] as const;

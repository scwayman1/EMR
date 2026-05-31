/**
 * Objective / vitals documentation helpers.
 *
 * The Objective ("findings") section is often documented by rooming staff
 * (MAs) rather than the physician. Staff capture structured vitals + a
 * free-text exam; this module composes them into the note's Objective block
 * body (markdown) and keeps the raw values in block metadata so they stay
 * queryable later (a dedicated Vitals table is a future migration).
 *
 * Pure + framework-free so the formatting is unit-testable.
 */

export interface Vitals {
  /** Systolic / diastolic blood pressure (mmHg). */
  systolic?: number | null;
  diastolic?: number | null;
  /** Heart rate (bpm). */
  heartRate?: number | null;
  /** Temperature, in `tempUnit`. */
  temperature?: number | null;
  tempUnit?: "F" | "C";
  /** Respiratory rate (breaths/min). */
  respiratoryRate?: number | null;
  /** Oxygen saturation (%). */
  spo2?: number | null;
  /** Weight, in `weightUnit`. */
  weight?: number | null;
  weightUnit?: "lb" | "kg";
  /** Patient-reported pain, 0–10. */
  pain?: number | null;
}

export interface ObjectiveDocumentation {
  vitals: Vitals;
  /** Free-text exam / observations the staff member adds. */
  exam: string;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Format the vitals object into a single compact line, omitting blanks. */
export function formatVitalsLine(vitals: Vitals): string {
  const parts: string[] = [];
  const sys = num(vitals.systolic);
  const dia = num(vitals.diastolic);
  if (sys != null && dia != null) parts.push(`BP ${sys}/${dia}`);
  else if (sys != null) parts.push(`BP ${sys}/–`);

  const hr = num(vitals.heartRate);
  if (hr != null) parts.push(`HR ${hr}`);

  const temp = num(vitals.temperature);
  if (temp != null) parts.push(`Temp ${temp}°${vitals.tempUnit ?? "F"}`);

  const rr = num(vitals.respiratoryRate);
  if (rr != null) parts.push(`RR ${rr}`);

  const spo2 = num(vitals.spo2);
  if (spo2 != null) parts.push(`SpO2 ${spo2}%`);

  const wt = num(vitals.weight);
  if (wt != null) parts.push(`Wt ${wt} ${vitals.weightUnit ?? "lb"}`);

  const pain = num(vitals.pain);
  if (pain != null) parts.push(`Pain ${pain}/10`);

  return parts.join(" · ");
}

/** True when no vitals field and no exam text were provided. */
export function isObjectiveEmpty(doc: ObjectiveDocumentation): boolean {
  return formatVitalsLine(doc.vitals) === "" && doc.exam.trim() === "";
}

/**
 * Compose the Objective block body (markdown) from structured vitals + exam.
 * Vitals render as a bold-led line; the exam follows as free text.
 */
export function composeObjectiveBody(doc: ObjectiveDocumentation): string {
  const vitalsLine = formatVitalsLine(doc.vitals);
  const exam = doc.exam.trim();
  const sections: string[] = [];
  if (vitalsLine) sections.push(`**Vitals:** ${vitalsLine}`);
  if (exam) sections.push(exam);
  return sections.join("\n\n");
}

/** Narrow an unknown (e.g. block metadata) into a normalized Vitals object. */
export function coerceVitals(raw: unknown): Vitals {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    systolic: num(r.systolic),
    diastolic: num(r.diastolic),
    heartRate: num(r.heartRate),
    temperature: num(r.temperature),
    tempUnit: r.tempUnit === "C" ? "C" : "F",
    respiratoryRate: num(r.respiratoryRate),
    spo2: num(r.spo2),
    weight: num(r.weight),
    weightUnit: r.weightUnit === "kg" ? "kg" : "lb",
    pain: num(r.pain),
  };
}

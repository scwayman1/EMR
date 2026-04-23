// Dose Calendar — visual dose tracking for patients
// Calendar-based view of medication adherence using DoseLog model.

export interface DoseCalendarEntry {
  date: string; // ISO date
  regimen: string; // product name
  scheduledDoses: number;
  takenDoses: number;
  adherencePercent: number;
  doses: {
    time: string;
    taken: boolean;
    amount?: number;
    unit?: string;
    notes?: string;
  }[];
}

export type AdherenceLevel = "perfect" | "good" | "partial" | "missed";

export function getAdherenceLevel(percent: number): AdherenceLevel {
  if (percent >= 100) return "perfect";
  if (percent >= 75) return "good";
  if (percent > 0) return "partial";
  return "missed";
}

export const ADHERENCE_COLORS: Record<AdherenceLevel, { bg: string; text: string; ring: string }> = {
  perfect: { bg: "bg-emerald-500", text: "text-white", ring: "ring-emerald-300" },
  good: { bg: "bg-emerald-200", text: "text-emerald-800", ring: "ring-emerald-200" },
  partial: { bg: "bg-amber-200", text: "text-amber-800", ring: "ring-amber-200" },
  missed: { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-200" },
};

/**
 * Generate a month of demo calendar data.
 */
export function generateDemoMonth(year: number, month: number, regimenName: string, dosesPerDay: number): DoseCalendarEntry[] {
  const entries: DoseCalendarEntry[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (date > today) break; // Don't generate future entries

    const dateStr = date.toISOString().slice(0, 10);
    // Simulate realistic adherence (85% overall, some missed days)
    const rand = Math.random();
    let takenDoses: number;
    if (rand > 0.85) takenDoses = 0; // 15% chance fully missed
    else if (rand > 0.70) takenDoses = Math.max(1, dosesPerDay - 1); // partial
    else takenDoses = dosesPerDay; // taken all

    const times = Array.from({ length: dosesPerDay }, (_, i) => {
      const hour = 8 + Math.floor((12 / dosesPerDay) * i);
      return `${hour.toString().padStart(2, "0")}:00`;
    });

    entries.push({
      date: dateStr,
      regimen: regimenName,
      scheduledDoses: dosesPerDay,
      takenDoses,
      adherencePercent: Math.round((takenDoses / dosesPerDay) * 100),
      doses: times.map((time, i) => ({
        time,
        taken: i < takenDoses,
        amount: 10,
        unit: "mg",
      })),
    });
  }

  return entries;
}

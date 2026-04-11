/**
 * USPSTF A and B grade recommended preventive screenings (EMR-070).
 *
 * Simplified version for the demo — covers the major screens every
 * primary care physician should be reminded about at the point of care.
 *
 * Each screening has an emoji so the reminder chips render as a
 * visual checklist on the patient chart and in the AI fairytale
 * summary the patient can take to other providers.
 */

export interface Screening {
  id: string;
  label: string;
  emoji: string;
  grade: "A" | "B";
  frequency: string;
  /**
   * Returns true if this patient is currently "due" for the screening.
   * The demo implementation only checks age and sex.
   */
  isDue: (age: number | null, sex: string | null) => boolean;
  description: string;
}

const isFemale = (s: string | null) =>
  s?.toLowerCase().startsWith("f") || s?.toLowerCase() === "female";
const isMale = (s: string | null) =>
  s?.toLowerCase().startsWith("m") || s?.toLowerCase() === "male";

export const SCREENINGS: Screening[] = [
  {
    id: "colonoscopy",
    label: "Colonoscopy",
    emoji: "🧪",
    grade: "A",
    frequency: "Every 10 years",
    isDue: (age) => (age ?? 0) >= 45 && (age ?? 0) <= 75,
    description: "Colorectal cancer screening, ages 45–75.",
  },
  {
    id: "mammogram",
    label: "Mammogram",
    emoji: "🎀",
    grade: "B",
    frequency: "Every 2 years",
    isDue: (age, sex) =>
      isFemale(sex) && (age ?? 0) >= 40 && (age ?? 0) <= 74,
    description: "Breast cancer screening, biennial for women 40–74.",
  },
  {
    id: "pap-smear",
    label: "Pap Smear / Cervical",
    emoji: "🌸",
    grade: "A",
    frequency: "Every 3–5 years",
    isDue: (age, sex) =>
      isFemale(sex) && (age ?? 0) >= 21 && (age ?? 0) <= 65,
    description: "Cervical cancer screening, ages 21–65.",
  },
  {
    id: "dexa",
    label: "DEXA Bone Density",
    emoji: "🦴",
    grade: "B",
    frequency: "Every 2 years",
    isDue: (age, sex) => isFemale(sex) && (age ?? 0) >= 65,
    description: "Osteoporosis screening for women 65+.",
  },
  {
    id: "lung-ct",
    label: "Low-Dose CT Chest",
    emoji: "🫁",
    grade: "B",
    frequency: "Annually",
    isDue: (age) => (age ?? 0) >= 50 && (age ?? 0) <= 80,
    description:
      "Lung cancer screening for current/former smokers 50–80 with 20+ pack-year history.",
  },
  {
    id: "aaa",
    label: "AAA Ultrasound",
    emoji: "🔎",
    grade: "B",
    frequency: "One-time",
    isDue: (age, sex) =>
      isMale(sex) && (age ?? 0) >= 65 && (age ?? 0) <= 75,
    description: "Abdominal aortic aneurysm screening, men 65–75 who smoked.",
  },
  {
    id: "diabetes",
    label: "Diabetes Screening",
    emoji: "🩸",
    grade: "B",
    frequency: "Every 3 years",
    isDue: (age) => (age ?? 0) >= 35 && (age ?? 0) <= 70,
    description: "Type 2 diabetes screening, adults 35–70 overweight/obese.",
  },
  {
    id: "bp",
    label: "Blood Pressure",
    emoji: "💓",
    grade: "A",
    frequency: "Annually",
    isDue: (age) => (age ?? 0) >= 18,
    description: "Hypertension screening for all adults 18+.",
  },
  {
    id: "depression",
    label: "Depression Screening",
    emoji: "🌧️",
    grade: "B",
    frequency: "Annually",
    isDue: (age) => (age ?? 0) >= 12,
    description: "Depression screening for adolescents and adults.",
  },
  {
    id: "hep-c",
    label: "Hepatitis C",
    emoji: "💊",
    grade: "B",
    frequency: "One-time",
    isDue: (age) => (age ?? 0) >= 18 && (age ?? 0) <= 79,
    description: "One-time Hep C screening for adults 18–79.",
  },
  {
    id: "tobacco",
    label: "Tobacco Cessation",
    emoji: "🚭",
    grade: "A",
    frequency: "Every visit",
    isDue: (age) => (age ?? 0) >= 18,
    description: "Tobacco cessation counseling for all adult smokers.",
  },
  {
    id: "statin",
    label: "Statin Preventive",
    emoji: "❤️",
    grade: "B",
    frequency: "Assessment",
    isDue: (age) => (age ?? 0) >= 40 && (age ?? 0) <= 75,
    description: "Low-dose statin for CVD prevention, adults 40–75 with risk factors.",
  },
];

/**
 * Return the list of screenings the patient is currently due for.
 */
export function dueScreenings(
  age: number | null,
  sex: string | null,
): Screening[] {
  return SCREENINGS.filter((s) => s.isDue(age, sex));
}

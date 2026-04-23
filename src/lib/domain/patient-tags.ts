// Patient tags — colored labels for clinician workflow

export interface PatientTag {
  id: string;
  label: string;
  color: "emerald" | "blue" | "amber" | "red" | "purple" | "teal" | "rose" | "gray";
  description?: string;
}

export const DEFAULT_TAGS: PatientTag[] = [
  { id: "t-vip", label: "VIP", color: "amber", description: "Priority patient" },
  { id: "t-complex", label: "Complex case", color: "purple", description: "Multi-condition, high touch" },
  { id: "t-cancer", label: "Oncology", color: "rose", description: "Cancer-related care" },
  { id: "t-pain", label: "Chronic pain", color: "red", description: "Pain-focused treatment" },
  { id: "t-anxiety", label: "Anxiety", color: "blue", description: "Anxiety-focused care" },
  { id: "t-sleep", label: "Sleep", color: "teal", description: "Insomnia care" },
  { id: "t-new", label: "New patient", color: "emerald", description: "First 30 days" },
  { id: "t-research", label: "Research participant", color: "purple" },
  { id: "t-compassion", label: "Compassion pricing", color: "gray", description: "Financial assistance" },
];

export const TAG_COLOR_CLASSES: Record<PatientTag["color"], string> = {
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
};

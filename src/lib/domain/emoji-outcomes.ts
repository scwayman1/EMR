// Emoji Outcome Logging — per-product, per-dose data collection
// Dr. Patel Directive: Simple, fun, enjoyable. Emojis + scales.
// Every interaction = a data point for research, reimbursement, product dev.

export type EmojiRating = "great" | "good" | "neutral" | "bad" | "terrible";

export interface EmojiOption {
  value: EmojiRating;
  emoji: string;
  label: string;
  color: string;
}

export const EMOJI_OPTIONS: EmojiOption[] = [
  { value: "terrible", emoji: "😫", label: "Terrible", color: "bg-red-100 border-red-300 text-red-700" },
  { value: "bad", emoji: "😟", label: "Not great", color: "bg-orange-100 border-orange-300 text-orange-700" },
  { value: "neutral", emoji: "😐", label: "No change", color: "bg-gray-100 border-gray-300 text-gray-600" },
  { value: "good", emoji: "😊", label: "Good", color: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  { value: "great", emoji: "🤩", label: "Amazing", color: "bg-emerald-200 border-emerald-400 text-emerald-800" },
];

export type QuickScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface ScaleDefinition {
  metric: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  lowEmoji: string;
  highEmoji: string;
  description: string;
}

export const OUTCOME_SCALES: ScaleDefinition[] = [
  { metric: "pain", label: "Pain relief", lowLabel: "No relief", highLabel: "Complete relief", lowEmoji: "😣", highEmoji: "😌", description: "How much did this dose help your pain?" },
  { metric: "sleep", label: "Sleep quality", lowLabel: "Couldn't sleep", highLabel: "Best sleep ever", lowEmoji: "😩", highEmoji: "😴", description: "How well did you sleep after this dose?" },
  { metric: "anxiety", label: "Calm level", lowLabel: "Very anxious", highLabel: "Totally calm", lowEmoji: "😰", highEmoji: "🧘", description: "How calm do you feel?" },
  { metric: "mood", label: "Mood", lowLabel: "Very low", highLabel: "Great mood", lowEmoji: "😢", highEmoji: "😄", description: "How's your mood right now?" },
  { metric: "energy", label: "Energy", lowLabel: "Exhausted", highLabel: "Energized", lowEmoji: "🫠", highEmoji: "⚡", description: "How's your energy level?" },
  { metric: "appetite", label: "Appetite", lowLabel: "No appetite", highLabel: "Healthy appetite", lowEmoji: "🤢", highEmoji: "🍽️", description: "How's your appetite?" },
  { metric: "focus", label: "Focus", lowLabel: "Can't concentrate", highLabel: "Laser focused", lowEmoji: "🌫️", highEmoji: "🎯", description: "How focused do you feel?" },
  { metric: "nausea", label: "Nausea", lowLabel: "Very nauseous", highLabel: "No nausea", lowEmoji: "🤮", highEmoji: "👍", description: "Any nausea?" },
];

// ── Side effect quick-picks ────────────────────────────

export interface SideEffectOption {
  id: string;
  label: string;
  emoji: string;
}

export const SIDE_EFFECT_OPTIONS: SideEffectOption[] = [
  { id: "none", label: "No side effects", emoji: "✅" },
  { id: "dry_mouth", label: "Dry mouth", emoji: "🏜️" },
  { id: "drowsy", label: "Drowsy", emoji: "😴" },
  { id: "dizzy", label: "Dizzy", emoji: "💫" },
  { id: "anxious", label: "Anxious", emoji: "😰" },
  { id: "hungry", label: "Extra hungry", emoji: "🍕" },
  { id: "headache", label: "Headache", emoji: "🤕" },
  { id: "dry_eyes", label: "Dry eyes", emoji: "👁️" },
  { id: "nausea", label: "Nausea", emoji: "🤢" },
  { id: "paranoia", label: "Paranoia", emoji: "😨" },
  { id: "foggy", label: "Brain fog", emoji: "🌫️" },
  { id: "euphoric", label: "Euphoric", emoji: "🥳" },
];

// ── Quick dose log structure ───────────────────────────

export interface QuickDoseLog {
  productName: string;
  productId?: string;
  doseAmount: number;
  doseUnit: string;
  route: string;
  timestamp: string;
  overallFeeling: EmojiRating;
  scales: { metric: string; value: number }[];
  sideEffects: string[];
  notes?: string;
}

// ── Suggested prompts for check-in ─────────────────────

export const CHECK_IN_PROMPTS = [
  "How are you feeling after your dose?",
  "Quick check — how did that work for you?",
  "Rate your experience",
  "How's it going?",
  "Time for a quick check-in",
] as const;

export function getRandomPrompt(): string {
  return CHECK_IN_PROMPTS[Math.floor(Math.random() * CHECK_IN_PROMPTS.length)];
}

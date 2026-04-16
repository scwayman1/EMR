// Wellness Journal & Community
// Patient-facing journal (private) + community check-ins (anonymized peer support).

export type MoodEmoji = "😊" | "😐" | "😔" | "😤" | "😰" | "🙏" | "💪" | "🌱" | "🔥" | "💤";

export interface JournalEntry {
  id: string;
  patientId: string;
  mood: MoodEmoji;
  body: string;
  tags: string[];
  isPrivate: boolean;
  createdAt: string;
}

export const MOOD_OPTIONS: { emoji: MoodEmoji; label: string }[] = [
  { emoji: "😊", label: "Great" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Down" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😰", label: "Anxious" },
  { emoji: "🙏", label: "Grateful" },
  { emoji: "💪", label: "Strong" },
  { emoji: "🌱", label: "Growing" },
  { emoji: "🔥", label: "Energized" },
  { emoji: "💤", label: "Tired" },
];

// ── Community check-ins (anonymized) ────────────────────

export type CommunityCategory = "sleep" | "pain" | "anxiety" | "general" | "product_share" | "support";

export interface CommunityPost {
  id: string;
  anonymousHandle: string; // e.g., "Blue Forest #123"
  category: CommunityCategory;
  body: string;
  supportCount: number;
  replyCount: number;
  createdAt: string;
  isClinicianReplied: boolean;
}

export const CATEGORY_LABELS: Record<CommunityCategory, { label: string; emoji: string }> = {
  sleep: { label: "Sleep", emoji: "😴" },
  pain: { label: "Pain", emoji: "🌤️" },
  anxiety: { label: "Anxiety", emoji: "🧘" },
  general: { label: "General", emoji: "💬" },
  product_share: { label: "Product tips", emoji: "🌿" },
  support: { label: "Support", emoji: "🤗" },
};

/**
 * Generate an anonymous handle for a patient.
 * Deterministic — same patientId always produces the same handle.
 */
export function generateHandle(patientId: string): string {
  const colors = ["Blue", "Green", "Amber", "Rose", "Teal", "Indigo", "Coral", "Sage", "Violet", "Copper"];
  const nouns = ["Forest", "River", "Mountain", "Meadow", "Garden", "Orchard", "Grove", "Valley", "Field", "Trail"];

  let hash = 0;
  for (let i = 0; i < patientId.length; i++) {
    hash = ((hash << 5) - hash) + patientId.charCodeAt(i);
    hash = hash & hash;
  }
  hash = Math.abs(hash);

  const color = colors[hash % colors.length];
  const noun = nouns[Math.floor(hash / colors.length) % nouns.length];
  const num = (hash % 899) + 100;

  return `${color} ${noun} #${num}`;
}

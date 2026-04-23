import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { TerpenesView, type Terpene, type Correlation } from "./terpenes-view";

export const metadata = { title: "Terpene Efficacy Tracker" };

const TERPENES: Terpene[] = [
  {
    name: "Myrcene",
    emoji: "🥭",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    avgImprovementPct: 42,
    patients: 318,
    effects: ["Sedating", "Muscle relaxant", "Analgesic"],
    aroma: "Earthy, musky, herbal",
  },
  {
    name: "Limonene",
    emoji: "🍋",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    avgImprovementPct: 39,
    patients: 284,
    effects: ["Uplifting", "Anti-anxiety", "Mood enhancing"],
    aroma: "Citrus, lemon",
  },
  {
    name: "Pinene",
    emoji: "🌲",
    color: "bg-green-100 text-green-800 border-green-300",
    avgImprovementPct: 34,
    patients: 196,
    effects: ["Alertness", "Memory retention", "Anti-inflammatory"],
    aroma: "Pine, fresh forest",
  },
  {
    name: "Linalool",
    emoji: "💜",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    avgImprovementPct: 44,
    patients: 241,
    effects: ["Calming", "Anxiolytic", "Sleep aid"],
    aroma: "Floral, lavender",
  },
  {
    name: "Caryophyllene",
    emoji: "🌶️",
    color: "bg-red-100 text-red-800 border-red-300",
    avgImprovementPct: 41,
    patients: 262,
    effects: ["Anti-inflammatory", "Analgesic", "Gastro-protective"],
    aroma: "Peppery, spicy, woody",
  },
  {
    name: "Humulene",
    emoji: "🍺",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    avgImprovementPct: 31,
    patients: 142,
    effects: ["Appetite suppressant", "Anti-bacterial", "Anti-inflammatory"],
    aroma: "Hoppy, earthy",
  },
  {
    name: "Terpinolene",
    emoji: "🌸",
    color: "bg-pink-100 text-pink-800 border-pink-300",
    avgImprovementPct: 36,
    patients: 118,
    effects: ["Uplifting", "Antioxidant", "Sedating at high dose"],
    aroma: "Fruity, floral, herbal",
  },
];

const OUTCOMES = ["Pain", "Sleep", "Anxiety", "Mood", "Nausea"];

// rows = terpenes, columns = outcomes; value 0-100 = correlation strength
const CORRELATIONS: Correlation[] = [
  { terpene: "Myrcene",       values: [72, 78, 48, 36, 44] },
  { terpene: "Limonene",      values: [38, 32, 81, 76, 58] },
  { terpene: "Pinene",        values: [42, 24, 52, 68, 28] },
  { terpene: "Linalool",      values: [48, 82, 88, 52, 32] },
  { terpene: "Caryophyllene", values: [84, 38, 56, 42, 38] },
  { terpene: "Humulene",      values: [48, 28, 34, 36, 56] },
  { terpene: "Terpinolene",   values: [34, 46, 58, 72, 38] },
];

export default async function TerpenesPage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="Terpene Efficacy Tracker"
        description="Which terpenes correlate with which clinical outcomes in your patient cohort. Associations reflect self-reported outcome improvement while a patient's regimen contained the terpene."
      />
      <TerpenesView
        terpenes={TERPENES}
        correlations={CORRELATIONS}
        outcomes={OUTCOMES}
      />
    </PageShell>
  );
}

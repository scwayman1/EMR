import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { AtlasView, type Condition } from "./atlas-view";

export const metadata = { title: "Condition Outcome Atlas" };

const CONDITIONS: Condition[] = [
  {
    id: "chronic-pain",
    name: "Chronic Pain",
    emoji: "🩹",
    icd10: "G89.4",
    patients: 412,
    avgImprovementPct: 38,
    topProduct: "Balanced 1:1 Tincture",
    products: [
      { name: "Balanced 1:1 Tincture", usage: 162, improvement: 42 },
      { name: "CBD-dominant Capsule", usage: 108, improvement: 34 },
      { name: "Indica Flower 20% THC", usage: 82, improvement: 36 },
      { name: "Topical Salve 500mg", usage: 60, improvement: 29 },
    ],
    distribution: [38, 22, 18, 12, 10],
  },
  {
    id: "insomnia",
    name: "Insomnia",
    emoji: "😴",
    icd10: "G47.00",
    patients: 318,
    avgImprovementPct: 47,
    topProduct: "Indica Gummy CBN 5mg",
    products: [
      { name: "Indica Gummy CBN 5mg", usage: 142, improvement: 54 },
      { name: "Night Tincture 2:1 THC:CBN", usage: 98, improvement: 48 },
      { name: "Indica Flower Northern Lights", usage: 48, improvement: 39 },
      { name: "CBD Nightcap Capsule", usage: 30, improvement: 32 },
    ],
    distribution: [48, 26, 14, 8, 4],
  },
  {
    id: "anxiety",
    name: "Anxiety",
    emoji: "😰",
    icd10: "F41.1",
    patients: 279,
    avgImprovementPct: 41,
    topProduct: "CBD-dominant 20:1 Tincture",
    products: [
      { name: "CBD-dominant 20:1 Tincture", usage: 124, improvement: 46 },
      { name: "CBG Daily Capsule", usage: 76, improvement: 39 },
      { name: "Microdose 2.5mg Gummy", usage: 52, improvement: 42 },
      { name: "Balanced 1:1 Tincture", usage: 27, improvement: 33 },
    ],
    distribution: [42, 28, 18, 8, 4],
  },
  {
    id: "ptsd",
    name: "PTSD",
    emoji: "🧠",
    icd10: "F43.10",
    patients: 94,
    avgImprovementPct: 44,
    topProduct: "Balanced 1:1 Tincture",
    products: [
      { name: "Balanced 1:1 Tincture", usage: 38, improvement: 48 },
      { name: "Indica Flower OG Kush", usage: 28, improvement: 42 },
      { name: "CBD-dominant Capsule", usage: 18, improvement: 39 },
      { name: "Night Tincture 2:1 THC:CBN", usage: 10, improvement: 45 },
    ],
    distribution: [45, 25, 16, 9, 5],
  },
  {
    id: "migraine",
    name: "Migraine",
    emoji: "💥",
    icd10: "G43.909",
    patients: 146,
    avgImprovementPct: 36,
    topProduct: "Sativa Vape 1g",
    products: [
      { name: "Sativa Vape 1g", usage: 58, improvement: 41 },
      { name: "Balanced 1:1 Tincture", usage: 42, improvement: 34 },
      { name: "CBD-dominant Tincture", usage: 30, improvement: 29 },
      { name: "Hybrid Flower Blue Dream", usage: 16, improvement: 35 },
    ],
    distribution: [34, 26, 22, 12, 6],
  },
  {
    id: "arthritis",
    name: "Arthritis",
    emoji: "🦴",
    icd10: "M19.90",
    patients: 203,
    avgImprovementPct: 33,
    topProduct: "Topical Salve 500mg",
    products: [
      { name: "Topical Salve 500mg", usage: 96, improvement: 38 },
      { name: "CBD-dominant Capsule", usage: 62, improvement: 31 },
      { name: "Balanced 1:1 Tincture", usage: 32, improvement: 30 },
      { name: "Transdermal Patch 20mg", usage: 13, improvement: 29 },
    ],
    distribution: [32, 28, 22, 12, 6],
  },
  {
    id: "nausea",
    name: "Cancer-related Nausea",
    emoji: "🤢",
    icd10: "R11.0",
    patients: 58,
    avgImprovementPct: 52,
    topProduct: "Sativa Vape 1g",
    products: [
      { name: "Sativa Vape 1g", usage: 28, improvement: 58 },
      { name: "Microdose 2.5mg Gummy", usage: 18, improvement: 48 },
      { name: "Balanced 1:1 Tincture", usage: 8, improvement: 44 },
      { name: "CBG Daily Capsule", usage: 4, improvement: 39 },
    ],
    distribution: [54, 22, 14, 7, 3],
  },
  {
    id: "seizures",
    name: "Epilepsy",
    emoji: "⚡",
    icd10: "G40.909",
    patients: 41,
    avgImprovementPct: 58,
    topProduct: "CBD-dominant 20:1 Tincture",
    products: [
      { name: "CBD-dominant 20:1 Tincture", usage: 32, improvement: 62 },
      { name: "Pure CBD Isolate Capsule", usage: 7, improvement: 54 },
      { name: "CBD Oral Solution", usage: 2, improvement: 48 },
    ],
    distribution: [58, 24, 10, 6, 2],
  },
];

export default async function AtlasPage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="Condition Outcome Atlas"
        description="Drill into each condition's cohort size, average improvement, and the products producing those outcomes."
      />
      <AtlasView conditions={CONDITIONS} />
    </PageShell>
  );
}

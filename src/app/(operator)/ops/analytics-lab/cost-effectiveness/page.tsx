import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { CostView, type CostProduct } from "./cost-view";

export const metadata = { title: "Cost-Effectiveness Analysis" };

const PRODUCTS: CostProduct[] = [
  {
    id: "p-1",
    name: "Balanced 1:1 Tincture",
    category: "Tincture",
    monthlyCost: 78,
    avgImprovementPct: 42,
    qalyProxy: 0.041,
  },
  {
    id: "p-2",
    name: "CBD-dominant 20:1 Tincture",
    category: "Tincture",
    monthlyCost: 92,
    avgImprovementPct: 46,
    qalyProxy: 0.048,
  },
  {
    id: "p-3",
    name: "Indica Gummy CBN 5mg",
    category: "Edible",
    monthlyCost: 64,
    avgImprovementPct: 54,
    qalyProxy: 0.062,
  },
  {
    id: "p-4",
    name: "Topical Salve 500mg",
    category: "Topical",
    monthlyCost: 48,
    avgImprovementPct: 38,
    qalyProxy: 0.032,
  },
  {
    id: "p-5",
    name: "Sativa Vape 1g",
    category: "Vape",
    monthlyCost: 105,
    avgImprovementPct: 41,
    qalyProxy: 0.036,
  },
  {
    id: "p-6",
    name: "Indica Flower Northern Lights",
    category: "Flower",
    monthlyCost: 168,
    avgImprovementPct: 39,
    qalyProxy: 0.034,
  },
  {
    id: "p-7",
    name: "Microdose 2.5mg Gummy",
    category: "Edible",
    monthlyCost: 52,
    avgImprovementPct: 44,
    qalyProxy: 0.049,
  },
  {
    id: "p-8",
    name: "CBG Daily Capsule",
    category: "Capsule",
    monthlyCost: 88,
    avgImprovementPct: 39,
    qalyProxy: 0.038,
  },
  {
    id: "p-9",
    name: "Transdermal Patch 20mg",
    category: "Transdermal",
    monthlyCost: 124,
    avgImprovementPct: 34,
    qalyProxy: 0.028,
  },
  {
    id: "p-10",
    name: "CBD Capsule 25mg",
    category: "Capsule",
    monthlyCost: 56,
    avgImprovementPct: 36,
    qalyProxy: 0.037,
  },
  {
    id: "p-11",
    name: "Night Tincture 2:1 THC:CBN",
    category: "Tincture",
    monthlyCost: 84,
    avgImprovementPct: 48,
    qalyProxy: 0.052,
  },
  {
    id: "p-12",
    name: "High-THC Vape 90%",
    category: "Vape",
    monthlyCost: 138,
    avgImprovementPct: 37,
    qalyProxy: 0.029,
  },
];

export default async function CostEffectivenessPage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="Cost-Effectiveness Analysis"
        description="Outcome improvement per dollar and quality-adjusted life year (QALY) proxies across the product catalog. Useful for formulary curation and payer conversations."
      />
      <CostView products={PRODUCTS} />
    </PageShell>
  );
}

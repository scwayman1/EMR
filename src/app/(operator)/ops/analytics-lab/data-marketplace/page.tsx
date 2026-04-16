import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { MarketplaceView, type Dataset } from "./marketplace-view";

export const metadata = { title: "Data Marketplace" };

const DATASETS: Dataset[] = [
  {
    id: "ds-1",
    title: "Chronic pain cohort — 12mo outcomes",
    description:
      "412 adults on cannabis regimens for chronic pain (G89.4), with monthly outcome logs over 12 months.",
    sampleSize: 412,
    lastUpdated: "2026-04-02",
    priceUsd: 24_000,
    category: "Outcomes",
    publisher: "Leafjourney Research",
  },
  {
    id: "ds-2",
    title: "Insomnia: CBN-forward regimens vs Z-drugs",
    description:
      "Propensity-matched observational data comparing CBN-forward cannabis regimens to zolpidem in insomnia.",
    sampleSize: 286,
    lastUpdated: "2026-03-18",
    priceUsd: 18_500,
    category: "Comparative",
    publisher: "Leafjourney Research",
  },
  {
    id: "ds-3",
    title: "Anxiety + CBD-dominant: dose-response",
    description:
      "Full dose-response dataset for CBD-dominant tinctures in generalized anxiety disorder (F41.1).",
    sampleSize: 212,
    lastUpdated: "2026-02-28",
    priceUsd: 14_000,
    category: "Pharmacology",
    publisher: "Leafjourney Research",
  },
  {
    id: "ds-4",
    title: "PTSD veterans cohort",
    description:
      "Veterans with PTSD (F43.10) using cannabis, with PCL-5 scores and product-level outcomes.",
    sampleSize: 88,
    lastUpdated: "2026-04-08",
    priceUsd: 31_000,
    category: "Population",
    publisher: "Leafjourney Research",
  },
  {
    id: "ds-5",
    title: "Adverse event registry 2024-2025",
    description:
      "De-identified adverse event reports with severity, causality, product, and resolution across 2 years.",
    sampleSize: 1_904,
    lastUpdated: "2026-01-15",
    priceUsd: 9_500,
    category: "Safety",
    publisher: "Leafjourney Research",
  },
  {
    id: "ds-6",
    title: "Terpene × outcome correlation panel",
    description:
      "Terpene content from COAs linked to longitudinal patient outcome logs across 7 major terpenes.",
    sampleSize: 1_184,
    lastUpdated: "2026-03-30",
    priceUsd: 22_000,
    category: "Pharmacology",
    publisher: "Leafjourney Research",
  },
];

export default async function MarketplacePage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="De-identified Data Marketplace"
        description="Published research cohorts available for purchase by pharma, academia, and payers. All datasets are HIPAA Safe Harbor de-identified."
      />
      <MarketplaceView datasets={DATASETS} />
    </PageShell>
  );
}

import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { CurvesView, type DosePoint } from "./curves-view";

export const metadata = { title: "Treatment Response Curves" };

type Cannabinoid = "THC" | "CBD" | "CBN" | "CBG";
type Condition =
  | "chronic_pain"
  | "insomnia"
  | "anxiety"
  | "ptsd"
  | "migraine";

// Build realistic dose-response data: improvement rises then plateaus/declines past a peak.
function sample(
  peakDose: number,
  peakEffect: number,
  maxDose: number,
  n: number
): DosePoint[] {
  const out: DosePoint[] = [];
  for (let i = 0; i < n; i++) {
    const dose = Math.round((i / (n - 1)) * maxDose * 10) / 10;
    // Inverted-U: effect = peakEffect * exp(-((dose - peakDose)^2) / width^2)
    const width = peakDose * 0.75;
    const baseEffect =
      peakEffect * Math.exp(-Math.pow(dose - peakDose, 2) / (width * width));
    // add noise
    const noise = (Math.sin(i * 1.9) + Math.cos(i * 2.3)) * 6;
    out.push({
      dose,
      improvement: Math.max(0, Math.min(100, Math.round(baseEffect + noise))),
    });
  }
  return out;
}

const DATA: Record<Cannabinoid, Record<Condition, DosePoint[]>> = {
  THC: {
    chronic_pain: sample(12, 62, 40, 28),
    insomnia: sample(7, 58, 20, 24),
    anxiety: sample(3, 48, 20, 24),
    ptsd: sample(8, 56, 30, 24),
    migraine: sample(10, 54, 30, 24),
  },
  CBD: {
    chronic_pain: sample(45, 52, 120, 28),
    insomnia: sample(30, 44, 100, 24),
    anxiety: sample(50, 68, 150, 26),
    ptsd: sample(40, 58, 120, 24),
    migraine: sample(35, 46, 100, 24),
  },
  CBN: {
    chronic_pain: sample(8, 38, 25, 22),
    insomnia: sample(6, 68, 20, 24),
    anxiety: sample(5, 32, 20, 22),
    ptsd: sample(7, 44, 22, 22),
    migraine: sample(6, 28, 20, 22),
  },
  CBG: {
    chronic_pain: sample(25, 44, 80, 24),
    insomnia: sample(15, 28, 60, 22),
    anxiety: sample(20, 52, 70, 24),
    ptsd: sample(22, 42, 75, 22),
    migraine: sample(18, 38, 60, 22),
  },
};

const SAMPLE_SIZES: Record<string, number> = {
  "THC:chronic_pain": 184,
  "THC:insomnia": 148,
  "THC:anxiety": 96,
  "THC:ptsd": 52,
  "THC:migraine": 68,
  "CBD:chronic_pain": 162,
  "CBD:insomnia": 120,
  "CBD:anxiety": 212,
  "CBD:ptsd": 88,
  "CBD:migraine": 74,
  "CBN:chronic_pain": 42,
  "CBN:insomnia": 168,
  "CBN:anxiety": 36,
  "CBN:ptsd": 48,
  "CBN:migraine": 22,
  "CBG:chronic_pain": 58,
  "CBG:insomnia": 34,
  "CBG:anxiety": 86,
  "CBG:ptsd": 28,
  "CBG:migraine": 30,
};

export default async function DoseResponsePage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="Treatment Response Curves"
        description="Scatter plot of daily cannabinoid dose vs self-reported outcome improvement, with inverted-U fit and optimal-dose annotation."
      />
      <CurvesView data={DATA} sampleSizes={SAMPLE_SIZES} />
    </PageShell>
  );
}

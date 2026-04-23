import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { SeasonalView, type MetricSeries } from "./seasonal-view";

export const metadata = { title: "Seasonal Pattern Detector" };

// Realistic curves (0-10 scale). For pain/anxiety, higher = worse.
const SERIES: Record<string, MetricSeries> = {
  pain: {
    label: "Pain",
    emoji: "🩹",
    color: "#b83b2e",
    fill: "rgba(184, 59, 46, 0.15)",
    values: [6.4, 6.6, 6.1, 5.5, 4.9, 4.6, 4.4, 4.5, 4.8, 5.4, 6.0, 6.3],
    invertedBetter: true,
    commentary:
      "Pain peaks in mid-winter (Feb) and eases through spring, lowest in July. Consider proactive regimen reinforcement in late fall.",
  },
  sleep: {
    label: "Sleep",
    emoji: "😴",
    color: "#2e5b8c",
    fill: "rgba(46, 91, 140, 0.15)",
    values: [6.8, 7.0, 7.1, 7.3, 7.0, 6.4, 6.1, 6.2, 6.6, 7.0, 7.2, 7.0],
    invertedBetter: false,
    commentary:
      "Sleep is worst during peak summer (Jul–Aug), likely heat-related. Consider CBN-forward bedtime regimens in summer months.",
  },
  anxiety: {
    label: "Anxiety",
    emoji: "😰",
    color: "#b4701e",
    fill: "rgba(180, 112, 30, 0.15)",
    values: [5.2, 5.4, 5.0, 4.6, 4.3, 4.5, 4.8, 5.0, 5.4, 5.9, 6.4, 6.1],
    invertedBetter: true,
    commentary:
      "Anxiety peaks in November (holiday season) and dips in May. Schedule more check-ins Oct–Dec.",
  },
  mood: {
    label: "Mood",
    emoji: "😊",
    color: "#6ea14f",
    fill: "rgba(110, 161, 79, 0.15)",
    values: [5.8, 5.6, 6.2, 6.8, 7.2, 7.4, 7.1, 6.9, 6.5, 6.1, 5.7, 5.5],
    invertedBetter: false,
    commentary:
      "Mood peaks in early summer (Jun) and dips in mid-winter (Dec–Feb) — classic SAD-like pattern.",
  },
};

export default async function SeasonalPage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="Seasonal Pattern Detector"
        description="Monthly outcome curves across your full patient cohort — useful for anticipating seasonal spikes and scheduling proactive care."
      />
      <SeasonalView series={SERIES} />
    </PageShell>
  );
}

import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { generateHeatmapData } from "@/lib/domain/overnight-batch";
import { HeatmapView } from "./heatmap-view";

export const metadata = { title: "Patient Trend Heatmap" };

export default async function HeatmapPage() {
  await requireUser();

  const pain = generateHeatmapData(90, "improving");
  const sleep = generateHeatmapData(90, "mixed");
  const anxiety = generateHeatmapData(90, "mixed");
  const mood = generateHeatmapData(90, "improving");

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="Patient Trend Heatmap"
        description="90-day cohort outcome grid. Green indicates improving trends; red indicates worsening. Switch between metrics to compare."
      />
      <HeatmapView
        data={{
          pain,
          sleep,
          anxiety,
          mood,
        }}
      />
    </PageShell>
  );
}

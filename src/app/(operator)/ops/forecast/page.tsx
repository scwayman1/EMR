import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { ForecastView } from "./forecast-view";

export const metadata = { title: "Revenue Forecast" };

export default async function ForecastPage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Operations"
        title="Revenue Forecast"
        description="Model the next twelve months of cannabis-care revenue across patient growth, visit cadence, and average ticket."
      />
      <ForecastView />
    </PageShell>
  );
}

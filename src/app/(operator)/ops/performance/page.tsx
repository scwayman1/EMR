import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { PerformanceView } from "./performance-view";

export const metadata = { title: "Performance" };

export default async function PerformancePage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Admin"
        title="Performance"
        description="Live system metrics, slow endpoints, recent errors, and agent queue depth. Auto-refreshes every 10s."
      />
      <PerformanceView />
    </PageShell>
  );
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import {
  generateCohortBenchmarks,
  type CohortBenchmark,
} from "@/lib/domain/clinical-intelligence";
import { CohortView } from "./cohort-view";

export const metadata = { title: "Patients like you" };

// ---------------------------------------------------------------------------
// Cohort comparison page — "Patients like you"
// ---------------------------------------------------------------------------
// Shows the patient how their key wellbeing metrics compare against an
// anonymous cohort of patients with similar conditions. Built on the
// generateCohortBenchmarks helper in clinical-intelligence so the math
// stays consistent with the rest of the EMR.
// ---------------------------------------------------------------------------

const TRACKED_METRICS = ["pain", "sleep", "anxiety", "mood"] as const;

export default async function CohortPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      outcomeLogs: {
        orderBy: { loggedAt: "desc" },
        take: 200,
      },
    },
  });

  if (!patient) redirect("/portal/intake");

  // Compute the patient's average value per tracked metric (last 200 logs).
  const metricAverages: Record<string, number> = {};
  for (const key of TRACKED_METRICS) {
    const series = patient.outcomeLogs
      .filter((l) => l.metric === key)
      .map((l) => l.value);
    if (series.length === 0) continue;
    const avg = series.reduce((a, b) => a + b, 0) / series.length;
    metricAverages[key] = Math.round(avg * 10) / 10;
  }

  if (Object.keys(metricAverages).length === 0) {
    return (
      <PageShell maxWidth="max-w-[960px]">
        <EmptyState
          title="No outcome data yet"
          description="Once you've logged a few check-ins, we'll show how you compare to similar patients."
        />
      </PageShell>
    );
  }

  const condition = patient.presentingConcerns ?? "chronic pain";
  const benchmarks: CohortBenchmark[] = generateCohortBenchmarks(
    metricAverages,
    condition,
  );

  return (
    <PageShell maxWidth="max-w-[960px]">
      <CohortView
        benchmarks={benchmarks}
        firstName={patient.firstName}
        condition={condition}
      />
    </PageShell>
  );
}

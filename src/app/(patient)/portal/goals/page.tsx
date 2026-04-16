import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Eyebrow } from "@/components/ui/ornament";
import type { TreatmentGoal } from "@/lib/domain/treatment-goals";
import { GoalsView, type GoalSeed } from "./goals-view";

export const metadata = { title: "Treatment Goals" };

/**
 * Treatment goals page.
 *
 * Goals don't have a dedicated table yet, so the page renders demo seeds
 * plus any goals the patient has created locally during this session. The
 * "current value" for each goal is computed from the patient's most recent
 * OutcomeLog entry for the matching metric (when available).
 */
export default async function GoalsPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!patient) redirect("/portal/intake");

  // Pull recent outcome logs to compute "current value" by metric
  const recent = await prisma.outcomeLog.findMany({
    where: { patientId: patient.id },
    orderBy: { loggedAt: "desc" },
    take: 200,
  });

  const latestByMetric: Record<string, number> = {};
  for (const log of recent) {
    if (latestByMetric[log.metric] === undefined) {
      latestByMetric[log.metric] = log.value;
    }
  }

  // Demo seeds — one improving (pain trending down), one steady (sleep)
  const now = Date.now();
  const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
  const targetDate = new Date(now + 30 * 86400000).toISOString();

  const seeds: GoalSeed[] = [
    {
      goal: {
        id: "demo-pain",
        patientId: patient.id,
        metric: "pain",
        direction: "decrease",
        baseline: 7,
        target: 3,
        startedAt: fourteenDaysAgo,
        targetDate,
        status: "active",
      } satisfies TreatmentGoal,
      currentValue: latestByMetric["pain"] ?? 5,
    },
    {
      goal: {
        id: "demo-sleep",
        patientId: patient.id,
        metric: "sleep",
        direction: "increase",
        baseline: 5,
        target: 8,
        startedAt: sevenDaysAgo,
        targetDate,
        status: "active",
      } satisfies TreatmentGoal,
      currentValue: latestByMetric["sleep"] ?? 5,
    },
  ];

  return (
    <PageShell maxWidth="max-w-[860px]">
      <PatientSectionNav section="health" />
      <div className="mb-10 text-center">
        <Eyebrow className="justify-center mb-3">Treatment goals</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight">
          Where you're headed
        </h1>
        <p className="text-[15px] text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
          Set the outcomes that matter to you. We'll track your progress and
          share it with your care team.
        </p>
      </div>

      <GoalsView seeds={seeds} latestByMetric={latestByMetric} />
    </PageShell>
  );
}

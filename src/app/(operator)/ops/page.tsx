import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, LeafSprig } from "@/components/ui/ornament";
import { AmbientOrb } from "@/components/ui/hero-art";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Practice overview" };

export default async function OpsOverviewPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const [
    patientCount,
    prospectCount,
    inactiveCount,
    openTasks,
    launchStatus,
    recentJobs,
    allPatients,
  ] = await Promise.all([
    prisma.patient.count({ where: { organizationId: orgId, status: "active" } }),
    prisma.patient.count({ where: { organizationId: orgId, status: "prospect" } }),
    prisma.patient.count({ where: { organizationId: orgId, status: "inactive" } }),
    prisma.task.count({ where: { organizationId: orgId, status: "open" } }),
    prisma.practiceLaunchStatus.findUnique({ where: { organizationId: orgId } }),
    prisma.agentJob.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.patient.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        status: true,
        chartSummary: { select: { completenessScore: true } },
        intakeAnswers: true,
      },
    }),
  ]);

  // Compute intake funnel buckets
  // Prospects with no intake = "Not started"
  // Prospects with some intake answers = partial (estimate completeness from field count)
  let notStarted = 0;
  let intakeUnder50 = 0;
  let intake50to99 = 0;
  let intakeComplete = 0;

  for (const p of allPatients) {
    if (p.status !== "prospect") continue;
    const chartScore = p.chartSummary?.completenessScore ?? 0;
    // Use chart completeness if available, else estimate from intakeAnswers
    const answers = p.intakeAnswers as Record<string, unknown> | null;
    const answerCount = answers ? Object.keys(answers).length : 0;
    // Rough mapping: 0 answers = not started, chart score overrides if present
    const score = chartScore > 0 ? chartScore : answerCount === 0 ? 0 : Math.min(answerCount * 10, 99);
    if (score === 0) notStarted++;
    else if (score < 50) intakeUnder50++;
    else if (score < 100) intake50to99++;
    else intakeComplete++;
  }

  return (
    <PageShell maxWidth="max-w-[1320px]">
      {/* ------------------ Hero ------------------ */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised ambient mb-10">
        <AmbientOrb className="absolute -right-10 -top-4 h-[260px] w-[500px] opacity-90" />
        <div className="relative px-8 md:px-12 py-12 md:py-14 max-w-3xl">
          <Eyebrow className="mb-4">Practice operations</Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight text-text">
            {user.organizationName ?? "Your practice"}, at a glance.
          </h1>
          <p className="text-[15px] text-text-muted mt-4 leading-relaxed max-w-2xl">
            A quiet command center. Patient flow, agent activity, and
            go-live readiness, all in one view.
          </p>
        </div>
      </section>

      {/* ------------------ Metric strip ------------------ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MetricTile label="Active patients" value={patientCount} accent="forest" />
        <MetricTile label="In intake" value={prospectCount} accent="amber" />
        <MetricTile label="Open tasks" value={openTasks} />
        <MetricTile
          label="Launch readiness"
          value={launchStatus ? `${launchStatus.readinessScore}%` : "\u2014"}
        />
      </div>

      {/* ------------------ Intake funnel ------------------ */}
      <Card tone="raised" className="mb-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent/80" />
            Intake funnel
          </CardTitle>
          <CardDescription>
            Patient progression from first contact through completed intake and active care.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-stretch gap-0">
            <FunnelStep
              label="Prospects"
              sublabel="Not started"
              value={notStarted}
              color="bg-surface-muted"
              textColor="text-text-muted"
              isFirst
            />
            <FunnelArrow />
            <FunnelStep
              label="Intake"
              sublabel="< 50%"
              value={intakeUnder50}
              color="bg-highlight-soft"
              textColor="text-[color:var(--highlight-hover)]"
            />
            <FunnelArrow />
            <FunnelStep
              label="Intake"
              sublabel="50\u2013 99%"
              value={intake50to99}
              color="bg-highlight-soft"
              textColor="text-[color:var(--highlight)]"
            />
            <FunnelArrow />
            <FunnelStep
              label="Intake"
              sublabel="100%"
              value={intakeComplete}
              color="bg-accent-soft"
              textColor="text-accent"
            />
            <FunnelArrow />
            <FunnelStep
              label="Active"
              sublabel="patients"
              value={patientCount}
              color="bg-accent-soft"
              textColor="text-accent"
              isLast
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------ Agent activity + launch ------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" tone="raised">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LeafSprig size={16} className="text-accent/80" />
              Recent agent activity
            </CardTitle>
            <CardDescription>
              A live view of what the orchestration layer is doing right now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <EmptyState
                title="No agent activity yet"
                description="As patients and clinicians use the platform, agent work will appear here."
              />
            ) : (
              <ul className="divide-y divide-border/70 -mx-6">
                {recentJobs.map((j) => (
                  <li
                    key={j.id}
                    className="px-6 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                        <p className="text-sm font-medium text-text">
                          {j.workflowName}
                          <span className="text-text-subtle"> · </span>
                          <span className="font-mono text-xs text-text-muted">
                            {j.agentName}
                          </span>
                        </p>
                      </div>
                      <p className="text-xs text-text-subtle mt-1 ml-3.5 font-mono">
                        {j.eventName} · {formatRelative(j.createdAt)}
                      </p>
                    </div>
                    <Badge tone={jobTone(j.status)}>{j.status.replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle>Launch checklist</CardTitle>
            <CardDescription>Progress toward go-live.</CardDescription>
          </CardHeader>
          <CardContent>
            {launchStatus ? (
              <>
                <div className="flex items-end gap-3 mb-4">
                  <span className="font-display text-4xl text-text tabular-nums leading-none">
                    {launchStatus.readinessScore}
                  </span>
                  <span className="text-sm text-text-muted mb-1">/ 100</span>
                </div>
                <div className="relative h-2 bg-surface-muted rounded-full overflow-hidden mb-5">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-[#3A8560] rounded-full transition-all"
                    style={{ width: `${launchStatus.readinessScore}%` }}
                  />
                </div>
                <ul className="space-y-2.5">
                  {(launchStatus.nextSteps as string[]).map((step) => (
                    <li
                      key={step}
                      className="text-sm text-text-muted flex items-start gap-2.5"
                    >
                      <LeafSprig size={14} className="text-accent/70 mt-0.5 shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-text-muted">No launch status yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function jobTone(status: string) {
  if (status === "succeeded") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "needs_approval") return "warning" as const;
  if (status === "running" || status === "claimed") return "info" as const;
  return "neutral" as const;
}

function FunnelStep({
  label,
  sublabel,
  value,
  color,
  textColor,
  isFirst,
  isLast,
}: {
  label: string;
  sublabel: string;
  value: number;
  color: string;
  textColor: string;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex-1 ${color} p-4 flex flex-col items-center justify-center text-center min-h-[100px] ${
        isFirst ? "rounded-l-xl" : ""
      } ${isLast ? "rounded-r-xl" : ""}`}
    >
      <span className={`font-display text-2xl md:text-3xl font-medium tabular-nums leading-none ${textColor}`}>
        {value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-subtle mt-2">
        {label}
      </span>
      <span className="text-[10px] text-text-subtle">{sublabel}</span>
    </div>
  );
}

function FunnelArrow() {
  return (
    <div className="flex items-center justify-center w-6 shrink-0 -mx-px">
      <svg
        width="12"
        height="24"
        viewBox="0 0 12 24"
        fill="none"
        className="text-border-strong/60"
      >
        <path
          d="M2 2L10 12L2 22"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

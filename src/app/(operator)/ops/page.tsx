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

  const [patientCount, prospectCount, openTasks, launchStatus, recentJobs] = await Promise.all([
    prisma.patient.count({ where: { organizationId: orgId, status: "active" } }),
    prisma.patient.count({ where: { organizationId: orgId, status: "prospect" } }),
    prisma.task.count({ where: { organizationId: orgId, status: "open" } }),
    prisma.practiceLaunchStatus.findUnique({ where: { organizationId: orgId } }),
    prisma.agentJob.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

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
          value={launchStatus ? `${launchStatus.readinessScore}%` : "—"}
        />
      </div>

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
                    <Badge tone={jobTone(j.status)}>{j.status}</Badge>
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

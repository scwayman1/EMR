import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Practice overview" };

export default async function OpsOverviewPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [
    patientCount,
    prospectCount,
    openTasks,
    launchStatus,
    recentJobs,
    onShift,
    shiftsToday,
    openIncidents,
    liveCampaigns,
  ] = await Promise.all([
    prisma.patient.count({ where: { organizationId: orgId, status: "active" } }),
    prisma.patient.count({ where: { organizationId: orgId, status: "prospect" } }),
    prisma.task.count({ where: { organizationId: orgId, status: "open" } }),
    prisma.practiceLaunchStatus.findUnique({ where: { organizationId: orgId } }),
    prisma.agentJob.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.timeEntry.count({ where: { organizationId: orgId, status: "open" } }),
    prisma.shift.count({
      where: { organizationId: orgId, startAt: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.incident.count({
      where: {
        organizationId: orgId,
        status: { in: ["open", "investigating"] },
      },
    }),
    prisma.marketingCampaign.count({
      where: { organizationId: orgId, status: "live" },
    }),
  ]);

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Operations"
        title="Practice overview"
        description={`How ${user.organizationName ?? "your practice"} is running today.`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricTile label="Active patients" value={patientCount} />
        <MetricTile label="In intake" value={prospectCount} />
        <MetricTile label="Open tasks" value={openTasks} />
        <MetricTile
          label="Launch readiness"
          value={launchStatus ? `${launchStatus.readinessScore}%` : "—"}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricTile label="On shift" value={onShift} hint="Clocked in right now" />
        <MetricTile label="Shifts today" value={shiftsToday} />
        <MetricTile
          label="Open incidents"
          value={openIncidents}
          hint={openIncidents === 0 ? "All clear" : "Unresolved"}
        />
        <MetricTile label="Live campaigns" value={liveCampaigns} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent agent activity</CardTitle>
            <CardDescription>
              A live view of what the orchestration layer has been doing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <EmptyState
                title="No agent activity yet"
                description="As patients and clinicians use the platform, agent work will appear here."
              />
            ) : (
              <ul className="divide-y divide-border -mx-6">
                {recentJobs.map((j) => (
                  <li key={j.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {j.workflowName} · {j.agentName}
                      </p>
                      <p className="text-xs text-text-subtle mt-1">
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

        <Card>
          <CardHeader>
            <CardTitle>Launch checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {launchStatus ? (
              <>
                <div className="h-2 bg-surface-muted rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${launchStatus.readinessScore}%` }}
                  />
                </div>
                <ul className="space-y-2">
                  {(launchStatus.nextSteps as string[]).map((step) => (
                    <li key={step} className="text-sm text-text-muted flex items-start gap-2">
                      <span className="text-accent mt-1.5 h-1.5 w-1.5 rounded-full bg-accent inline-block shrink-0" />
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

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { JobActions } from "./job-actions";
import { agentList } from "@/lib/agents";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Mission Control" };

export default async function MissionControlPage() {
  const user = await requireUser();
  const orgFilter = user.organizationId
    ? { OR: [{ organizationId: user.organizationId }, { organizationId: null }] }
    : {};

  const [jobs, counts] = await Promise.all([
    prisma.agentJob.findMany({
      where: orgFilter,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.agentJob.groupBy({
      by: ["status"],
      where: orgFilter,
      _count: true,
    }),
  ]);

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <PageShell maxWidth="max-w-[1400px]">
      <PageHeader
        eyebrow="Mission control"
        title="Agent orchestration"
        description="The nervous system. Every workflow, every job, every decision — in one place."
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <MetricTile label="Pending" value={countByStatus.pending ?? 0} />
        <MetricTile label="Running" value={(countByStatus.running ?? 0) + (countByStatus.claimed ?? 0)} />
        <MetricTile label="Needs approval" value={countByStatus.needs_approval ?? 0} />
        <MetricTile label="Succeeded" value={countByStatus.succeeded ?? 0} />
        <MetricTile label="Failed" value={countByStatus.failed ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
            <CardDescription>Latest 50 jobs across all workflows.</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <EmptyState
                title="No jobs yet"
                description="The queue is quiet. Use the patient or clinician workflows to kick off agent runs."
              />
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-text-subtle border-b border-border">
                      <th className="text-left font-medium px-6 py-3">Workflow</th>
                      <th className="text-left font-medium px-3 py-3">Agent</th>
                      <th className="text-left font-medium px-3 py-3">Event</th>
                      <th className="text-left font-medium px-3 py-3">Status</th>
                      <th className="text-left font-medium px-3 py-3">Created</th>
                      <th className="text-right font-medium px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {jobs.map((j) => (
                      <tr key={j.id} className="hover:bg-surface-muted transition-colors">
                        <td className="px-6 py-3 text-text">{j.workflowName}</td>
                        <td className="px-3 py-3 text-text-muted">{j.agentName}</td>
                        <td className="px-3 py-3 text-text-muted font-mono text-xs">{j.eventName}</td>
                        <td className="px-3 py-3">
                          <Badge tone={jobTone(j.status)}>{j.status}</Badge>
                        </td>
                        <td className="px-3 py-3 text-text-subtle">{formatRelative(j.createdAt)}</td>
                        <td className="px-6 py-3 text-right">
                          {j.status === "needs_approval" && (
                            <JobActions jobId={j.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent fleet</CardTitle>
            <CardDescription>{agentList.length} registered agents.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {agentList.map((a) => (
                <li key={a.name}>
                  <p className="text-sm font-medium text-text">{a.name}</p>
                  <p className="text-xs text-text-subtle">
                    v{a.version} · {a.requiresApproval ? "approval-gated" : "autonomous"}
                  </p>
                </li>
              ))}
            </ul>
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

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { IncidentSeverity, IncidentStatus } from "@prisma/client";
import { formatDate, formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Incidents" };

const SEVERITY_TONE: Record<IncidentSeverity, "neutral" | "warning" | "danger" | "info"> = {
  low: "info",
  medium: "neutral",
  high: "warning",
  critical: "danger",
};

const STATUS_TONE: Record<IncidentStatus, "neutral" | "accent" | "success" | "warning"> = {
  open: "warning",
  investigating: "accent",
  resolved: "success",
  closed: "neutral",
};

export default async function OpsIncidentsPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const [incidents, openCount, criticalCount, last30] = await Promise.all([
    prisma.incident.findMany({
      where: { organizationId: orgId },
      include: { reportedBy: true },
      orderBy: [{ occurredAt: "desc" }],
      take: 50,
    }),
    prisma.incident.count({
      where: { organizationId: orgId, status: { in: ["open", "investigating"] } },
    }),
    prisma.incident.count({
      where: { organizationId: orgId, severity: "critical", status: { not: "closed" } },
    }),
    prisma.incident.count({
      where: { organizationId: orgId, occurredAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Operations"
        title="Incident log"
        description="Every reported safety, privacy, clinical, or facilities incident — with status and resolution."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricTile label="Open" value={openCount} hint="Unresolved or under investigation" />
        <MetricTile
          label="Critical unresolved"
          value={criticalCount}
          hint={criticalCount === 0 ? "Nothing critical open" : "Needs attention"}
        />
        <MetricTile label="Last 30 days" value={last30} />
      </div>

      {incidents.length === 0 ? (
        <EmptyState
          title="No incidents on record"
          description="When incidents are reported they'll land here with severity and status."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border -mx-6">
              {incidents.map((incident) => (
                <li key={incident.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={SEVERITY_TONE[incident.severity]}>
                          {incident.severity}
                        </Badge>
                        <Badge tone={STATUS_TONE[incident.status]}>
                          {incident.status}
                        </Badge>
                        <Badge tone="neutral">{incident.category}</Badge>
                      </div>
                      <p className="text-sm text-text mt-2">{incident.summary}</p>
                      {incident.resolution && (
                        <p className="text-xs text-text-muted mt-1.5">
                          <span className="font-medium text-text-muted">Resolution:</span>{" "}
                          {incident.resolution}
                        </p>
                      )}
                      <p className="text-xs text-text-subtle mt-2">
                        Occurred {formatDate(incident.occurredAt)} ·{" "}
                        {incident.reportedBy
                          ? `reported by ${incident.reportedBy.firstName} ${incident.reportedBy.lastName}`
                          : "reporter anonymous"}
                      </p>
                    </div>
                    <div className="text-xs text-text-subtle tabular-nums shrink-0">
                      {formatRelative(incident.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}

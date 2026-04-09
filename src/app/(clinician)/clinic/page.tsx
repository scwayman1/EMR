import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Today" };

export default async function ClinicHomePage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

  const [todaysEncounters, recentPatients, openNotes, activePatientCount] =
    await Promise.all([
      prisma.encounter.findMany({
        where: {
          organizationId,
          scheduledFor: { gte: startOfDay, lt: endOfDay },
        },
        include: { patient: { include: { chartSummary: true } } },
        orderBy: { scheduledFor: "asc" },
      }),
      prisma.patient.findMany({
        where: { organizationId, status: "active" },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.note.count({
        where: { status: "draft", encounter: { organizationId } },
      }),
      prisma.patient.count({ where: { organizationId, status: "active" } }),
    ]);

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow={`Hello, ${user.firstName}`}
        title="Today"
        description="A calm overview of your day. Open a chart to get started."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricTile label="Today's visits" value={todaysEncounters.length} />
        <MetricTile label="Active patients" value={activePatientCount} />
        <MetricTile label="Notes to complete" value={openNotes} />
        <MetricTile label="Unread messages" value="—" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
            <CardDescription>
              Each visit shows a chart-ready summary from the intake agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysEncounters.length === 0 ? (
              <EmptyState
                title="No visits today"
                description="Nothing on the books. A quiet day to catch up on notes."
              />
            ) : (
              <ul className="divide-y divide-border -mx-6">
                {todaysEncounters.map((e) => (
                  <li key={e.id} className="px-6 py-4">
                    <Link
                      href={`/clinic/patients/${e.patient.id}`}
                      className="flex items-center gap-4 group"
                    >
                      <Avatar
                        firstName={e.patient.firstName}
                        lastName={e.patient.lastName}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text group-hover:text-accent">
                            {e.patient.firstName} {e.patient.lastName}
                          </p>
                          <Badge tone="neutral">{e.modality}</Badge>
                          {e.patient.chartSummary && (
                            <Badge tone="accent">
                              Chart {e.patient.chartSummary.completenessScore}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-subtle mt-1">
                          {e.scheduledFor?.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          · {e.reason ?? "Visit"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent patients */}
        <Card>
          <CardHeader>
            <CardTitle>Recent patients</CardTitle>
            <CardDescription>Your most recently active patients.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPatients.length === 0 ? (
              <EmptyState title="No patients yet" />
            ) : (
              <ul className="space-y-2 -mx-1">
                {recentPatients.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/clinic/patients/${p.id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-muted transition-colors"
                    >
                      <Avatar firstName={p.firstName} lastName={p.lastName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-xs text-text-subtle truncate">
                          Updated {formatDate(p.updatedAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

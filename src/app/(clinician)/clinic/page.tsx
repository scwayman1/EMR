import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow, LeafSprig } from "@/components/ui/ornament";
import { AmbientOrb } from "@/components/ui/hero-art";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Today" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Hello";
}

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
    <PageShell maxWidth="max-w-[1320px]">
      {/* ------------------ Hero greeting ------------------ */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised ambient mb-10">
        <AmbientOrb className="absolute -right-16 -top-4 h-[280px] w-[520px] opacity-90" />
        <div className="relative px-8 md:px-12 py-12 md:py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 max-w-5xl">
            <div className="max-w-2xl">
              <Eyebrow className="mb-4">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Eyebrow>
              <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight text-text">
                {greeting()},{" "}
                <span className="italic text-accent">{user.firstName}</span>.
              </h1>
              <p className="text-[15px] text-text-muted mt-4 leading-relaxed">
                {todaysEncounters.length === 0
                  ? "Nothing on your schedule today. A quiet morning to catch up on notes."
                  : `${todaysEncounters.length} visit${
                      todaysEncounters.length === 1 ? "" : "s"
                    } today · ${openNotes} ${
                      openNotes === 1 ? "note" : "notes"
                    } in draft.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 shrink-0">
              <MetricTile
                label="Today"
                accent="forest"
                value={todaysEncounters.length}
                hint="Visits"
              />
              <MetricTile
                label="Drafts"
                accent="amber"
                value={openNotes}
                hint="To complete"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------ Metrics strip ------------------ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MetricTile label="Active patients" value={activePatientCount} />
        <MetricTile label="Today's visits" value={todaysEncounters.length} />
        <MetricTile label="Notes in draft" value={openNotes} />
        <MetricTile label="Unread messages" value="—" />
      </div>

      {/* ------------------ Schedule + recent patients ------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <Card className="lg:col-span-2" tone="raised">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LeafSprig size={16} className="text-accent/80" />
              Today&apos;s schedule
            </CardTitle>
            <CardDescription>
              Each visit carries a chart-ready summary from the intake agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysEncounters.length === 0 ? (
              <EmptyState
                title="No visits today"
                description="A quiet day to catch up. Ping your ops team if you want to be booked up faster."
              />
            ) : (
              <ul className="divide-y divide-border/70 -mx-6">
                {todaysEncounters.map((e) => (
                  <li
                    key={e.id}
                    className="px-6 py-4 hover:bg-surface-muted/40 transition-colors"
                  >
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-text group-hover:text-accent transition-colors">
                            {e.patient.firstName} {e.patient.lastName}
                          </p>
                          <Badge tone="neutral">{e.modality}</Badge>
                          {e.patient.chartSummary && (
                            <Badge tone="accent">
                              Chart {e.patient.chartSummary.completenessScore}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-subtle mt-1 tabular-nums">
                          {e.scheduledFor?.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          · {e.reason ?? "Visit"}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="text-text-subtle group-hover:text-accent transition-colors"
                      >
                        →
                      </span>
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
              <ul className="space-y-1 -mx-1">
                {recentPatients.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/clinic/patients/${p.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface-muted transition-colors group"
                    >
                      <Avatar firstName={p.firstName} lastName={p.lastName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate group-hover:text-accent transition-colors">
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

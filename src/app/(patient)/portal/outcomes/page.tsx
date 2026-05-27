import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { RecentCheckIns } from "./recent-check-ins";

export const metadata = { title: "Outcomes" };

const METRICS = [
  { key: "pain" as const, label: "Pain", lowLabel: "None", highLabel: "Severe" },
  { key: "sleep" as const, label: "Sleep", lowLabel: "Poor", highLabel: "Great" },
  { key: "anxiety" as const, label: "Anxiety", lowLabel: "None", highLabel: "Severe" },
  { key: "mood" as const, label: "Mood", lowLabel: "Low", highLabel: "Great" },
  { key: "nausea" as const, label: "Nausea", lowLabel: "None", highLabel: "Severe" },
];

export default async function OutcomesPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: { outcomeLogs: { orderBy: { loggedAt: "asc" }, take: 200 } },
  });

  if (!patient) {
    return (
      <PageShell maxWidth="max-w-[960px]">
        <EmptyState title="No patient profile yet" />
      </PageShell>
    );
  }

  // Recent logs (newest first) for the history list
  const recentLogs = [...patient.outcomeLogs]
    .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
    .slice(0, 20);

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PatientSectionNav section="health" />

      {/* EMR-185: page header + CTA collapse into one strip so the
          metric grid is above the fold on a typical laptop. The heavy
          ambient card has moved to /outcomes/new where the patient is
          actually mid-task. */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Eyebrow className="mb-2">Outcomes</Eyebrow>
          <h1 className="font-display text-2xl md:text-3xl text-text tracking-tight leading-tight">
            How you&apos;ve been feeling
          </h1>
          <p className="text-sm text-text-muted mt-1.5 max-w-xl leading-relaxed">
            Trends shared with your care team. A minute a day keeps the chart full.
          </p>
        </div>
        <Link href="/portal/outcomes/new" className="shrink-0">
          <Button size="lg">Log a check-in</Button>
        </Link>
      </div>

      {/* EMR-185: metric cards condensed onto a 4-up grid (was 2x2) so
          all four pillars fit on one row on tablet+ — turns a 2-screen
          page into a 1-screen overview. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {METRICS.map((metric) => {
          const series = patient.outcomeLogs
            .filter((l) => l.metric === metric.key)
            .map((l) => l.value);
          const latest = series[series.length - 1];

          return (
            <Card key={metric.key} tone="raised" className="card-hover">
              <CardContent className="py-4 px-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text">{metric.label}</p>
                  {latest !== undefined && (
                    <Badge
                      tone={
                        metric.key === "sleep" || metric.key === "mood"
                          ? latest >= 7
                            ? "success"
                            : latest >= 4
                            ? "warning"
                            : "danger"
                          : latest <= 3
                          ? "success"
                          : latest <= 6
                          ? "warning"
                          : "danger"
                      }
                    >
                      {latest.toFixed(1)}
                    </Badge>
                  )}
                </div>
                <Sparkline
                  data={series.length > 1 ? series : [0, 0]}
                  width={200}
                  height={40}
                />
                <div className="flex justify-between text-[10px] text-text-subtle px-0.5">
                  <span>{metric.lowLabel}</span>
                  <span>{metric.highLabel}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ---- Recent history ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recent check-ins</CardTitle>
          <CardDescription>
            Your last 20 logged values across all metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <EmptyState
              title="No logs yet"
              description="Your check-in history will appear here once you start logging."
              action={
                <Link href="/portal/outcomes/new">
                  <Button size="sm">Log your first check-in</Button>
                </Link>
              }
            />
          ) : (
            <RecentCheckIns
              logs={recentLogs.map((log) => ({
                id: log.id,
                loggedAt: log.loggedAt.toISOString(),
                metric: log.metric,
                value: log.value,
                note: log.note,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

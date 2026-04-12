import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
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
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Outcomes"
        title="How you've been feeling"
        description="Your trends over time. Shared with your care team to guide your plan."
      />

      {/* ---- Hero CTA card ---- */}
      <Card tone="ambient" className="mb-8">
        <CardContent className="py-8 px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <Eyebrow className="mb-3">Track your progress</Eyebrow>
            <h2 className="font-display text-2xl text-text tracking-tight leading-tight">
              Regular check-ins help your care team see the full picture.
            </h2>
            <p className="text-sm text-text-muted mt-2 max-w-lg leading-relaxed">
              A quick daily log -- pain, sleep, anxiety, and mood -- gives your
              provider real data to work with. It only takes a minute.
            </p>
          </div>
          <div className="shrink-0">
            <Link href="/portal/outcomes/new">
              <Button size="lg">Log a check-in</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ---- Metric trend cards ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {METRICS.map((metric) => {
          const series = patient.outcomeLogs
            .filter((l) => l.metric === metric.key)
            .map((l) => l.value);
          const latest = series[series.length - 1];

          return (
            <Card key={metric.key} tone="raised" className="card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize">{metric.label}</CardTitle>
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
                      {latest.toFixed(1)} / 10
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {latest !== undefined
                    ? `Latest: ${latest.toFixed(1)} / 10`
                    : "No data yet -- log a check-in to start tracking."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Sparkline
                  data={series.length > 1 ? series : [0, 0]}
                  width={280}
                  height={56}
                />
                {series.length > 0 && (
                  <div className="flex justify-between mt-1.5 px-0.5">
                    <span className="text-[10px] text-text-subtle">{metric.lowLabel}</span>
                    <span className="text-[10px] text-text-subtle">{metric.highLabel}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ---- Recent history ---- */}
      <Card>
        <CardHeader>
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

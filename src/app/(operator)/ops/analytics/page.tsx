import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { LeafSprig } from "@/components/ui/ornament";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // -------- Parallel data fetching --------
  const [
    // Patient demographics
    activePatients,
    prospectPatients,
    inactivePatients,
    allPatients,
    // Engagement counts
    totalAssessments,
    totalOutcomeLogs,
    totalMessages,
    totalDocuments,
    // Agent performance
    agentJobsByAgent,
    agentSucceeded,
    agentFailed,
    agentAvgTime,
    // Cannabis Rx
    activeRegimens,
    regimenDetails,
    // Outcome trends (raw logs for sparklines)
    outcomeLogs30d,
    // Outcome averages
    avgPain,
    avgSleep,
    avgAnxiety,
  ] = await Promise.all([
    // --- Patient demographics ---
    prisma.patient.count({
      where: { organizationId: orgId, status: "active", deletedAt: null },
    }),
    prisma.patient.count({
      where: { organizationId: orgId, status: "prospect", deletedAt: null },
    }),
    prisma.patient.count({
      where: { organizationId: orgId, status: "inactive", deletedAt: null },
    }),
    prisma.patient.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: {
        dateOfBirth: true,
        presentingConcerns: true,
      },
    }),
    // --- Engagement ---
    prisma.assessmentResponse.count({
      where: { patient: { organizationId: orgId } },
    }),
    prisma.outcomeLog.count({
      where: { patient: { organizationId: orgId } },
    }),
    prisma.message.count({
      where: { thread: { patient: { organizationId: orgId } } },
    }),
    prisma.document.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    // --- Agent performance ---
    prisma.agentJob.groupBy({
      by: ["agentName"],
      where: { organizationId: orgId },
      _count: { id: true },
    }),
    prisma.agentJob.count({
      where: { organizationId: orgId, status: "succeeded" },
    }),
    prisma.agentJob.count({
      where: { organizationId: orgId, status: "failed" },
    }),
    prisma.agentJob.aggregate({
      where: {
        organizationId: orgId,
        status: "succeeded",
        startedAt: { not: null },
        completedAt: { not: null },
      },
      _avg: { attempts: true },
    }),
    // --- Cannabis Rx ---
    prisma.dosingRegimen.count({
      where: { active: true, patient: { organizationId: orgId } },
    }),
    prisma.dosingRegimen.findMany({
      where: { active: true, patient: { organizationId: orgId } },
      select: {
        calculatedThcMgPerDay: true,
        calculatedCbdMgPerDay: true,
        product: { select: { name: true, id: true } },
      },
    }),
    // --- Outcome trends (last 30 days) ---
    prisma.outcomeLog.findMany({
      where: {
        patient: { organizationId: orgId },
        loggedAt: { gte: thirtyDaysAgo },
      },
      select: {
        metric: true,
        value: true,
        loggedAt: true,
      },
      orderBy: { loggedAt: "asc" },
    }),
    // --- Outcome averages ---
    prisma.outcomeLog.aggregate({
      where: { patient: { organizationId: orgId }, metric: "pain" },
      _avg: { value: true },
    }),
    prisma.outcomeLog.aggregate({
      where: { patient: { organizationId: orgId }, metric: "sleep" },
      _avg: { value: true },
    }),
    prisma.outcomeLog.aggregate({
      where: { patient: { organizationId: orgId }, metric: "anxiety" },
      _avg: { value: true },
    }),
  ]);

  // -------- Derived metrics --------

  // Average age
  const now = new Date();
  const ages = allPatients
    .filter((p) => p.dateOfBirth !== null)
    .map((p) => {
      const dob = p.dateOfBirth!;
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      return age;
    });
  const avgAge =
    ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;

  // Most common presenting concerns
  const concernCounts: Record<string, number> = {};
  for (const p of allPatients) {
    if (!p.presentingConcerns) continue;
    const concerns = p.presentingConcerns
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    for (const c of concerns) {
      concernCounts[c] = (concernCounts[c] ?? 0) + 1;
    }
  }
  const topConcerns = Object.entries(concernCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Build sparkline data: group outcome logs by day for each metric
  function buildSparklineData(metric: string): number[] {
    const byDay = new Map<string, number[]>();
    for (const log of outcomeLogs30d) {
      if (log.metric !== metric) continue;
      const day = log.loggedAt.toISOString().slice(0, 10);
      const existing = byDay.get(day);
      if (existing) existing.push(log.value);
      else byDay.set(day, [log.value]);
    }
    // Average per day, sorted by date
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, vals]) => vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  const painSparkline = buildSparklineData("pain");
  const sleepSparkline = buildSparklineData("sleep");
  const anxietySparkline = buildSparklineData("anxiety");

  // Agent performance: compute avg execution time from completed jobs
  // We approximate using startedAt/completedAt diff in a separate query
  const completedJobs = await prisma.agentJob.findMany({
    where: {
      organizationId: orgId,
      status: "succeeded",
      startedAt: { not: null },
      completedAt: { not: null },
    },
    select: { startedAt: true, completedAt: true },
    take: 500,
  });
  const execTimes = completedJobs
    .filter((j) => j.startedAt && j.completedAt)
    .map((j) => j.completedAt!.getTime() - j.startedAt!.getTime());
  const avgExecMs =
    execTimes.length > 0
      ? Math.round(execTimes.reduce((a, b) => a + b, 0) / execTimes.length)
      : null;

  const totalJobs = agentSucceeded + agentFailed;
  const successRate =
    totalJobs > 0 ? ((agentSucceeded / totalJobs) * 100).toFixed(1) : null;

  // Most prescribed products
  const productCounts: Record<string, { name: string; count: number }> = {};
  for (const r of regimenDetails) {
    const key = r.product.id;
    if (productCounts[key]) productCounts[key].count++;
    else productCounts[key] = { name: r.product.name, count: 1 };
  }
  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Avg THC/CBD per day across active regimens
  const thcValues = regimenDetails
    .filter((r) => r.calculatedThcMgPerDay !== null)
    .map((r) => r.calculatedThcMgPerDay!);
  const cbdValues = regimenDetails
    .filter((r) => r.calculatedCbdMgPerDay !== null)
    .map((r) => r.calculatedCbdMgPerDay!);
  const avgThcPerDay =
    thcValues.length > 0
      ? (thcValues.reduce((a, b) => a + b, 0) / thcValues.length).toFixed(1)
      : null;
  const avgCbdPerDay =
    cbdValues.length > 0
      ? (cbdValues.reduce((a, b) => a + b, 0) / cbdValues.length).toFixed(1)
      : null;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Operations"
        title="Analytics"
        description="Aggregate platform metrics across patients, outcomes, agents, and cannabis prescribing."
      />

      {/* ================== Top-level metric tiles ================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MetricTile
          label="Active patients"
          value={activePatients}
          accent="forest"
        />
        <MetricTile
          label="Prospects"
          value={prospectPatients}
          accent="amber"
        />
        <MetricTile
          label="Assessments completed"
          value={totalAssessments}
        />
        <MetricTile
          label="Active regimens"
          value={activeRegimens}
          accent="forest"
        />
      </div>

      {/* ================== Patient demographics ================== */}
      <Card tone="raised" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent/80" />
            Patient demographics
          </CardTitle>
          <CardDescription>
            Breakdown by status, average age, and most common presenting
            concerns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Active
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {activePatients}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Prospect
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {prospectPatients}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Inactive
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {inactivePatients}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Avg age
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {avgAge !== null ? `${avgAge} yr` : "\u2014"}
              </p>
            </div>
          </div>

          {topConcerns.length > 0 && (
            <>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
                Top presenting concerns
              </p>
              <div className="flex flex-wrap gap-2">
                {topConcerns.map(([concern, count]) => (
                  <Badge key={concern} tone="accent">
                    {concern}{" "}
                    <span className="text-accent/60 ml-1">({count})</span>
                  </Badge>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================== Outcome trends ================== */}
      <Card tone="raised" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent/80" />
            Outcome trends
          </CardTitle>
          <CardDescription>
            Practice-wide averages and 30-day sparklines for core patient
            outcome metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <OutcomeMetricCard
              label="Pain"
              avg={avgPain._avg.value}
              sparklineData={painSparkline}
              color="var(--danger)"
              fill="rgba(184, 59, 46, 0.12)"
            />
            <OutcomeMetricCard
              label="Sleep"
              avg={avgSleep._avg.value}
              sparklineData={sleepSparkline}
              color="var(--info)"
              fill="rgba(46, 91, 140, 0.12)"
            />
            <OutcomeMetricCard
              label="Anxiety"
              avg={avgAnxiety._avg.value}
              sparklineData={anxietySparkline}
              color="var(--warning)"
              fill="rgba(180, 112, 30, 0.12)"
            />
          </div>
        </CardContent>
      </Card>

      {/* ================== Agent performance ================== */}
      <Card tone="raised" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent/80" />
            Agent performance
          </CardTitle>
          <CardDescription>
            Job counts by agent, success/failure rates, and average execution
            time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Total jobs
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {totalJobs}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Success rate
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {successRate !== null ? `${successRate}%` : "\u2014"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Failed
              </p>
              <p className="font-display text-2xl text-danger mt-1">
                {agentFailed}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Avg execution
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {avgExecMs !== null ? formatMs(avgExecMs) : "\u2014"}
              </p>
            </div>
          </div>

          {agentJobsByAgent.length > 0 && (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                      Agent
                    </th>
                    <th className="px-6 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle text-right">
                      Jobs
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {agentJobsByAgent
                    .sort((a, b) => b._count.id - a._count.id)
                    .map((row) => (
                      <tr key={row.agentName}>
                        <td className="px-6 py-3 font-mono text-xs text-text">
                          {row.agentName}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-text-muted">
                          {row._count.id}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================== Engagement ================== */}
      <Card tone="raised" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent/80" />
            Engagement
          </CardTitle>
          <CardDescription>
            Platform-wide usage counts across assessments, outcomes, messaging,
            and documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Assessments
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {totalAssessments}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Outcome logs
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {totalOutcomeLogs}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Messages
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {totalMessages}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Documents
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {totalDocuments}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================== Cannabis Rx ================== */}
      <Card tone="raised" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent/80" />
            Cannabis Rx
          </CardTitle>
          <CardDescription>
            Active regimens, most prescribed products, and average daily
            cannabinoid dosing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Active regimens
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {activeRegimens}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Avg THC/day
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {avgThcPerDay !== null ? `${avgThcPerDay} mg` : "\u2014"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Avg CBD/day
              </p>
              <p className="font-display text-2xl text-text mt-1">
                {avgCbdPerDay !== null ? `${avgCbdPerDay} mg` : "\u2014"}
              </p>
            </div>
          </div>

          {topProducts.length > 0 && (
            <>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
                Most prescribed products
              </p>
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-6 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                        Product
                      </th>
                      <th className="px-6 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle text-right">
                        Active regimens
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {topProducts.map((p) => (
                      <tr key={p.name}>
                        <td className="px-6 py-3 text-text">{p.name}</td>
                        <td className="px-6 py-3 text-right tabular-nums text-text-muted">
                          {p.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

// -------- Helper components --------

function OutcomeMetricCard({
  label,
  avg,
  sparklineData,
  color,
  fill,
}: {
  label: string;
  avg: number | null;
  sparklineData: number[];
  color: string;
  fill: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
        {label}
      </p>
      <div className="flex items-end gap-4">
        <span className="font-display text-3xl text-text tabular-nums leading-none">
          {avg !== null ? avg.toFixed(1) : "\u2014"}
        </span>
        <span className="text-xs text-text-subtle mb-1">/ 10 avg</span>
      </div>
      <div className="mt-3">
        <Sparkline
          data={sparklineData}
          width={220}
          height={48}
          color={color}
          fill={fill}
        />
      </div>
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

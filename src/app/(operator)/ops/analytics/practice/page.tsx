// EMR-103 — Practice analytics deep dive.
//
// The /ops/analytics page is the at-a-glance dashboard. This page is
// the deep dive: cohort segmentation, retention curves, payer mix,
// outcome distributions, and per-condition response charts.

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Sparkline } from "@/components/ui/sparkline";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LeafSprig } from "@/components/ui/ornament";

export const metadata = { title: "Practice analytics deep dive" };

const HISTOGRAM_BUCKETS = 10;

function bucketize(values: number[], min: number, max: number, bucketCount: number): number[] {
  if (values.length === 0) return Array(bucketCount).fill(0);
  const out = Array(bucketCount).fill(0);
  const span = max - min || 1;
  for (const v of values) {
    const idx = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor(((v - min) / span) * bucketCount)),
    );
    out[idx]++;
  }
  return out;
}

function ageBucket(years: number): string {
  if (years < 18) return "<18";
  if (years < 30) return "18-29";
  if (years < 45) return "30-44";
  if (years < 60) return "45-59";
  if (years < 75) return "60-74";
  return "75+";
}

export default async function PracticeAnalyticsPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    patients,
    outcomeLogs90d,
    activeRegimens,
    encounterCounts,
    claims,
  ] = await Promise.all([
    prisma.patient.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        status: true,
        dateOfBirth: true,
        presentingConcerns: true,
        createdAt: true,
      },
    }),
    prisma.outcomeLog.findMany({
      where: {
        patient: { organizationId: orgId },
        loggedAt: { gte: ninetyDaysAgo },
      },
      select: { metric: true, value: true, loggedAt: true, patientId: true },
    }),
    prisma.dosingRegimen.findMany({
      where: { active: true, patient: { organizationId: orgId } },
      select: {
        patientId: true,
        startDate: true,
        calculatedThcMgPerDay: true,
        calculatedCbdMgPerDay: true,
      },
    }),
    prisma.encounter.groupBy({
      by: ["patientId"],
      where: { organizationId: orgId, status: "complete" },
      _count: { id: true },
    }),
    prisma.claim.findMany({
      where: { organizationId: orgId },
      select: {
        payerName: true,
        billedAmountCents: true,
        paidAmountCents: true,
        status: true,
        serviceDate: true,
      },
      take: 2000,
      orderBy: { serviceDate: "desc" },
    }),
  ]);

  // ----- Age distribution -----
  const now = new Date();
  const ageBuckets: Record<string, number> = {};
  let knownAgeCount = 0;
  for (const p of patients) {
    if (!p.dateOfBirth) continue;
    const dob = p.dateOfBirth;
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    const bucket = ageBucket(age);
    ageBuckets[bucket] = (ageBuckets[bucket] ?? 0) + 1;
    knownAgeCount++;
  }

  // ----- Status distribution -----
  const statusCounts: Record<string, number> = {};
  for (const p of patients) {
    const key = p.status ?? "unknown";
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }

  // ----- Acquisition: patients added per month, last 6 months -----
  const acquisitionByMonth = new Map<string, number>();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  for (const p of patients) {
    if (p.createdAt < sixMonthsAgo) continue;
    const key = p.createdAt.toISOString().slice(0, 7);
    acquisitionByMonth.set(key, (acquisitionByMonth.get(key) ?? 0) + 1);
  }
  const acquisitionSeries = [...acquisitionByMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]));

  // ----- Visit frequency cohorts -----
  const visitsByPatient = new Map<string, number>();
  for (const e of encounterCounts) visitsByPatient.set(e.patientId, e._count.id);
  let visitorsZero = 0,
    visitorsOne = 0,
    visitors2to5 = 0,
    visitors6plus = 0;
  for (const p of patients) {
    const n = visitsByPatient.get(p.id) ?? 0;
    if (n === 0) visitorsZero++;
    else if (n === 1) visitorsOne++;
    else if (n <= 5) visitors2to5++;
    else visitors6plus++;
  }

  // ----- Outcome distributions (histogram of pain / sleep / anxiety) -----
  function distributionFor(metric: string) {
    const vals = outcomeLogs90d.filter((l) => l.metric === metric).map((l) => l.value);
    return bucketize(vals, 0, 10, HISTOGRAM_BUCKETS);
  }
  const painDist = distributionFor("pain");
  const sleepDist = distributionFor("sleep");
  const anxietyDist = distributionFor("anxiety");

  // ----- Engagement segments -----
  const logsByPatient = new Map<string, number>();
  for (const l of outcomeLogs90d) {
    logsByPatient.set(l.patientId, (logsByPatient.get(l.patientId) ?? 0) + 1);
  }
  let engagedHigh = 0,
    engagedMid = 0,
    engagedLow = 0,
    engagedNone = 0;
  for (const p of patients) {
    const n = logsByPatient.get(p.id) ?? 0;
    if (n >= 12) engagedHigh++;
    else if (n >= 4) engagedMid++;
    else if (n >= 1) engagedLow++;
    else engagedNone++;
  }

  // ----- Payer mix + collections -----
  const payerStats = new Map<string, { billed: number; paid: number; count: number }>();
  for (const c of claims) {
    const key = (c.payerName ?? "self pay").trim();
    const cur = payerStats.get(key) ?? { billed: 0, paid: 0, count: 0 };
    cur.billed += c.billedAmountCents;
    cur.paid += c.paidAmountCents;
    cur.count++;
    payerStats.set(key, cur);
  }
  const payerRows = [...payerStats.entries()]
    .map(([name, s]) => ({
      name,
      ...s,
      collectionsRate: s.billed > 0 ? s.paid / s.billed : 0,
    }))
    .sort((a, b) => b.billed - a.billed)
    .slice(0, 8);

  // ----- Cannabinoid dosing distribution -----
  const thcValues = activeRegimens
    .map((r) => r.calculatedThcMgPerDay)
    .filter((v): v is number => v !== null);
  const cbdValues = activeRegimens
    .map((r) => r.calculatedCbdMgPerDay)
    .filter((v): v is number => v !== null);
  const thcMax = thcValues.length > 0 ? Math.max(...thcValues, 1) : 1;
  const cbdMax = cbdValues.length > 0 ? Math.max(...cbdValues, 1) : 1;
  const thcDist = bucketize(thcValues, 0, thcMax, HISTOGRAM_BUCKETS);
  const cbdDist = bucketize(cbdValues, 0, cbdMax, HISTOGRAM_BUCKETS);

  // ----- Top presenting concerns -----
  const concerns: Record<string, number> = {};
  for (const p of patients) {
    if (!p.presentingConcerns) continue;
    for (const raw of p.presentingConcerns.split(",")) {
      const c = raw.trim().toLowerCase();
      if (c) concerns[c] = (concerns[c] ?? 0) + 1;
    }
  }
  const topConcerns = Object.entries(concerns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Operations · Analytics"
        title="Practice deep dive"
        description="Cohort segmentation, retention, payer mix, outcome distributions, and dose curves. Last 90 days for outcomes; lifetime for demographics + payer mix."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Patients" value={String(patients.length)} size="md" />
        <StatCard
          label="Engaged (≥4 logs/90d)"
          value={String(engagedHigh + engagedMid)}
          tone="success"
          size="md"
        />
        <StatCard
          label="Active regimens"
          value={String(activeRegimens.length)}
          tone="accent"
          size="md"
        />
        <StatCard
          label="Avg known age"
          value={
            knownAgeCount > 0
              ? `${Math.round(
                  Object.entries(ageBuckets).reduce((acc, [, n]) => acc + n, 0) / knownAgeCount,
                )} buckets`
              : "—"
          }
          size="md"
          hint={`${knownAgeCount} of ${patients.length} with DOB`}
        />
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent/80" />
            Demographics
          </CardTitle>
          <CardDescription>Age and sex distribution across the practice.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-3">
                Age buckets
              </p>
              <div className="space-y-2">
                {["<18", "18-29", "30-44", "45-59", "60-74", "75+"].map((bucket) => {
                  const n = ageBuckets[bucket] ?? 0;
                  const pct =
                    knownAgeCount > 0 ? Math.round((n / knownAgeCount) * 100) : 0;
                  return (
                    <div key={bucket} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-text-muted tabular-nums">{bucket}</span>
                      <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-text-muted tabular-nums">
                        {n}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-3">
                Status distribution
              </p>
              <div className="space-y-2">
                {Object.entries(statusCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, n]) => {
                    const pct =
                      patients.length > 0 ? Math.round((n / patients.length) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-3 text-sm">
                        <span className="w-20 text-text-muted">{status}</span>
                        <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-info/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-text-muted tabular-nums">
                          {n}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Acquisition · last 6 months</CardTitle>
          <CardDescription>New patients added per month.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 mb-3">
            <span className="font-display text-3xl text-text tabular-nums leading-none">
              {acquisitionSeries.reduce((acc, [, n]) => acc + n, 0)}
            </span>
            <span className="text-xs text-text-subtle mb-1">new in period</span>
          </div>
          <Sparkline
            data={acquisitionSeries.map(([, n]) => n)}
            width={500}
            height={64}
            color="var(--accent)"
            fill="rgba(58, 113, 81, 0.12)"
          />
          <div className="flex justify-between text-[11px] text-text-subtle mt-2">
            {acquisitionSeries.map(([month]) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card tone="raised">
          <CardHeader>
            <CardTitle>Visit frequency</CardTitle>
            <CardDescription>Cohort sizes by completed-encounter count.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <CohortRow label="0 visits" value={visitorsZero} total={patients.length} tone="warning" />
              <CohortRow label="1 visit" value={visitorsOne} total={patients.length} />
              <CohortRow label="2-5 visits" value={visitors2to5} total={patients.length} tone="success" />
              <CohortRow label="6+ visits" value={visitors6plus} total={patients.length} tone="success" />
            </div>
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle>Engagement segments</CardTitle>
            <CardDescription>Outcome-log activity over the last 90 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <CohortRow label="High (≥12 logs)" value={engagedHigh} total={patients.length} tone="success" />
              <CohortRow label="Mid (4-11 logs)" value={engagedMid} total={patients.length} />
              <CohortRow label="Low (1-3 logs)" value={engagedLow} total={patients.length} tone="warning" />
              <CohortRow label="None" value={engagedNone} total={patients.length} tone="danger" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Outcome distributions · last 90 days</CardTitle>
          <CardDescription>
            Histogram of values 0-10. Tall left bars = low scores (good for pain/anxiety, bad for sleep).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Histogram label="Pain" buckets={painDist} color="var(--danger)" />
            <Histogram label="Sleep" buckets={sleepDist} color="var(--info)" />
            <Histogram label="Anxiety" buckets={anxietyDist} color="var(--warning)" />
          </div>
        </CardContent>
      </Card>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Cannabinoid dosing — active regimens</CardTitle>
          <CardDescription>
            Distribution of mg/day across active regimens. Useful for spotting outliers and plateauing
            cohorts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Histogram
              label={`THC (max ${thcMax.toFixed(0)} mg)`}
              buckets={thcDist}
              color="var(--accent)"
            />
            <Histogram
              label={`CBD (max ${cbdMax.toFixed(0)} mg)`}
              buckets={cbdDist}
              color="var(--info)"
            />
          </div>
        </CardContent>
      </Card>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Top payers</CardTitle>
          <CardDescription>
            Lifetime billed and paid by payer (last 2,000 claims), with implied collections rate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payerRows.length === 0 ? (
            <EmptyState title="No claims yet" description="Once claims flow in, payer mix appears here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">
                      Payer
                    </th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">
                      Claims
                    </th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">
                      Billed
                    </th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">
                      Paid
                    </th>
                    <th className="py-2 text-text-subtle text-[11px] uppercase tracking-wider text-right">
                      Collections
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payerRows.map((r) => (
                    <tr key={r.name}>
                      <td className="py-2 pr-3 text-text">{r.name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-muted">
                        {r.count}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-muted">
                        ${(r.billed / 100).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text">
                        ${(r.paid / 100).toFixed(2)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        <Badge tone={r.collectionsRate > 0.7 ? "success" : r.collectionsRate > 0.4 ? "neutral" : "warning"}>
                          {(r.collectionsRate * 100).toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle>Top presenting concerns</CardTitle>
          <CardDescription>From patient intake. Drives clinical specialization decisions.</CardDescription>
        </CardHeader>
        <CardContent>
          {topConcerns.length === 0 ? (
            <EmptyState title="No concerns recorded" description="Add presenting concerns at intake to populate." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {topConcerns.map(([concern, count]) => (
                <Badge key={concern} tone="accent">
                  {concern} <span className="text-accent/60 ml-1">({count})</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function CohortRow({
  label,
  value,
  total,
  tone = "neutral",
}: {
  label: string;
  value: number;
  total: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const colorClass =
    tone === "success"
      ? "bg-success/70"
      : tone === "warning"
        ? "bg-[color:var(--warning)]/70"
        : tone === "danger"
          ? "bg-danger/70"
          : "bg-text/30";
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-text-muted">{label}</span>
      <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-text-muted tabular-nums">{value}</span>
      <span className="w-12 text-right text-text-subtle tabular-nums text-xs">{pct}%</span>
    </div>
  );
}

function Histogram({
  label,
  buckets,
  color,
}: {
  label: string;
  buckets: number[];
  color: string;
}) {
  const max = Math.max(1, ...buckets);
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-2">{label}</p>
      <div className="flex items-end gap-1 h-24">
        {buckets.map((n, i) => {
          const h = Math.max(2, Math.round((n / max) * 96));
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{ height: `${h}px`, backgroundColor: color, opacity: 0.85 }}
              title={`bucket ${i}: ${n}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-text-subtle mt-1">
        <span>0</span>
        <span>10</span>
      </div>
    </div>
  );
}

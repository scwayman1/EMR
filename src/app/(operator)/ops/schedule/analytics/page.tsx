import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { Sparkline } from "@/components/ui/sparkline";
import { Eyebrow } from "@/components/ui/ornament";
import { Badge } from "@/components/ui/badge";
import {
  computeMetrics,
  forecastWindows,
  detectBottlenecks,
  actionTriggers,
  type AppointmentRecord,
  type AppointmentStatus,
} from "@/lib/scheduling";
import { ExportCsvButton } from "./export-csv";

export const metadata = { title: "Scheduling Analytics" };

/**
 * EMR-215 — Scheduling analytics cockpit.
 *
 * The operator view of the supply side of scheduling. All KPIs are computed
 * by the pure analytics engine (src/lib/scheduling/analytics.ts) so the page
 * stays a thin rendering layer:
 *   - Fill / no-show / cancellation rates + lead-time percentiles
 *   - 30 / 60 / 90-day demand forecast from booking velocity
 *   - Per-provider utilization with bottleneck callouts
 *   - Action triggers (e.g. fill rate < 70% for 2 weeks → open a ticket)
 *   - CSV export of the underlying appointment-level data
 */
export default async function ScheduleAnalyticsPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const now = new Date();
  const ninetyAgo = new Date(now);
  ninetyAgo.setDate(ninetyAgo.getDate() - 90);

  const fourteenAhead = new Date(now);
  fourteenAhead.setDate(fourteenAhead.getDate() + 14);

  const [appointments, providers] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        patient: { organizationId: orgId },
        startAt: { gte: ninetyAgo, lt: fourteenAhead },
      },
      select: {
        id: true,
        providerId: true,
        startAt: true,
        endAt: true,
        status: true,
        modality: true,
        createdAt: true,
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.provider.findMany({
      where: { organizationId: orgId, active: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  // Map Prisma rows into the engine's flat record shape.
  const records: AppointmentRecord[] = appointments.map((a) => ({
    id: a.id,
    providerId: a.providerId,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status as AppointmentStatus,
    modality: a.modality,
    createdAt: a.createdAt,
  }));

  const future = records.filter((a) => a.startAt >= now);

  // Headline KPIs over the full 90d-past + 14d-future window.
  const metrics = computeMetrics(records, now);

  // Forward-looking utilization (next 14 days only). Capacity ≈ 80h / provider
  // over the window. We re-run the engine on just the future set so rates
  // reflect booked capacity ahead rather than historical attendance.
  const forward = computeMetrics(future, now, { capacityHours: 80 });
  const bottlenecks = detectBottlenecks(forward, { utilThreshold: 0.85 });
  const bottleneckIds = new Set(bottlenecks.map((b) => b.providerId));

  const forecast = forecastWindows(records, now);

  // Weekly fill rate (last 12 weeks) feeds both the sparkline and the
  // low-fill-rate action trigger.
  const weeklyFill = computeWeeklyFill(
    records.filter((a) => a.startAt < now),
    12,
  );
  const triggers = actionTriggers(weeklyFill.map((w) => w.rate));
  const firedTriggers = triggers.filter((t) => t.fired);

  const providerName = new Map(
    providers.map((p) => [p.id, `${p.user.firstName} ${p.user.lastName}`.trim()]),
  );
  const providerTitle = new Map(providers.map((p) => [p.id, p.title ?? "Provider"]));

  // Per-provider forward view: utilization from the engine + a simple 30-day
  // booking-velocity forecast per provider.
  const fourteenAgo = new Date(now);
  fourteenAgo.setDate(fourteenAgo.getDate() - 14);
  const providerStats = forward.providerUtilization.map((u) => {
    const recentlyBooked = records.filter(
      (a) => a.providerId === u.providerId && a.createdAt >= fourteenAgo,
    ).length;
    return {
      id: u.providerId,
      name: providerName.get(u.providerId) ?? "Unassigned",
      title: providerTitle.get(u.providerId) ?? "Provider",
      bookedHours: Math.round(u.bookedHours * 10) / 10,
      capacityHours: 80,
      util: u.util,
      forecast30d: Math.round((recentlyBooked / 14) * 30),
      bottleneck: bottleneckIds.has(u.providerId),
    };
  });

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Practice management"
        title="Scheduling analytics"
        description="Fill rates, no-show trends, lead time, per-provider utilization, and a 30/60/90-day demand forecast. Export the appointment-level data anywhere."
        actions={<ExportCsvButton orgScopedRows={appointments.length} />}
      />

      {firedTriggers.length > 0 && (
        <div className="mb-8 rounded-xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--warning)] mb-1">
            Action required
          </p>
          {firedTriggers.map((t) => (
            <p key={t.rule} className="text-sm text-text">
              {t.detail}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Fill rate (90d)"
          value={`${Math.round(metrics.fillRate * 100)}%`}
          hint={`${metrics.counts.completed} completed of ${metrics.counts.completed + metrics.counts.noShow} attended`}
          accent="forest"
        />
        <MetricTile
          label="No-show rate"
          value={`${Math.round(metrics.noShowRate * 100)}%`}
          hint={`${metrics.counts.noShow} no-shows`}
          accent="amber"
        />
        <MetricTile
          label="Cancellation rate"
          value={`${Math.round(metrics.cancelRate * 100)}%`}
          hint={`${metrics.counts.cancelled} cancellations`}
        />
        <MetricTile
          label="Lead time (P50)"
          value={`${Math.round(metrics.leadTimeDaysP50)}d`}
          hint={`P90 ${Math.round(metrics.leadTimeDaysP90)}d`}
          accent="forest"
        />
      </div>

      {/* Demand forecast */}
      <div className="mb-3">
        <Eyebrow>Demand forecast — booking velocity</Eyebrow>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <ForecastTile label="Next 30 days" value={Math.round(forecast.d30.projected)} />
        <ForecastTile label="Next 60 days" value={Math.round(forecast.d60.projected)} />
        <ForecastTile label="Next 90 days" value={Math.round(forecast.d90.projected)} />
      </div>

      <Card tone="raised" className="mb-8">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-baseline justify-between mb-4">
            <Eyebrow>Weekly fill rate</Eyebrow>
            <p className="text-xs text-text-subtle">last 12 weeks</p>
          </div>
          <div className="h-20">
            <Sparkline data={weeklyFill.map((w) => w.rate)} width={720} height={72} />
          </div>
          <div className="grid grid-cols-12 gap-1 mt-2 text-[10px] text-text-subtle tabular-nums">
            {weeklyFill.map((w, i) => (
              <span key={i} className="text-center">
                {Math.round(w.rate * 100)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-baseline justify-between">
        <Eyebrow>Per-provider — next 14 days</Eyebrow>
        {bottlenecks.length > 0 && (
          <p className="text-xs text-[color:var(--warning)]">
            {bottlenecks.length} provider{bottlenecks.length === 1 ? "" : "s"} running hot
          </p>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {providerStats.map((p) => (
          <Card key={p.id} tone="raised">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-text">{p.name}</p>
                  <p className="text-[11px] text-text-subtle uppercase tracking-wider">{p.title}</p>
                </div>
                <Badge tone={p.bottleneck ? "danger" : p.util > 0.5 ? "success" : "neutral"}>
                  {Math.round(p.util * 100)}% utilized
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-surface-muted overflow-hidden mt-3 mb-2">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-strong"
                  style={{ width: `${Math.min(100, Math.round(p.util * 100))}%` }}
                />
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-text-subtle tabular-nums">
                <span>
                  {p.bookedHours}h / {p.capacityHours}h capacity
                </span>
                <span>30d forecast: {p.forecast30d} visits</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

function ForecastTile({ label, value }: { label: string; value: number }) {
  return (
    <Card tone="raised">
      <CardContent className="pt-5 pb-5">
        <p className="font-display text-3xl tabular-nums text-accent">{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
        <p className="text-[10px] text-text-subtle mt-0.5">projected new bookings</p>
      </CardContent>
    </Card>
  );
}

function computeWeeklyFill(
  past: Array<{ startAt: Date; status: string }>,
  weeks: number,
): Array<{ weekStart: Date; rate: number }> {
  const out: Array<{ weekStart: Date; rate: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const inWeek = past.filter((a) => a.startAt >= weekStart && a.startAt < weekEnd);
    const filled = inWeek.filter(
      (a) => a.status === "completed" || a.status === "confirmed",
    ).length;
    const rate = inWeek.length === 0 ? 0 : filled / inWeek.length;
    out.push({ weekStart, rate });
  }
  return out;
}

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { Sparkline } from "@/components/ui/sparkline";
import { Eyebrow } from "@/components/ui/ornament";
import { Badge } from "@/components/ui/badge";
import { ExportCsvButton } from "./export-csv";

export const metadata = { title: "Scheduling Analytics" };

/**
 * EMR-215 — Scheduling analytics cockpit.
 *
 * The operator view of the supply side of scheduling. Surfaces:
 *   - Fill rate by week (last 12 weeks)
 *   - No-show / cancellation rate
 *   - Per-provider utilization with a 14-day forecast based on current
 *     booking velocity vs. capacity
 *   - CSV export of the underlying appointment-level data so the ops
 *     team can pivot it however they want
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

  const past = appointments.filter((a) => a.startAt < now);
  const future = appointments.filter((a) => a.startAt >= now);

  const completed = past.filter((a) => a.status === "completed").length;
  const noShow = past.filter((a) => a.status === "no_show").length;
  const cancelled = past.filter((a) => a.status === "cancelled").length;
  const filledPast = past.filter(
    (a) => a.status === "completed" || a.status === "confirmed",
  ).length;

  const fillRate = past.length === 0 ? 0 : filledPast / past.length;
  const noShowRate = past.length === 0 ? 0 : noShow / past.length;
  const cancelRate = past.length === 0 ? 0 : cancelled / past.length;

  // Weekly fill rate sparkline — group last 12 weeks.
  const weeklyFill = computeWeeklyFill(past, 12);

  // Per-provider utilization (booked hours / capacity hours) over the
  // next 14 days. Capacity = 5 work-days × 8 hours = 40h baseline.
  const providerStats = providers.map((p) => {
    const slots = future.filter((a) => a.providerId === p.id);
    const bookedHours =
      slots.reduce((s, a) => s + (a.endAt.getTime() - a.startAt.getTime()) / 3_600_000, 0) || 0;
    const capacityHours = 80; // 14d × 8h × ~0.71 work day mix
    const util = Math.min(1, bookedHours / capacityHours);

    // Booking velocity — appointments created in the last 14 days that are
    // for this provider. Used to forecast 30-day demand.
    const fourteenAgo = new Date(now);
    fourteenAgo.setDate(fourteenAgo.getDate() - 14);
    const recentlyBooked = appointments.filter(
      (a) => a.providerId === p.id && a.createdAt >= fourteenAgo,
    ).length;
    const forecast30d = Math.round((recentlyBooked / 14) * 30);

    return {
      id: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`.trim(),
      title: p.title ?? "Provider",
      bookedHours: Math.round(bookedHours * 10) / 10,
      capacityHours,
      util,
      forecast30d,
    };
  });

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Practice management"
        title="Scheduling analytics"
        description="Fill rates, no-show trends, per-provider utilization, and a 30-day demand forecast. Export the appointment-level data anywhere."
        actions={<ExportCsvButton orgScopedRows={appointments.length} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Fill rate (90d)"
          value={`${Math.round(fillRate * 100)}%`}
          hint={`${filledPast} of ${past.length}`}
          accent="forest"
        />
        <MetricTile
          label="No-show rate"
          value={`${Math.round(noShowRate * 100)}%`}
          hint={`${noShow} no-shows`}
          accent="amber"
        />
        <MetricTile
          label="Cancellation rate"
          value={`${Math.round(cancelRate * 100)}%`}
          hint={`${cancelled} cancellations`}
        />
        <MetricTile
          label="Booked next 14d"
          value={future.length}
          hint="visits ahead"
          accent="forest"
        />
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

      <div className="mb-3">
        <Eyebrow>Per-provider — next 14 days</Eyebrow>
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
                <Badge tone={p.util > 0.85 ? "warning" : p.util > 0.5 ? "success" : "neutral"}>
                  {Math.round(p.util * 100)}% utilized
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-surface-muted overflow-hidden mt-3 mb-2">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-strong"
                  style={{ width: `${Math.round(p.util * 100)}%` }}
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

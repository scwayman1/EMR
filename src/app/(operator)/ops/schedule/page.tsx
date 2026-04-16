import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { Avatar } from "@/components/ui/avatar";
import { ShiftStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Staff schedule" };

const STATUS_TONE: Record<ShiftStatus, "neutral" | "accent" | "success" | "warning" | "danger" | "info"> = {
  scheduled: "info",
  in_progress: "accent",
  completed: "success",
  cancelled: "neutral",
  no_show: "danger",
};

function formatTimeRange(start: Date, end: Date): string {
  const fmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString("en-US", fmt)} – ${end.toLocaleTimeString("en-US", fmt)}`;
}

function shiftDurationHours(start: Date, end: Date): string {
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  return `${hours.toFixed(1)}h`;
}

function groupByDay(shifts: Awaited<ReturnType<typeof fetchShifts>>) {
  const groups = new Map<string, typeof shifts>();
  for (const shift of shifts) {
    const key = shift.startAt.toDateString();
    const bucket = groups.get(key) ?? [];
    bucket.push(shift);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    day: new Date(key),
    shifts: items,
  }));
}

async function fetchShifts(organizationId: string) {
  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 14);

  return prisma.shift.findMany({
    where: {
      organizationId,
      startAt: { gte: windowStart, lt: windowEnd },
    },
    include: { assignee: true },
    orderBy: { startAt: "asc" },
  });
}

export default async function OpsSchedulePage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const [shifts, openShifts, scheduledToday] = await Promise.all([
    fetchShifts(orgId),
    prisma.shift.count({
      where: { organizationId: orgId, assigneeUserId: null, status: "scheduled" },
    }),
    prisma.shift.count({
      where: {
        organizationId: orgId,
        startAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0)),
        },
      },
    }),
  ]);

  const groups = groupByDay(shifts);
  const totalHours = shifts.reduce(
    (sum, s) => sum + (s.endAt.getTime() - s.startAt.getTime()) / 3_600_000,
    0,
  );

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Operations"
        title="Staff schedule"
        description="Rolling two-week view of shifts across the practice."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricTile label="Shifts on deck" value={shifts.length} hint="Next 14 days" />
        <MetricTile label="Scheduled today" value={scheduledToday} />
        <MetricTile
          label="Unassigned"
          value={openShifts}
          hint={openShifts === 0 ? "Every shift has a person" : "Shifts waiting for an assignee"}
        />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No shifts on the schedule yet"
          description="Shifts will appear here as they're added. Staff can see their own shifts in the time clock."
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.day.toISOString()}>
              <CardHeader>
                <CardTitle>{formatDate(group.day)}</CardTitle>
                <p className="text-xs text-text-subtle mt-1">
                  {group.shifts.length} shift{group.shifts.length === 1 ? "" : "s"} ·{" "}
                  {group.shifts
                    .reduce(
                      (sum, s) => sum + (s.endAt.getTime() - s.startAt.getTime()) / 3_600_000,
                      0,
                    )
                    .toFixed(1)}
                  h total
                </p>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border -mx-6">
                  {group.shifts.map((shift) => (
                    <li key={shift.id} className="px-6 py-3 flex items-center gap-4">
                      {shift.assignee ? (
                        <Avatar
                          firstName={shift.assignee.firstName}
                          lastName={shift.assignee.lastName}
                          size="sm"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-surface-muted border border-dashed border-border" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text">
                            {shift.assignee
                              ? `${shift.assignee.firstName} ${shift.assignee.lastName}`
                              : "Open shift"}
                          </p>
                          <Badge tone="neutral">{shift.role}</Badge>
                          <Badge tone={STATUS_TONE[shift.status]}>
                            {shift.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {shift.notes && (
                          <p className="text-xs text-text-subtle mt-1">{shift.notes}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-text-muted tabular-nums">
                        <div>{formatTimeRange(shift.startAt, shift.endAt)}</div>
                        <div className="text-text-subtle">
                          {shiftDurationHours(shift.startAt, shift.endAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-text-subtle text-right tabular-nums">
            Two-week total: {totalHours.toFixed(1)} scheduled hours
          </p>
        </div>
      )}
    </PageShell>
  );
}

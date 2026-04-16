import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { formatRelative } from "@/lib/utils/format";
import { clockInAction, clockOutAction } from "./actions";

export const metadata = { title: "Time clock" };

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function OpsTimeclockPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const [myOpen, myRecent, teamOpen, teamToday] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { userId: user.id, status: "open" },
    }),
    prisma.timeEntry.findMany({
      where: { userId: user.id, clockInAt: { gte: weekStart } },
      orderBy: { clockInAt: "desc" },
      take: 8,
    }),
    prisma.timeEntry.findMany({
      where: { organizationId: orgId, status: "open" },
      include: { user: true },
      orderBy: { clockInAt: "asc" },
    }),
    prisma.timeEntry.aggregate({
      where: {
        organizationId: orgId,
        clockInAt: { gte: todayStart },
        status: "closed",
      },
      _sum: { minutesWorked: true },
      _count: true,
    }),
  ]);

  const weekMinutes = myRecent.reduce((sum, e) => sum + (e.minutesWorked ?? 0), 0);
  const teamMinutesToday = teamToday._sum.minutesWorked ?? 0;

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Operations"
        title="Time clock"
        description="Clock in, clock out, see who's on shift right now."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricTile
          label="You this week"
          value={formatMinutes(weekMinutes)}
          hint="Last 7 days of closed entries"
        />
        <MetricTile
          label="On shift now"
          value={teamOpen.length}
          hint={teamOpen.length === 0 ? "No one clocked in" : "Team members clocked in"}
        />
        <MetricTile
          label="Team hours today"
          value={formatMinutes(teamMinutesToday)}
          hint={`${teamToday._count} closed entries`}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your clock</CardTitle>
          <CardDescription>
            {myOpen
              ? `Clocked in at ${formatClock(myOpen.clockInAt)} · ${formatRelative(
                  myOpen.clockInAt,
                )}`
              : "You are not currently clocked in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myOpen ? (
            <form action={clockOutAction.bind(null, myOpen.id)}>
              <Button type="submit" variant="danger">
                Clock out
              </Button>
            </form>
          ) : (
            <form action={clockInAction}>
              <Button type="submit">Clock in</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your recent entries</CardTitle>
          </CardHeader>
          <CardContent>
            {myRecent.length === 0 ? (
              <EmptyState
                title="No entries in the last week"
                description="Clock in above to start your first entry."
              />
            ) : (
              <ul className="divide-y divide-border -mx-6">
                {myRecent.map((entry) => (
                  <li
                    key={entry.id}
                    className="px-6 py-3 flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="text-text font-medium">
                        {entry.clockInAt.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-text-subtle mt-0.5">
                        {formatClock(entry.clockInAt)}
                        {entry.clockOutAt ? ` – ${formatClock(entry.clockOutAt)}` : " – open"}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <Badge tone={entry.status === "open" ? "accent" : "neutral"}>
                        {entry.status}
                      </Badge>
                      <p className="text-xs text-text-muted mt-1">
                        {formatMinutes(entry.minutesWorked)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>On shift now</CardTitle>
          </CardHeader>
          <CardContent>
            {teamOpen.length === 0 ? (
              <EmptyState title="Nobody is clocked in" />
            ) : (
              <ul className="divide-y divide-border -mx-6">
                {teamOpen.map((entry) => (
                  <li
                    key={entry.id}
                    className="px-6 py-3 flex items-center gap-3 text-sm"
                  >
                    <Avatar
                      firstName={entry.user.firstName}
                      lastName={entry.user.lastName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-text font-medium">
                        {entry.user.firstName} {entry.user.lastName}
                      </p>
                      <p className="text-xs text-text-subtle">
                        Since {formatClock(entry.clockInAt)} · {formatRelative(entry.clockInAt)}
                      </p>
                    </div>
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

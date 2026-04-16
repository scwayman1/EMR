import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComingSoonButton } from "@/components/ui/coming-soon-button";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { Sparkline } from "@/components/ui/sparkline";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Home" };

export default async function PatientHome() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      chartSummary: true,
      outcomeLogs: { orderBy: { loggedAt: "asc" }, take: 30 },
      encounters: {
        where: { status: "scheduled" },
        orderBy: { scheduledFor: "asc" },
        take: 1,
      },
      tasks: {
        where: { status: "open" },
        orderBy: { dueAt: "asc" },
        take: 5,
      },
      messageThreads: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  if (!patient) {
    redirect("/portal/intake");
  }

  const painSeries = patient.outcomeLogs
    .filter((l) => l.metric === "pain")
    .map((l) => l.value);
  const sleepSeries = patient.outcomeLogs
    .filter((l) => l.metric === "sleep")
    .map((l) => l.value);

  const nextVisit = patient.encounters[0];
  const intakeComplete = patient.chartSummary?.completenessScore ?? 0;

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow={`Welcome back, ${patient.firstName}`}
        title="How are you feeling today?"
        description="A quick check-in helps your care team see how things are trending between visits."
        actions={
          <Link href="/portal/outcomes/new">
            <Button size="md">Log a check-in</Button>
          </Link>
        }
      />

      {/* Top row: next action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Next visit</CardTitle>
              {nextVisit ? (
                <Badge tone="accent">Confirmed</Badge>
              ) : (
                <Badge tone="neutral">Not scheduled</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {nextVisit ? (
              <>
                <p className="text-base font-medium text-text">
                  {formatDate(nextVisit.scheduledFor)}
                </p>
                <p className="text-sm text-text-muted mt-1">
                  {nextVisit.modality === "video" ? "Video visit" : "In-person visit"}
                  {nextVisit.reason ? ` · ${nextVisit.reason}` : ""}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <ComingSoonButton size="sm">View details</ComingSoonButton>
                  <ComingSoonButton size="sm">Reschedule</ComingSoonButton>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                Once your intake is complete, your care team will help you find a time.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Chart readiness</CardTitle>
              <Badge tone={intakeComplete >= 80 ? "success" : "warning"}>
                {intakeComplete}%
              </Badge>
            </div>
            <CardDescription>
              Finishing your intake helps your care team prepare.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${intakeComplete}%` }}
              />
            </div>
            <div className="mt-4">
              <Link href="/portal/intake">
                <Button size="sm" variant="secondary">
                  {intakeComplete >= 100 ? "Review intake" : "Continue intake"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricTile
          label="Pain"
          value={
            painSeries.length > 0
              ? (painSeries[painSeries.length - 1]).toFixed(1)
              : "—"
          }
          hint="Last 30 days"
        />
        <MetricTile
          label="Sleep"
          value={
            sleepSeries.length > 0
              ? (sleepSeries[sleepSeries.length - 1]).toFixed(1)
              : "—"
          }
          hint="Last 30 days"
        />
        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Trend
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Sparkline data={painSeries.length > 1 ? painSeries : [3, 4, 4, 3, 3, 2]} />
          </div>
          <p className="text-xs text-text-subtle mt-2">Pain score trend</p>
        </div>
      </div>

      {/* Tasks + last message */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your next steps</CardTitle>
            <CardDescription>Short, focused actions from your care team.</CardDescription>
          </CardHeader>
          <CardContent>
            {patient.tasks.length === 0 ? (
              <EmptyState
                title="You're all caught up."
                description="We'll let you know when there's something new."
              />
            ) : (
              <ul className="divide-y divide-border -mx-6">
                {patient.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="px-6 py-4 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{task.title}</p>
                      {task.dueAt && (
                        <p className="text-xs text-text-subtle mt-1">
                          Due {formatDate(task.dueAt)}
                        </p>
                      )}
                    </div>
                    <ComingSoonButton size="sm">Open</ComingSoonButton>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest message</CardTitle>
          </CardHeader>
          <CardContent>
            {patient.messageThreads[0] ? (
              <>
                <p className="text-sm font-medium text-text">
                  {patient.messageThreads[0].subject}
                </p>
                <p className="text-sm text-text-muted mt-2 line-clamp-3">
                  {patient.messageThreads[0].messages[0]?.body ?? "No messages yet."}
                </p>
                <p className="text-xs text-text-subtle mt-3">
                  {formatRelative(patient.messageThreads[0].lastMessageAt)}
                </p>
                <div className="mt-4">
                  <Link href="/portal/messages">
                    <Button size="sm" variant="secondary">Open thread</Button>
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                No messages yet. Your care team will reach out after your first visit.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { Sparkline } from "@/components/ui/sparkline";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow, LeafSprig } from "@/components/ui/ornament";
import { AmbientOrb } from "@/components/ui/hero-art";
import { HealthPlant } from "@/components/ui/health-plant";
import { computePlantHealth, STAGE_LABELS } from "@/lib/domain/plant-health";
import { formatDate, formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Home" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Hello";
}

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

  const plantHealth = await computePlantHealth(patient.id);

  const painSeries = patient.outcomeLogs
    .filter((l) => l.metric === "pain")
    .map((l) => l.value);
  const sleepSeries = patient.outcomeLogs
    .filter((l) => l.metric === "sleep")
    .map((l) => l.value);

  const nextVisit = patient.encounters[0];
  const intakeComplete = patient.chartSummary?.completenessScore ?? 0;
  const latestPain = painSeries[painSeries.length - 1];
  const latestSleep = sleepSeries[sleepSeries.length - 1];

  return (
    <PageShell maxWidth="max-w-[1040px]">
      {/* ------------------ Hero greeting card ------------------ */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised ambient mb-10">
        <AmbientOrb className="absolute -right-10 top-0 h-[260px] w-[480px] opacity-90" />
        <div className="relative px-8 md:px-12 py-12 md:py-14 max-w-2xl">
          <Eyebrow className="mb-4">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight text-text">
            {greeting()},{" "}
            <span className="italic text-accent">{patient.firstName}</span>.
          </h1>
          <p className="text-[15px] text-text-muted mt-4 leading-relaxed max-w-lg">
            A quick check-in helps your care team see how things are trending
            between visits. It only takes a minute.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/portal/outcomes">
              <Button size="lg">Log today&apos;s check-in</Button>
            </Link>
            <Link href="/portal/messages">
              <Button size="lg" variant="secondary">
                Message your team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------ Next visit + chart readiness ------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <Card tone="raised" className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <LeafSprig size={16} className="text-accent/80" />
                Next visit
              </CardTitle>
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
                <p className="font-display text-2xl text-text tracking-tight">
                  {formatDate(nextVisit.scheduledFor)}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge tone={nextVisit.modality === "video" ? "info" : "accent"}>
                    {nextVisit.modality === "video"
                      ? "Video visit"
                      : nextVisit.modality === "phone"
                        ? "Phone visit"
                        : "In-person"}
                  </Badge>
                  {nextVisit.reason && (
                    <Badge tone="neutral">{nextVisit.reason}</Badge>
                  )}
                </div>
                {nextVisit.scheduledFor && (
                  <p className="text-sm text-text mt-3">
                    {new Date(nextVisit.scheduledFor).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {formatRelative(nextVisit.scheduledFor)}
                  </p>
                )}
                <div className="mt-5 flex items-center gap-2 flex-wrap">
                  <Button size="sm">
                    Confirm appointment
                  </Button>
                  <Button size="sm" variant="ghost">
                    Change appointment
                  </Button>
                  <a href="/api/appointments/ical" download>
                    <Button size="sm" variant="ghost">
                      Add to calendar
                    </Button>
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                Once your intake is complete, your care team will help you find
                a time that works.
              </p>
            )}
          </CardContent>
        </Card>

        <Card tone="raised" className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <LeafSprig size={16} className="text-accent/80" />
                Chart readiness
              </CardTitle>
              <Badge tone={intakeComplete >= 80 ? "success" : "warning"}>
                {intakeComplete}%
              </Badge>
            </div>
            <CardDescription>
              Finishing your intake helps your care team prepare.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-2.5 bg-surface-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-[#3A8560] rounded-full transition-all duration-700 ease-smooth"
                style={{ width: `${intakeComplete}%` }}
              />
            </div>
            <div className="mt-5">
              <Link href="/portal/intake">
                <Button size="sm" variant="secondary">
                  {intakeComplete >= 100 ? "Review intake" : "Continue intake"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------ Metrics ------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <MetricTile
          label="Pain"
          accent="forest"
          value={latestPain !== undefined ? latestPain.toFixed(1) : "—"}
          hint="Last 30 days · 0-10 scale"
        />
        <MetricTile
          label="Sleep"
          accent="amber"
          value={latestSleep !== undefined ? latestSleep.toFixed(1) : "—"}
          hint="Last 30 days · 0-10 scale"
        />
        <div className="relative bg-surface-raised border border-border rounded-xl p-5 shadow-sm overflow-hidden">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
            Trend
          </p>
          <Sparkline
            data={painSeries.length > 1 ? painSeries : [3, 4, 4, 3, 3, 2]}
            width={240}
            height={56}
          />
          <p className="text-xs text-text-subtle mt-2">Pain score trend</p>
        </div>
      </div>

      {/* ------------------ Plant companion widget ------------------ */}
      <div className="mb-8">
        <Link href="/portal/garden" className="block">
          <Card tone="raised" className="card-hover">
            <CardContent className="flex items-center gap-6 py-5">
              <div className="shrink-0">
                <HealthPlant health={plantHealth} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                  Your plant companion
                </p>
                <p className="font-display text-lg text-text tracking-tight">
                  {STAGE_LABELS[plantHealth.stage]}
                </p>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  {plantHealth.score >= 71
                    ? "Your plant is thriving because you\u2019ve been consistent with your check-ins and visits."
                    : plantHealth.score >= 40
                      ? "Your plant is growing nicely. A few more check-ins would help it flourish."
                      : "Your plant needs a little love. Try logging how you\u2019re feeling today."}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {plantHealth.healthFactors
                    .filter((f) => f.status !== "neutral")
                    .slice(0, 3)
                    .map((f) => (
                      <Badge
                        key={f.label}
                        tone={f.status === "positive" ? "success" : "warning"}
                      >
                        {f.label}
                      </Badge>
                    ))}
                  <span className="text-xs text-accent font-medium ml-1">
                    See your garden &rarr;
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ------------------ Tasks + last message ------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your next steps</CardTitle>
            <CardDescription>
              Short, focused actions from your care team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patient.tasks.length === 0 ? (
              <EmptyState
                title="You're all caught up."
                description="We'll let you know when there's something new."
              />
            ) : (
              <ul className="divide-y divide-border/70 -mx-6">
                {patient.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-surface-muted/40 transition-colors"
                  >
                    <div className="flex gap-3 min-w-0">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text">{task.title}</p>
                        {task.dueAt && (
                          <p className="text-xs text-text-subtle mt-1">
                            Due {formatDate(task.dueAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="secondary">
                      Open
                    </Button>
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
                <p className="text-sm text-text-muted mt-2 line-clamp-3 leading-relaxed">
                  {patient.messageThreads[0].messages[0]?.body ?? "No messages yet."}
                </p>
                <p className="text-xs text-text-subtle mt-3">
                  {formatRelative(patient.messageThreads[0].lastMessageAt)}
                </p>
                <div className="mt-5">
                  <Link href="/portal/messages">
                    <Button size="sm" variant="secondary">
                      Open thread
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted leading-relaxed">
                No messages yet. Your care team will reach out after your first
                visit.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

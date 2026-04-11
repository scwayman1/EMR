import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata = { title: "Schedule" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfWeek(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  n.setDate(n.getDate() - n.getDay());
  return n;
}

function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDayNumber(d: Date): string {
  return d.getDate().toString();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MODALITY_LABEL: Record<string, string> = {
  in_person: "In-person",
  video: "Video",
  phone: "Phone",
};

const MODALITY_TONE: Record<string, "accent" | "info" | "neutral"> = {
  in_person: "accent",
  video: "info",
  phone: "neutral",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "accent"> = {
  confirmed: "success",
  requested: "warning",
  completed: "neutral",
  cancelled: "danger",
  no_show: "danger",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SchedulePage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);

  const [appointments, providers] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        patient: { organizationId },
        startAt: { gte: weekStart, lt: weekEnd },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, id: true } },
        provider: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.provider.findMany({
      where: { organizationId, active: true },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  // Group by day
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return {
      date: d,
      appointments: appointments.filter((a) => isSameDay(a.startAt, d)),
    };
  });

  // Stats
  const totalThisWeek = appointments.length;
  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const requestedCount = appointments.filter((a) => a.status === "requested").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const today = new Date();
  const todayCount = appointments.filter((a) => isSameDay(a.startAt, today)).length;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Practice management"
        title="Schedule"
        description={`Week of ${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} — ${addDays(weekStart, 6).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="This week" value={totalThisWeek} />
        <StatCard label="Today" value={todayCount} tone="accent" />
        <StatCard label="Confirmed" value={confirmedCount} tone="success" />
        <StatCard label="Requested" value={requestedCount} tone="warning" />
        <StatCard label="Completed" value={completedCount} tone="neutral" />
      </div>

      {/* Week view */}
      <div className="mb-4">
        <Eyebrow>Week view</Eyebrow>
      </div>

      {totalThisWeek === 0 ? (
        <EmptyState
          title="No appointments this week"
          description="New appointments will appear here as patients book or providers schedule."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
          {days.map((day) => {
            const isToday = isSameDay(day.date, today);
            return (
              <div
                key={day.date.toISOString()}
                className={`bg-surface-raised rounded-xl border ${
                  isToday ? "border-accent/50 shadow-md" : "border-border"
                } overflow-hidden flex flex-col`}
              >
                {/* Day header */}
                <div
                  className={`px-4 py-3 border-b ${
                    isToday
                      ? "bg-accent/10 border-accent/20"
                      : "bg-surface-muted/40 border-border"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <p
                      className={`text-[11px] font-medium uppercase tracking-wider ${
                        isToday ? "text-accent" : "text-text-subtle"
                      }`}
                    >
                      {formatDayLabel(day.date)}
                      {isToday && " · Today"}
                    </p>
                    <p
                      className={`font-display text-lg ${
                        isToday ? "text-accent" : "text-text"
                      }`}
                    >
                      {formatDayNumber(day.date)}
                    </p>
                  </div>
                </div>

                {/* Appointments */}
                <div className="p-2 space-y-1.5 flex-1 min-h-[240px]">
                  {day.appointments.length === 0 ? (
                    <p className="text-[11px] text-text-subtle text-center py-4 italic">
                      No visits
                    </p>
                  ) : (
                    day.appointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="rounded-lg border border-border/60 bg-surface p-2.5 hover:border-accent/40 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Avatar
                            firstName={appt.patient.firstName}
                            lastName={appt.patient.lastName}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-text truncate">
                              {appt.patient.firstName} {appt.patient.lastName}
                            </p>
                            <p className="text-[10px] text-text-subtle tabular-nums">
                              {formatTime(appt.startAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <Badge
                            tone={MODALITY_TONE[appt.modality] ?? "neutral"}
                            className="text-[9px]"
                          >
                            {MODALITY_LABEL[appt.modality] ?? appt.modality}
                          </Badge>
                          <Badge
                            tone={STATUS_TONE[appt.status] ?? "neutral"}
                            className="text-[9px]"
                          >
                            {appt.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provider legend */}
      {providers.length > 0 && (
        <div className="mt-10">
          <Eyebrow className="mb-3">Providers this week</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {providers.map((provider) => {
              const providerAppts = appointments.filter(
                (a) => a.providerId === provider.id,
              );
              return (
                <Card key={provider.id} tone="raised">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-3">
                      <Avatar
                        firstName={provider.user.firstName}
                        lastName={provider.user.lastName}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {provider.user.firstName} {provider.user.lastName}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {provider.title ?? "Provider"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl text-accent tabular-nums">
                          {providerAppts.length}
                        </p>
                        <p className="text-[10px] text-text-subtle">visits</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "accent" | "success" | "warning" | "neutral";
}) {
  const colors = {
    accent: "text-accent",
    success: "text-success",
    warning: "text-[color:var(--warning)]",
    neutral: "text-text",
  };
  return (
    <Card tone="raised">
      <CardContent className="pt-5 pb-5">
        <p className={`font-display text-3xl tabular-nums ${colors[tone]}`}>
          {value}
        </p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

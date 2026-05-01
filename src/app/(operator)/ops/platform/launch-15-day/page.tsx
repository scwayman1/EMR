import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LAUNCH_PLAN,
  dayCompletion,
  nextBlocker,
  overallReadiness,
  type LaunchProgress,
  type OwnerRole,
  type TaskState,
} from "@/lib/platform/launch-readiness";

export const metadata = { title: "15-day launch readiness" };

const OWNER_LABEL: Record<OwnerRole, string> = {
  practice_owner: "Practice owner",
  clinician: "Clinician",
  operator: "Operator",
  biller: "Biller",
  compliance: "Compliance",
  leafjourney_csm: "Leafjourney CSM",
};

const STATE_TONE: Record<
  TaskState,
  "neutral" | "info" | "success" | "warning"
> = {
  pending: "neutral",
  in_progress: "info",
  done: "success",
  skipped: "warning",
};

const STATE_LABEL: Record<TaskState, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  skipped: "Skipped",
};

// Demo progress: days 1-3 fully done, day 4 in flight, the rest pending.
// Replaced by Prisma-backed practice progress when the launch agent ships.
const DEMO_PROGRESS: LaunchProgress = {
  startedAt: "2026-04-22",
  states: {
    "d1-org-create": "done",
    "d1-baa": "done",
    "d1-branding": "done",
    "d2-invite-clinician": "done",
    "d2-invite-ops": "done",
    "d2-cme": "skipped",
    "d3-state-rules": "done",
    "d3-controlled-rx": "in_progress",
    "d4-intake-template": "in_progress",
    "d4-apso-template": "pending",
  },
};

function fmtMinutes(n: number): string {
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default async function LaunchFifteenDayPage() {
  await requireUser();

  const progress = DEMO_PROGRESS;
  const overall = overallReadiness(progress);
  const blocker = nextBlocker(progress);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Platform · EMR-173"
        title="15-day launch readiness"
        description="Day-by-day plan a brand-new cannabis clinic follows to be live in 15 business days. Each day has an exit criterion; blockers must close before the day does."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
        <Card tone="raised">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              Days ready
            </p>
            <p className="font-display text-3xl mt-2 tabular-nums">
              {overall.daysReady}
              <span className="text-text-muted text-lg"> / 15</span>
            </p>
            <p className="text-xs text-text-muted mt-1">
              All blockers closed for this many days.
            </p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              Tasks done
            </p>
            <p className="font-display text-3xl mt-2 tabular-nums">
              {overall.doneTasks}
              <span className="text-text-muted text-lg">
                {" "}
                / {overall.totalTasks}
              </span>
            </p>
            <p className="text-xs text-text-muted mt-1">{overall.pct}% complete.</p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              Time invested
            </p>
            <p className="font-display text-3xl mt-2 tabular-nums">
              {fmtMinutes(overall.totalEtaMinutes - overall.remainingEtaMinutes)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {fmtMinutes(overall.remainingEtaMinutes)} remaining of{" "}
              {fmtMinutes(overall.totalEtaMinutes)} total.
            </p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              Started
            </p>
            <p className="font-display text-3xl mt-2 tabular-nums">
              {progress.startedAt ? new Date(progress.startedAt).toLocaleDateString() : "—"}
            </p>
            <p className="text-xs text-text-muted mt-1">
              ETA day 15:{" "}
              {progress.startedAt
                ? new Date(
                    new Date(progress.startedAt).getTime() +
                      14 * 24 * 60 * 60 * 1000,
                  ).toLocaleDateString()
                : "—"}
              .
            </p>
          </CardContent>
        </Card>
      </div>

      {blocker && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Next blocker</CardTitle>
                <CardDescription>
                  This is the next required task. Until it closes, day{" "}
                  {blocker.day} cannot release.
                </CardDescription>
              </div>
              <Badge tone="warning">Day {blocker.day}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{blocker.task.title}</p>
            <p className="text-sm text-text-muted mt-1">{blocker.task.detail}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
              <Badge tone="neutral">{OWNER_LABEL[blocker.task.owner]}</Badge>
              <Badge tone="info">{fmtMinutes(blocker.task.etaMinutes)}</Badge>
              <span className="font-mono text-text-subtle">
                {blocker.task.surface}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        {LAUNCH_PLAN.map((day) => {
          const dc = dayCompletion(day.day, progress);
          return (
            <Card key={day.day}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>
                      Day {day.day} — {day.theme}
                    </CardTitle>
                    <CardDescription>{day.exitCriteria}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={dc.ready ? "success" : "neutral"}>
                      {dc.ready ? "Ready" : `${dc.pct}%`}
                    </Badge>
                    {dc.blockersOpen > 0 && (
                      <Badge tone="warning">
                        {dc.blockersOpen} blocker{dc.blockersOpen === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {day.tasks.map((t) => {
                    const state =
                      (progress.states[t.id] as TaskState | undefined) ??
                      "pending";
                    return (
                      <li
                        key={t.id}
                        className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{t.title}</p>
                              {t.blocker && (
                                <Badge tone="warning">Blocker</Badge>
                              )}
                            </div>
                            <p className="text-sm text-text-muted mt-1">
                              {t.detail}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                              <Badge tone="neutral">
                                {OWNER_LABEL[t.owner]}
                              </Badge>
                              <Badge tone="info">{fmtMinutes(t.etaMinutes)}</Badge>
                              <span className="font-mono text-text-subtle">
                                {t.surface}
                              </span>
                            </div>
                          </div>
                          <Badge tone={STATE_TONE[state]}>
                            {STATE_LABEL[state]}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <p className="text-[11px] text-text-subtle italic text-center mt-8">
        Demo progress shown. Per-practice progress lands when the launch agent
        connects to Prisma.
      </p>
    </PageShell>
  );
}

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeafSprig } from "@/components/ui/ornament";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";
import { revalidatePath } from "next/cache";
import { LaunchChecklist } from "./launch-checklist";

export const metadata = { title: "Practice launch" };

async function refreshLaunch() {
  "use server";
  const user = await requireUser();
  if (!user.organizationId) return;
  await dispatch({
    name: "practice.onboarding.started",
    organizationId: user.organizationId,
  });
  if (process.env.NODE_ENV !== "production") {
    await runTick("inline-dev", 2);
  }
  revalidatePath("/ops/launch");
  revalidatePath("/ops");
}

// Demo history for readiness score timeline
const DEMO_HISTORY = [
  { date: "Mar 15", score: 12, note: "Initial assessment" },
  { date: "Mar 22", score: 28, note: "Added clinician profiles" },
  { date: "Mar 29", score: 45, note: "Intake form configured" },
  { date: "Apr 2", score: 58, note: "EHR integration connected" },
  { date: "Apr 5", score: 72, note: "Compliance docs uploaded" },
  { date: "Apr 8", score: 85, note: "Test patients processed" },
];

export default async function LaunchPage() {
  const user = await requireUser();
  const status = await prisma.practiceLaunchStatus.findUnique({
    where: { organizationId: user.organizationId! },
  });

  const blockers = (status?.blockers ?? []) as string[];
  const nextSteps = (status?.nextSteps ?? []) as string[];
  const currentScore = status?.readinessScore ?? 0;

  // Trim demo history to only points <= current score, or show all if current is high
  const visibleHistory = DEMO_HISTORY.filter((h) => h.score <= currentScore + 5);

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Practice launch"
        title="Go-live readiness"
        description="What's left before your practice can accept its first real patient."
        actions={
          <form action={refreshLaunch}>
            <Button type="submit" variant="secondary">
              Refresh
            </Button>
          </form>
        }
      />

      {/* ---- Score hero ---- */}
      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Readiness score</CardTitle>
          <CardDescription>Evaluated by the Practice Launch agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <span className="font-display text-5xl font-medium text-text tabular-nums leading-none">
                {currentScore}
              </span>
              <span className="text-lg text-text-muted ml-1">%</span>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-surface-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-[#3A8560] rounded-full transition-all"
                  style={{ width: `${currentScore}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-text-subtle">0%</span>
                <span className="text-[10px] text-text-subtle">Ready to launch</span>
                <span className="text-[10px] text-text-subtle">100%</span>
              </div>
            </div>
          </div>

          {/* ---- Score timeline ---- */}
          {visibleHistory.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
                Progress history
              </p>
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border-strong/40" />
                <ul className="space-y-3">
                  {visibleHistory.map((h, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-6 top-1.5 h-[9px] w-[9px] rounded-full border-2 border-surface-raised bg-accent" />
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-text tabular-nums">
                          {h.score}%
                        </span>
                        <span className="text-[10px] text-text-subtle font-mono">{h.date}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{h.note}</p>
                    </li>
                  ))}
                  {/* Current score marker */}
                  <li className="relative">
                    <span className="absolute -left-6 top-1.5 h-[9px] w-[9px] rounded-full border-2 border-surface-raised bg-highlight" />
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-accent tabular-nums">
                        {currentScore}%
                      </span>
                      <Badge tone="accent" className="!text-[9px]">current</Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">Latest evaluation</p>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Blockers & Next steps ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Blockers</CardTitle>
              {blockers.length > 0 && (
                <Badge tone="danger">{blockers.length}</Badge>
              )}
            </div>
            <CardDescription>Issues that must be resolved before go-live.</CardDescription>
          </CardHeader>
          <CardContent>
            {blockers.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-accent">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                No blockers. Looking good!
              </div>
            ) : (
              <ul className="space-y-3">
                {blockers.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <span className="mt-1 h-5 w-5 rounded-md border border-red-200 bg-red-50 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" className="text-danger">
                        <path
                          d="M2 2L8 8M8 2L2 8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="text-sm text-text-muted leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Next steps</CardTitle>
              {nextSteps.length > 0 && (
                <Badge tone="accent">{nextSteps.length}</Badge>
              )}
            </div>
            <CardDescription>Mark items complete as you work through them.</CardDescription>
          </CardHeader>
          <CardContent>
            {nextSteps.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-accent">
                <LeafSprig size={16} className="text-accent" />
                All steps complete!
              </div>
            ) : (
              <LaunchChecklist items={nextSteps} />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

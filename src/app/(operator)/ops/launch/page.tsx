import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";
import { revalidatePath } from "next/cache";

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

export default async function LaunchPage() {
  const user = await requireUser();
  const status = await prisma.practiceLaunchStatus.findUnique({
    where: { organizationId: user.organizationId! },
  });

  const blockers = (status?.blockers ?? []) as string[];
  const nextSteps = (status?.nextSteps ?? []) as string[];

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

      <Card>
        <CardHeader>
          <CardTitle>Readiness score</CardTitle>
          <CardDescription>Evaluated by the Practice Launch agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-4xl font-semibold text-text tabular-nums">
              {status?.readinessScore ?? 0}%
            </div>
            <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${status?.readinessScore ?? 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Blockers</CardTitle>
          </CardHeader>
          <CardContent>
            {blockers.length === 0 ? (
              <p className="text-sm text-text-muted">No blockers.</p>
            ) : (
              <ul className="space-y-2">
                {blockers.map((b) => (
                  <li key={b} className="text-sm text-text-muted flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning inline-block shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {nextSteps.map((s) => (
                <li key={s} className="text-sm text-text-muted flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent inline-block shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

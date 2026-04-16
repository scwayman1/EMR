import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Training" };

export default async function OpsTrainingPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const [modules, myCompletions, recentCompletions] = await Promise.all([
    prisma.trainingModule.findMany({
      where: { organizationId: orgId, active: true },
      include: {
        completions: true,
        _count: { select: { completions: true } },
      },
      orderBy: [{ required: "desc" }, { createdAt: "asc" }],
    }),
    prisma.trainingCompletion.findMany({
      where: { userId: user.id },
      select: { moduleId: true },
    }),
    prisma.trainingCompletion.findMany({
      where: { module: { organizationId: orgId } },
      include: { user: true, module: true },
      orderBy: { completedAt: "desc" },
      take: 8,
    }),
  ]);

  const completedByMe = new Set(myCompletions.map((c) => c.moduleId));
  const requiredModules = modules.filter((m) => m.required);
  const requiredCompletedByMe = requiredModules.filter((m) => completedByMe.has(m.id)).length;
  const myPct = requiredModules.length === 0
    ? 100
    : Math.round((requiredCompletedByMe / requiredModules.length) * 100);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Operations"
        title="Training"
        description="Staff education modules, required compliance topics, and completion tracking."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricTile label="Active modules" value={modules.length} />
        <MetricTile
          label="Required topics"
          value={requiredModules.length}
          hint="Compliance / onboarding"
        />
        <MetricTile
          label="Your required progress"
          value={`${myPct}%`}
          hint={`${requiredCompletedByMe} of ${requiredModules.length} required`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-subtle">
            Module catalog
          </h2>
          {modules.length === 0 ? (
            <EmptyState
              title="No training modules yet"
              description="Modules you add will appear here for the team to complete."
            />
          ) : (
            modules.map((module) => {
              const mine = completedByMe.has(module.id);
              return (
                <Card key={module.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{module.title}</CardTitle>
                        {module.description && (
                          <CardDescription>{module.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {module.required && <Badge tone="warning">Required</Badge>}
                        <Badge tone={mine ? "success" : "neutral"}>
                          {mine ? "Done" : "Not done"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <div className="flex flex-wrap gap-1.5">
                        {module.topics.map((topic) => (
                          <Badge key={topic} tone="neutral">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                      <div className="tabular-nums">
                        {module.durationMinutes}m ·{" "}
                        {module._count.completions} completion
                        {module._count.completions === 1 ? "" : "s"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent completions</CardTitle>
            <CardDescription>Latest sign-offs across the team.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCompletions.length === 0 ? (
              <p className="text-sm text-text-muted">No completions yet.</p>
            ) : (
              <ul className="divide-y divide-border -mx-6">
                {recentCompletions.map((c) => (
                  <li key={c.id} className="px-6 py-3 text-sm">
                    <p className="font-medium text-text">
                      {c.user.firstName} {c.user.lastName}
                    </p>
                    <p className="text-xs text-text-subtle">
                      {c.module.title} · {formatRelative(c.completedAt)}
                    </p>
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

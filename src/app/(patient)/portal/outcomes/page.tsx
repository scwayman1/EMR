import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Outcomes" };

const METRICS = ["pain", "sleep", "anxiety", "mood"] as const;

export default async function OutcomesPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: { outcomeLogs: { orderBy: { loggedAt: "asc" }, take: 200 } },
  });

  if (!patient) {
    return (
      <PageShell maxWidth="max-w-[960px]">
        <EmptyState title="No patient profile yet" />
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Outcomes"
        title="How you've been feeling"
        description="Your trends over time. Shared with your care team to guide your plan."
        actions={
          <Link href="/portal/outcomes/new">
            <Button size="md">Log a check-in</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRICS.map((metric) => {
          const series = patient.outcomeLogs
            .filter((l) => l.metric === metric)
            .map((l) => l.value);
          const latest = series[series.length - 1];
          return (
            <Card key={metric}>
              <CardHeader>
                <CardTitle className="capitalize">{metric}</CardTitle>
                <CardDescription>
                  {latest !== undefined ? `Latest: ${latest.toFixed(1)} / 10` : "No data yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Sparkline data={series.length > 1 ? series : [0, 0]} width={260} height={56} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

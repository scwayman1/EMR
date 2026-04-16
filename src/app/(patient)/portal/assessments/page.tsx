import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils/format";
import { getAssessmentDefinition } from "@/lib/domain/assessments";

export const metadata = { title: "Assessments" };

export default async function AssessmentsPage() {
  const user = await requireRole("patient");

  const [assessments, patient] = await Promise.all([
    prisma.assessment.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.patient.findUnique({ where: { userId: user.id }, select: { id: true } }),
  ]);

  // Pull latest response per assessment for this patient in one query.
  const latestByAssessmentId = new Map<string, { score: number | null; submittedAt: Date; interpretation: string | null }>();
  if (patient) {
    const responses = await prisma.assessmentResponse.findMany({
      where: { patientId: patient.id },
      orderBy: { submittedAt: "desc" },
    });
    for (const r of responses) {
      if (!latestByAssessmentId.has(r.assessmentId)) {
        latestByAssessmentId.set(r.assessmentId, {
          score: r.score,
          submittedAt: r.submittedAt,
          interpretation: r.interpretation,
        });
      }
    }
  }

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Assessments"
        title="Quick check-ins"
        description="Short questionnaires that help your care team track how you're doing between visits."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessments.map((a) => {
          const runnable = getAssessmentDefinition(a.slug) !== null;
          const latest = latestByAssessmentId.get(a.id);
          return (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle>{a.title}</CardTitle>
                    <CardDescription>{a.description}</CardDescription>
                  </div>
                  {latest && (
                    <Badge tone="accent" className="tabular-nums shrink-0">
                      Last: {latest.score?.toFixed(0) ?? "\u2014"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {latest && (
                  <p className="text-xs text-text-subtle">
                    {latest.interpretation ?? "Submitted"} &middot;{" "}
                    {formatRelative(latest.submittedAt)}
                  </p>
                )}
                {runnable ? (
                  <Link href={`/portal/assessments/${a.slug}`}>
                    <Button size="sm" variant={latest ? "secondary" : "primary"}>
                      {latest ? "Take it again" : "Start"}
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" variant="secondary" disabled title="This assessment isn't wired up yet">
                    Not available
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

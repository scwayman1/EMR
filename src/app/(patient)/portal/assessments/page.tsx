import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils/format";
import { TEMPLATES } from "./[slug]/templates";

export const metadata = { title: "Assessments" };

export default async function AssessmentsPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
  });

  // Load all previous responses for this patient, ordered newest first
  const responses = patient
    ? await prisma.assessmentResponse.findMany({
        where: { patientId: patient.id },
        orderBy: { submittedAt: "desc" },
        include: { assessment: true },
      })
    : [];

  // Group responses by assessment slug for display
  const responsesBySlug: Record<
    string,
    { score: number | null; interpretation: string | null; submittedAt: Date }[]
  > = {};

  for (const r of responses) {
    const slug = r.assessment.slug;
    if (!responsesBySlug[slug]) responsesBySlug[slug] = [];
    responsesBySlug[slug].push({
      score: r.score,
      interpretation: r.interpretation,
      submittedAt: r.submittedAt,
    });
  }

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Assessments"
        title="Quick check-ins"
        description="Short questionnaires that help your care team track how you're doing between visits."
      />

      <PatientSectionNav section="health" />
      {!patient ? (
        <EmptyState
          title="No patient profile yet"
          description="Complete your intake to unlock assessments."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TEMPLATES.map((t) => {
            const history = responsesBySlug[t.slug] ?? [];
            const latest = history[0];

            return (
              <Card key={t.slug} tone="raised" className="card-hover flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t.title}</CardTitle>
                    {latest && (
                      <Badge
                        tone={
                          latest.interpretation?.toLowerCase().includes("minimal") ||
                          latest.interpretation?.toLowerCase().includes("mild")
                            ? "success"
                            : latest.interpretation?.toLowerCase().includes("moderate")
                            ? "warning"
                            : latest.interpretation?.toLowerCase().includes("severe")
                            ? "danger"
                            : "neutral"
                        }
                      >
                        Score: {latest.score !== null ? latest.score : "--"}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-end">
                  {latest ? (
                    <div className="mb-4 p-3 rounded-lg bg-surface-muted/60 border border-border/50">
                      <p className="text-xs text-text-subtle mb-1">
                        Last taken {formatDate(latest.submittedAt)}
                      </p>
                      <p className="text-sm text-text-muted leading-relaxed line-clamp-2">
                        {latest.interpretation}
                      </p>
                      {history.length > 1 && (
                        <p className="text-xs text-text-subtle mt-1.5">
                          {history.length} total responses on file
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-text-subtle mb-4">
                      Not yet taken -- takes about 2 minutes.
                    </p>
                  )}

                  <Link href={`/portal/assessments/${t.slug}`}>
                    <Button size="sm" variant="secondary" className="w-full">
                      {latest ? "Take again" : "Start"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

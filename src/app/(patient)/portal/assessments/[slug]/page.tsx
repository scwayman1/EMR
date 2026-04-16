import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils/format";
import { getAssessmentDefinition } from "@/lib/domain/assessments";
import { AssessmentForm } from "./assessment-form";

interface PageProps {
  params: { slug: string };
  searchParams: { done?: string };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const def = getAssessmentDefinition(params.slug);
  return { title: def ? def.title : "Assessment" };
}

export default async function AssessmentRunnerPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireRole("patient");
  const def = getAssessmentDefinition(params.slug);
  if (!def) notFound();

  const assessment = await prisma.assessment.findUnique({
    where: { slug: params.slug },
  });
  if (!assessment) notFound();

  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });

  const priorResponses = patient
    ? await prisma.assessmentResponse.findMany({
        where: { patientId: patient.id, assessmentId: assessment.id },
        orderBy: { submittedAt: "desc" },
        take: 5,
      })
    : [];

  const justSubmitted = searchParams.done === "1";
  const latest = priorResponses[0];

  return (
    <PageShell maxWidth="max-w-[720px]">
      <div className="mb-4">
        <Link
          href="/portal/assessments"
          className="text-xs text-text-muted hover:text-text"
        >
          &larr; All assessments
        </Link>
      </div>

      <PageHeader
        eyebrow="Assessment"
        title={def.title}
        description={assessment.description ?? undefined}
      />

      {justSubmitted && latest && (
        <Card className="mb-6 border-success/30 bg-emerald-50/30">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Thanks for checking in</CardTitle>
                <CardDescription>
                  Your latest result is visible to your care team.
                </CardDescription>
              </div>
              <Badge tone="success">Score {latest.score?.toFixed(0) ?? "\u2014"}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted">{latest.interpretation}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{justSubmitted ? "Take it again" : "Take the assessment"}</CardTitle>
          <CardDescription>{def.intro}</CardDescription>
        </CardHeader>
        <CardContent>
          <AssessmentForm def={def} />
        </CardContent>
      </Card>

      {priorResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your recent results</CardTitle>
            <CardDescription>Most recent first.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border -mx-6">
              {priorResponses.map((r) => (
                <li
                  key={r.id}
                  className="px-6 py-3 flex items-center justify-between text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-text">
                      {r.interpretation ?? "Submitted"}
                    </p>
                    <p className="text-xs text-text-subtle mt-0.5">
                      {formatRelative(r.submittedAt)}
                    </p>
                  </div>
                  <Badge tone="neutral" className="tabular-nums">
                    {r.score?.toFixed(0) ?? "\u2014"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}

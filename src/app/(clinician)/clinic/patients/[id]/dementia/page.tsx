import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { Avatar } from "@/components/ui/avatar";
import { DementiaScreenView } from "./dementia-screen-view";
import { DEMENTIA_ASSESSMENT_SLUG } from "@/lib/domain/dementia-screen";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Dementia screen" };

export default async function DementiaScreenPage({ params }: PageProps) {
  const user = await requireUser();

  const [patient, prior] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: params.id, organizationId: user.organizationId!, deletedAt: null },
    }),
    prisma.assessmentResponse.findMany({
      where: {
        patientId: params.id,
        assessment: { slug: DEMENTIA_ASSESSMENT_SLUG },
      },
      include: { assessment: true },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
  ]);

  if (!patient) notFound();

  return (
    <PageShell maxWidth="max-w-[960px]">
      <div className="mb-8">
        <Eyebrow className="mb-2">Cognitive screen · Mindspan</Eyebrow>
        <div className="flex items-center gap-4">
          <Avatar firstName={patient.firstName} lastName={patient.lastName} size="md" />
          <div>
            <h1 className="font-display text-2xl text-text tracking-tight">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-[14px] text-text-muted">
              ~3 minute hybrid (Mini-Cog + AD8). Score lands in the patient's
              assessment timeline. Run with patient + family informant when
              possible.
            </p>
          </div>
        </div>
      </div>
      <DementiaScreenView
        patientId={params.id}
        priorRuns={prior.map((r) => ({
          id: r.id,
          submittedAt: r.submittedAt.toISOString(),
          score: r.score,
          interpretation: r.interpretation,
        }))}
      />
    </PageShell>
  );
}

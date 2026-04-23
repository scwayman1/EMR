import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { VoiceRecorder } from "./voice-recorder";

interface PageProps {
  params: { id: string };
}

export default async function VoiceChartPage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      presentingConcerns: true,
      treatmentGoals: true,
    },
  });

  if (!patient) notFound();

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const dob = patient.dateOfBirth
    ? patient.dateOfBirth.toISOString().slice(0, 10)
    : null;

  return (
    <PageShell>
      <div className="mb-6">
        <Link
          href={`/clinic/patients/${patient.id}`}
          className="text-sm text-text-muted hover:text-accent transition-colors duration-200"
        >
          &larr; Back to {patientName}&apos;s chart
        </Link>
      </div>

      <PageHeader
        eyebrow="Voice-to-Chart"
        title="Ambient Documentation"
        description={`Record the visit with ${patientName} and let AI extract structured clinical notes.`}
      />

      <VoiceRecorder
        patientId={patient.id}
        patientName={patientName}
        patientDob={dob}
        presentingConcerns={patient.presentingConcerns}
        treatmentGoals={patient.treatmentGoals}
      />
    </PageShell>
  );
}

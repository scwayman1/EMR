import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { generateRoomUrl, PATIENT_CHECKLIST } from "@/lib/domain/telehealth";
import { VideoRoom } from "./video-room";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Telehealth Visit" };

export default async function TelehealthPage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
    include: {
      medications: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!patient) notFound();

  // Get or create an encounter for this telehealth visit
  const encounter = await prisma.encounter.findFirst({
    where: {
      patientId: params.id,
      modality: "video",
      status: { in: ["scheduled", "in_progress"] },
    },
    orderBy: { scheduledFor: "desc" },
  });

  const encounterId = encounter?.id ?? params.id;
  const roomUrl = generateRoomUrl(encounterId);

  return (
    <PageShell maxWidth="max-w-[1400px]">
      <VideoRoom
        patient={{
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          presentingConcerns: patient.presentingConcerns ?? null,
          medications: patient.medications.map((m) => ({
            name: m.name,
            dosage: m.dosage ?? null,
          })),
        }}
        roomUrl={roomUrl}
        encounterId={encounterId}
        checklist={PATIENT_CHECKLIST}
        providerName={`${user.firstName} ${user.lastName}`}
      />
    </PageShell>
  );
}

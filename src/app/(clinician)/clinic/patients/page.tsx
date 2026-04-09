import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { PatientListClient } from "./patient-list-client";

export const metadata = { title: "Patients" };

export default async function PatientsPage() {
  const user = await requireUser();
  const patients = await prisma.patient.findMany({
    where: { organizationId: user.organizationId!, deletedAt: null },
    include: { chartSummary: true },
    orderBy: { lastName: "asc" },
  });

  // Serialize dates for the client component
  const serialized = patients.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    status: p.status,
    presentingConcerns: p.presentingConcerns,
    completenessScore: p.chartSummary?.completenessScore ?? null,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Patients"
        title="All patients"
        description={`${patients.length} patient${patients.length === 1 ? "" : "s"} on record.`}
      />
      <PatientListClient patients={serialized} />
    </PageShell>
  );
}

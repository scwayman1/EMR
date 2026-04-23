import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import {
  getAvailableStates,
  getStateForm,
  autoPopulateForm,
} from "@/lib/domain/state-compliance";
import { ComplianceFormView } from "./compliance-form";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "State Compliance" };

export default async function CompliancePage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });

  if (!patient) notFound();

  // Load provider data for auto-population
  const provider = user.organizationId
    ? await prisma.provider.findFirst({
        where: { organizationId: user.organizationId },
        include: { user: true },
      })
    : null;

  // Load the latest encounter for service date context
  const latestEncounter = await prisma.encounter.findFirst({
    where: { patientId: params.id },
    orderBy: { scheduledFor: "desc" },
  });

  // Determine default state from patient address
  const defaultStateCode = patient.state ?? "CA";
  const availableStates = getAvailableStates();
  const defaultTemplate = getStateForm(defaultStateCode);

  // Auto-populate form fields from patient/encounter/provider data
  const prePopulated = defaultTemplate
    ? autoPopulateForm(
        defaultTemplate,
        {
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth,
          addressLine1: patient.addressLine1,
          city: patient.city,
          state: patient.state,
          postalCode: patient.postalCode,
          id: patient.id,
        },
        provider
          ? {
              firstName: provider.user.firstName,
              lastName: provider.user.lastName,
              title: provider.title,
            }
          : undefined,
        latestEncounter
          ? { scheduledFor: latestEncounter.scheduledFor }
          : undefined,
      )
    : {};

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <ComplianceFormView
        patient={{
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth?.toISOString() ?? null,
          addressLine1: patient.addressLine1 ?? null,
          city: patient.city ?? null,
          state: patient.state ?? null,
          postalCode: patient.postalCode ?? null,
        }}
        availableStates={availableStates}
        defaultStateCode={defaultStateCode}
        prePopulatedFields={prePopulated}
      />
    </PageShell>
  );
}

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { BookingCalendar } from "./booking-calendar";

export const metadata = { title: "Schedule Appointment" };

export default async function SchedulePage() {
  const user = await requireUser();

  // Load patient profile
  const patient = await prisma.patient.findFirst({
    where: { userId: user.id, deletedAt: null },
  });

  if (!patient) {
    return (
      <PageShell>
        <p className="text-text-muted">Patient profile not found.</p>
      </PageShell>
    );
  }

  // Load available providers in the patient's organization
  const providers = await prisma.provider.findMany({
    where: {
      organizationId: patient.organizationId,
      active: true,
    },
    include: { user: true },
    orderBy: { user: { lastName: "asc" } },
  });

  const providerList = providers.map((p) => ({
    id: p.id,
    name: `${p.user.firstName} ${p.user.lastName}`,
    title: p.title ?? "Provider",
  }));

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <BookingCalendar
        patientId={patient.id}
        providers={providerList}
      />
    </PageShell>
  );
}

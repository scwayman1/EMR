import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { BookingCalendar, type UpcomingAppointment } from "./booking-calendar";

export const metadata = { title: "Schedule Appointment" };

export default async function SchedulePage() {
  const user = await requireUser();

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

  const upcoming = await prisma.appointment.findMany({
    where: {
      patientId: patient.id,
      status: { in: ["requested", "confirmed"] },
      startAt: { gte: new Date() },
    },
    include: { provider: { include: { user: true } } },
    orderBy: { startAt: "asc" },
    take: 10,
  });

  const upcomingList: UpcomingAppointment[] = upcoming.map((a) => ({
    id: a.id,
    providerId: a.providerId,
    providerName: a.provider?.user
      ? `${a.provider.title ?? "Provider"} ${a.provider.user.firstName} ${a.provider.user.lastName}`.trim()
      : "Care team",
    startIso: a.startAt.toISOString(),
    endIso: a.endAt.toISOString(),
    status: a.status,
    modality: a.modality,
  }));

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <BookingCalendar
        patientId={patient.id}
        providers={providerList}
        upcoming={upcomingList}
      />
    </PageShell>
  );
}

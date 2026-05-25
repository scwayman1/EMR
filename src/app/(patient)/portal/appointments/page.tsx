import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentsCalendar } from "./appointments-calendar";
import type { CalendarEvent } from "@/components/ui/calendar";

export const metadata = { title: "Appointments" };

export default async function PortalAppointmentsPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findFirst({
    where: { userId: user.id, deletedAt: null },
  });
  if (!patient) redirect("/portal/intake");

  // Pull a generous window so month/week navigation has data.
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 14);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 60);

  const appointments = await prisma.appointment.findMany({
    where: {
      patientId: patient.id,
      startAt: { gte: windowStart, lt: windowEnd },
    },
    orderBy: { startAt: "asc" },
    include: {
      provider: {
        select: {
          title: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const events: CalendarEvent[] = appointments.map((a) => {
    const providerName = a.provider?.user
      ? `${a.provider.title ?? ""} ${a.provider.user.firstName ?? ""} ${a.provider.user.lastName ?? ""}`
          .replace(/\s+/g, " ")
          .trim()
      : "Visit";
    return {
      id: a.id,
      start: a.startAt.toISOString(),
      end: a.endAt.toISOString(),
      title: providerName,
      description: a.notes ?? undefined,
      color:
        a.status === "cancelled" || a.status === "no_show"
          ? "danger"
          : a.status === "confirmed"
            ? "accent"
            : "info",
    };
  });

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Appointments"
        title="Your visits"
        description="See upcoming and recent appointments at a glance."
        actions={
          <Link
            href="/portal/schedule"
            className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
          >
            Book new visit
          </Link>
        }
      />
      {events.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Once you book a visit it will show up on the calendar here."
        />
      ) : (
        <AppointmentsCalendar events={events} />
      )}
    </PageShell>
  );
}

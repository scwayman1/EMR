import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { MonthView } from "./month-view";
import type { CalendarEvent } from "@/components/ui/calendar";

export const metadata = { title: "Schedule — Month" };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export default async function ClinicianScheduleMonthPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const anchor = searchParams.month
    ? new Date(searchParams.month + "T12:00:00")
    : new Date();
  if (Number.isNaN(anchor.getTime())) anchor.setTime(Date.now());

  // Render 6 weeks (42 days) starting from the Sunday before the 1st.
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 42);

  const appointments = await prisma.appointment.findMany({
    where: {
      patient: { organizationId: orgId },
      startAt: { gte: gridStart, lt: gridEnd },
    },
    orderBy: { startAt: "asc" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const events: CalendarEvent[] = appointments.map((a) => {
    const isBlock = `${a.patient.firstName} ${a.patient.lastName}`.includes(
      "System CalendarBlock"
    );
    const title = isBlock
      ? a.notes?.replace(/\[CalendarBlock:.*?\]/, "").trim() || "Blocked"
      : `${a.patient.firstName} ${a.patient.lastName}`;
    return {
      id: a.id,
      start: a.startAt.toISOString(),
      end: a.endAt.toISOString(),
      title,
      patientId: a.patient.id,
      href: isBlock ? undefined : `/clinic/patients/${a.patient.id}`,
      color: isBlock
        ? "neutral"
        : a.status === "cancelled" || a.status === "no_show"
          ? "danger"
          : a.status === "confirmed"
            ? "accent"
            : "info",
    };
  });

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Schedule"
        title="Month view"
        description="Cross-week overview of clinic appointments."
        actions={
          <Link
            href="/clinic/schedule"
            className="text-xs font-medium text-accent hover:underline"
          >
            Back to Week →
          </Link>
        }
      />
      <MonthView initialDateIso={anchor.toISOString()} events={events} />
    </PageShell>
  );
}

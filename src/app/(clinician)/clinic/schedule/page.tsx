import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { ScheduleCalendar, type AppointmentDTO } from "./schedule-calendar";

export const metadata = { title: "Schedule" };

/**
 * EMR-182 — Clinician schedule calendar with day, week, and list views.
 * Grid uses square cells (one cell per 30-minute block) per the
 * whiteboard prompt; drag-to-reschedule lives client-side and round-
 * trips through rescheduleAppointmentAction.
 */
export default async function ClinicianSchedulePage({
  searchParams,
}: {
  searchParams: { week?: string; view?: string };
}) {
  const user = await requireUser();
  const orgId = user.organizationId!;

  // Pick the week the URL points at, or the current week. We anchor to
  // the Sunday before the requested date so server + client agree on
  // the grid origin.
  const anchorDate = searchParams.week
    ? new Date(searchParams.week + "T00:00:00")
    : new Date();
  if (Number.isNaN(anchorDate.getTime())) {
    anchorDate.setTime(Date.now());
  }
  const weekStart = startOfWeek(anchorDate);
  const weekEnd = addDays(weekStart, 7);

  const appointments = await prisma.appointment.findMany({
    where: {
      patient: { organizationId: orgId },
      startAt: { gte: weekStart, lt: weekEnd },
    },
    orderBy: { startAt: "asc" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      provider: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const dtos: AppointmentDTO[] = appointments.map((a) => ({
    id: a.id,
    patientId: a.patient.id,
    patientName: `${a.patient.firstName} ${a.patient.lastName}`,
    providerName: a.provider?.user
      ? `${a.provider.user.firstName ?? ""} ${a.provider.user.lastName ?? ""}`.trim()
      : null,
    startAtIso: a.startAt.toISOString(),
    endAtIso: a.endAt.toISOString(),
    status: a.status,
    modality: a.modality,
    notes: a.notes,
  }));

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <div className="mb-6">
        <Eyebrow className="mb-2">Schedule</Eyebrow>
        <h1 className="font-display text-3xl text-text tracking-tight">
          {formatWeekRange(weekStart)}
        </h1>
        <p className="text-[14px] text-text-muted mt-1.5">
          Drag an appointment to reschedule. Click a square to open the patient
          chart. Switch to list view for high-volume days.
        </p>
      </div>
      <ScheduleCalendar
        weekStartIso={weekStart.toISOString()}
        appointments={dtos}
        initialView={(searchParams.view as "day" | "week" | "list") ?? "week"}
      />
    </PageShell>
  );
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const startFmt = weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endFmt = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt} – ${endFmt}`;
}

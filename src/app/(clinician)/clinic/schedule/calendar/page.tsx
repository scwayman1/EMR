// EMR-182 — Schedule calendar overhaul.
//
// Day / week / month views with square 30-min time blocks, drag-to-
// create, drag-to-reschedule, color-coded by visit modality, and a
// provider filter. /print mode ditches the toolbar so the page can be
// run through a paper printer without bleed.

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import {
  CalendarGrid,
  type CalendarAppointment,
  type CalendarView,
} from "@/components/scheduling/CalendarGrid";
import {
  createAppointmentAction,
  rescheduleAppointmentAction,
} from "./actions";

export const metadata = { title: "Calendar" };

export default async function ClinicianCalendarPage({
  searchParams,
}: {
  searchParams: {
    view?: string;
    date?: string;
    provider?: string;
    print?: string;
  };
}) {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const view: CalendarView =
    searchParams.view === "day"
      ? "day"
      : searchParams.view === "month"
        ? "month"
        : "week";

  const anchor = parseAnchor(searchParams.date);
  const { rangeStart, rangeEnd } = computeRange(view, anchor);
  const printMode = searchParams.print === "1";
  const providerFilter = searchParams.provider || null;

  const [appointments, providers, patients] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        patient: { organizationId: orgId },
        startAt: { gte: rangeStart, lt: rangeEnd },
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
    }),
    prisma.provider.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.patient.findMany({
      where: { organizationId: orgId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
    }),
  ]);

  const apptDtos: CalendarAppointment[] = appointments.map((a) => ({
    id: a.id,
    patientId: a.patient.id,
    patientName: `${a.patient.firstName} ${a.patient.lastName}`,
    providerId: a.provider?.id ?? null,
    providerName: a.provider?.user
      ? `${a.provider.user.firstName ?? ""} ${a.provider.user.lastName ?? ""}`.trim()
      : null,
    startAtIso: a.startAt.toISOString(),
    endAtIso: a.endAt.toISOString(),
    status: a.status,
    modality: a.modality,
    notes: a.notes,
  }));

  const providerDtos = providers.map((p) => ({
    id: p.id,
    name:
      `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim() ||
      "Unnamed provider",
  }));

  const patientDtos = patients.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
  }));

  return (
    <PageShell maxWidth={printMode ? "max-w-[1280px]" : "max-w-[1320px]"}>
      {!printMode && (
        <div className="mb-6 print:hidden">
          <Eyebrow className="mb-2">Schedule</Eyebrow>
          <h1 className="font-display text-3xl text-text tracking-tight">
            {formatHeading(view, anchor)}
          </h1>
          <p className="text-[14px] text-text-muted mt-1.5">
            Drag a square to draft a new visit. Drag an existing appointment to
            reschedule. Print view strips the toolbar.
          </p>
        </div>
      )}

      {printMode && (
        <h1 className="font-display text-2xl mb-4">
          {formatHeading(view, anchor)} — clinic schedule
        </h1>
      )}

      <CalendarGrid
        anchorIso={anchor.toISOString()}
        appointments={apptDtos}
        providers={providerDtos}
        patients={patientDtos}
        initialView={view}
        initialProviderId={providerFilter}
        printMode={printMode}
        onCreate={createAppointmentAction}
        onReschedule={rescheduleAppointmentAction}
      />
    </PageShell>
  );
}

function parseAnchor(raw?: string): Date {
  if (!raw) return new Date();
  const d = new Date(raw + "T00:00:00");
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function computeRange(
  view: CalendarView,
  anchor: Date,
): { rangeStart: Date; rangeEnd: Date } {
  if (view === "day") {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { rangeStart: start, rangeEnd: end };
  }
  if (view === "month") {
    const start = new Date(anchor);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    // Pull a month +/- a week so leading/trailing days have appts.
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - 7);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() + 7);
    return { rangeStart: gridStart, rangeEnd: end };
  }
  // week
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { rangeStart: start, rangeEnd: end };
}

function formatHeading(view: CalendarView, anchor: Date): string {
  if (view === "day") {
    return anchor.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (view === "month") {
    return anchor.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }
  // week range
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startFmt = start.toLocaleDateString(undefined, {
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

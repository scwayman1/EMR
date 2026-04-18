import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import type { AuthedUser } from "@/lib/auth/session";
import { Tile } from "@/components/ui/tile";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

/**
 * Schedule tile — today's visits, cards sized by duration.
 *
 * Design intent (from the Mission Control sketch):
 *   - Each appointment card's height is proportional to its duration,
 *     so a 90-min intake reads visibly bigger than a 15-min follow-up.
 *   - Time, patient name, and a computed age are shown inline.
 *   - Empty + loading states are honest — no fake placeholders.
 *
 * Scope rules for this slice:
 *   - Clinicians see their own appointments when they have a Provider record,
 *     otherwise the org's full day.
 *   - Practice owners see the whole org. Separate handling is deliberate:
 *     they're looking at the practice, not their own clinical day.
 *   - Only today (local midnight → next local midnight).
 *   - Non-clickable cards for now. The hover-preview + patient deep link
 *     lands in the Patient Snapshot slice.
 */
export async function ScheduleTile({ user }: { user: AuthedUser }) {
  if (!user.organizationId) {
    return <ScheduleTileShell count={0} />;
  }

  // Scope to this provider's day when the user has a Provider record.
  // Owners always see the full org.
  const provider = user.roles.includes("clinician")
    ? await prisma.provider.findFirst({
        where: { userId: user.id, organizationId: user.organizationId },
        select: { id: true },
      })
    : null;

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      startAt: { gte: startOfDay, lt: endOfDay },
      patient: { organizationId: user.organizationId, deletedAt: null },
      ...(provider ? { providerId: provider.id } : {}),
    },
    orderBy: { startAt: "asc" },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
        },
      },
    },
    take: 12,
  });

  return (
    <ScheduleTileShell count={appointments.length}>
      {appointments.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <EmptyState
            title="No visits today"
            description="A quiet day. Time to catch up on notes."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1">
          {appointments.map((appt) => (
            <ScheduleCard
              key={appt.id}
              appointment={appt}
              nowTs={now.getTime()}
            />
          ))}
        </div>
      )}
    </ScheduleTileShell>
  );
}

function ScheduleTileShell({
  count,
  children,
}: {
  count: number;
  children?: React.ReactNode;
}) {
  const action = (
    <Link
      href="/clinic"
      className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
    >
      Full day →
    </Link>
  );

  return (
    <Tile
      eyebrow="Today"
      title={count > 0 ? `${count} visit${count === 1 ? "" : "s"}` : "Schedule"}
      icon="📅"
      span="2x2"
      action={action}
    >
      {children}
    </Tile>
  );
}

type AppointmentWithPatient = {
  id: string;
  startAt: Date;
  endAt: Date;
  modality: string;
  status: string;
  notes: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
  };
};

function ScheduleCard({
  appointment,
  nowTs,
}: {
  appointment: AppointmentWithPatient;
  nowTs: number;
}) {
  const durationMin = Math.max(
    15,
    Math.round(
      (appointment.endAt.getTime() - appointment.startAt.getTime()) / 60000
    )
  );

  const isUpcoming = appointment.startAt.getTime() > nowTs;
  const isPast = appointment.endAt.getTime() < nowTs;
  const isNow = !isUpcoming && !isPast;

  const age = computeAge(appointment.patient.dateOfBirth);
  const timeLabel = formatTimeRange(appointment.startAt, appointment.endAt);

  return (
    <Link
      href={`/clinic/patients/${appointment.patient.id}`}
      className={cn(
        "group block rounded-lg border px-3 py-2.5 transition-all",
        "hover:border-accent/40 hover:shadow-sm",
        isPast
          ? "bg-surface border-border/60 opacity-70"
          : isNow
            ? "bg-accent-soft/60 border-accent/40 ring-1 ring-accent/20"
            : "bg-surface border-border/80"
      )}
      style={{
        // Flex-grow proportional to duration — longer visits physically
        // read as taller cards inside the tile body.
        flexGrow: durationMin,
        flexBasis: 0,
        minHeight: "54px",
      }}
    >
      <div className="flex items-start justify-between gap-3 h-full">
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-[11px] font-medium tabular-nums text-text-subtle">
            {timeLabel}
            <span className="ml-1.5 text-text-subtle/70">· {durationMin}m</span>
          </p>
          <p className="text-sm font-medium text-text group-hover:text-accent transition-colors truncate">
            {appointment.patient.firstName} {appointment.patient.lastName}
            {age != null && (
              <span className="ml-1.5 text-text-subtle font-normal text-xs">
                · {age}y
              </span>
            )}
          </p>
          {appointment.notes && durationMin >= 30 && (
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
              {appointment.notes}
            </p>
          )}
        </div>
        {isNow && (
          <span
            className="shrink-0 mt-1 h-2 w-2 rounded-full bg-accent animate-pulse"
            aria-label="Happening now"
          />
        )}
      </div>
    </Link>
  );
}

function computeAge(dob: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

function formatTimeRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  // Compact: "8:00 – 8:30 AM" when both AM or both PM; otherwise show each.
  const startStr = fmt(start);
  const endStr = fmt(end);
  const startMeridiem = startStr.slice(-2);
  const endMeridiem = endStr.slice(-2);
  if (startMeridiem === endMeridiem) {
    return `${startStr.replace(/\s?(AM|PM)$/, "")}–${endStr}`;
  }
  return `${startStr}–${endStr}`;
}

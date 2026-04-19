import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import type { AuthedUser } from "@/lib/auth/session";
import { Tile } from "@/components/ui/tile";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { TileErrorBody } from "@/components/command/tile-error";
import { cn } from "@/lib/utils/cn";

/**
 * Patient Snapshot tile — the clinician's "who's next" card.
 *
 * In a 1×1 slot we can't fit the full facesheet from the Mission
 * Control sketch, so we show the most useful subset for the moment
 * right before a visit:
 *   - Name, age, appointment time
 *   - Allergies as red chips (safety first)
 *   - Active med count
 *   - Most recent lab panel + date
 *   - One tap to the full chart
 *
 * The "featured" patient is deterministic:
 *   1. Next upcoming appointment today (earliest startAt > now)
 *   2. Else, first scheduled appointment today (for a retrospective view)
 *   3. Else, null → empty state
 *
 * Clinicians see only appointments assigned to their Provider id;
 * practice owners see the whole org's day. Matches the scoping of
 * the Schedule tile so both tiles agree on "who's today".
 */
export async function PatientSnapshotTile({ user }: { user: AuthedUser }) {
  if (!user.organizationId) {
    return <SnapshotShell />;
  }

  try {
    return await renderSnapshotTile(user);
  } catch (err) {
    // Never take down the whole Command Center because one tile threw.
    // Log the stack so Render logs surface it, render a calm fallback.
    console.error("[command-center] PatientSnapshotTile render failed:", err);
    return (
      <SnapshotShell>
        <TileErrorBody label="the patient snapshot" error={err} />
      </SnapshotShell>
    );
  }
}

async function renderSnapshotTile(user: AuthedUser) {
  if (!user.organizationId) return <SnapshotShell />;

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
    now.getDate()
  );
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  const commonWhere = {
    patient: { organizationId: user.organizationId, deletedAt: null },
    startAt: { gte: startOfDay, lt: endOfDay },
    ...(provider ? { providerId: provider.id } : {}),
  };

  // Prefer the next upcoming visit; fall back to the earliest today so the
  // tile stays useful even late in the day.
  const upcoming = await prisma.appointment.findFirst({
    where: { ...commonWhere, startAt: { gte: now, lt: endOfDay } },
    orderBy: { startAt: "asc" },
    select: { id: true, startAt: true, patientId: true },
  });

  const fallback = upcoming
    ? null
    : await prisma.appointment.findFirst({
        where: commonWhere,
        orderBy: { startAt: "asc" },
        select: { id: true, startAt: true, patientId: true },
      });

  const featured = upcoming ?? fallback;
  if (!featured) {
    return (
      <SnapshotShell>
        <div className="h-full flex items-center justify-center">
          <EmptyState
            title="No visits queued"
            description="Snapshot will populate once the day's roster is scheduled."
          />
        </div>
      </SnapshotShell>
    );
  }

  // Pull the facesheet bits in parallel. Each query catches its own
  // failure and returns a sentinel (null / 0) so a single table being
  // unavailable — the classic `LabResult` schema-drift case — can't
  // take down the whole tile. The caller sees "— " where the missing
  // data would have been and gets the rest of the snapshot.
  const [patient, activeMeds, latestLab] = await Promise.all([
    prisma.patient
      .findUnique({
        where: { id: featured.patientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          allergies: true,
        },
      })
      .catch((err) => {
        console.error(
          "[command-center] PatientSnapshot patient load failed:",
          err
        );
        return null;
      }),
    prisma.patientMedication
      .count({
        where: { patientId: featured.patientId, active: true },
      })
      .catch((err) => {
        console.error(
          "[command-center] PatientSnapshot meds count failed:",
          err
        );
        return 0;
      }),
    prisma.labResult
      .findFirst({
        where: { patientId: featured.patientId },
        orderBy: { receivedAt: "desc" },
        select: { panelName: true, receivedAt: true, abnormalFlag: true },
      })
      .catch((err) => {
        console.error(
          "[command-center] PatientSnapshot lab load failed:",
          err
        );
        return null;
      }),
  ]);

  if (!patient) {
    return (
      <SnapshotShell>
        <div className="h-full flex items-center justify-center">
          <EmptyState title="Patient unavailable" />
        </div>
      </SnapshotShell>
    );
  }

  // Legacy rows can have allergies=NULL in the DB even though the
  // Prisma schema declares a non-null default — the default is applied
  // at write time, not retroactively. Normalize once so downstream
  // code can treat it as a plain array. Same defensive guard the
  // patient chart page + share page already apply.
  const allergies = patient.allergies ?? [];

  const age = computeAge(patient.dateOfBirth);
  const isUpcoming = featured.startAt.getTime() > now.getTime();
  const apptLabel = isUpcoming ? "Up next" : "Today";
  const apptTime = featured.startAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const labDate = latestLab
    ? latestLab.receivedAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <SnapshotShell patientId={patient.id}>
      <div className="flex flex-col h-full gap-4">
        <div className="flex items-center gap-3">
          <Avatar
            firstName={patient.firstName}
            lastName={patient.lastName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-text truncate leading-tight">
              {patient.firstName} {patient.lastName}
              {age != null && (
                <span className="ml-1.5 text-text-subtle font-normal text-[13px]">
                  {age}
                </span>
              )}
            </p>
            <p className="text-xs text-text-subtle tabular-nums mt-0.5">
              <span className="font-medium text-text-muted">{apptLabel}</span>
              <span className="mx-1 text-text-subtle/50">·</span>
              {apptTime}
            </p>
          </div>
        </div>

        {allergies.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span aria-hidden="true" className="text-red-600 text-xs">⚠</span>
            {allergies.slice(0, 3).map((a, i) => (
              <span
                key={a}
                className="text-[11px] font-medium text-red-700"
                title={`Allergy: ${a}`}
              >
                {a}
                {i < Math.min(allergies.length, 3) - 1 && (
                  <span className="ml-1.5 text-red-300">·</span>
                )}
              </span>
            ))}
            {allergies.length > 3 && (
              <span className="text-[11px] text-red-500/70 font-medium">
                +{allergies.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center gap-3 text-xs text-text-muted tabular-nums">
          <span>
            <span className="font-semibold text-text">
              {activeMeds > 0 ? activeMeds : "—"}
            </span>{" "}
            meds
          </span>
          <span className="text-text-subtle/40">·</span>
          {latestLab ? (
            <span className="truncate">
              <span
                className={cn(
                  "font-semibold",
                  latestLab.abnormalFlag ? "text-amber-700" : "text-text"
                )}
              >
                {latestLab.panelName}
                {latestLab.abnormalFlag && " •"}
              </span>
              <span className="ml-1.5 text-text-subtle">{labDate}</span>
            </span>
          ) : (
            <span className="text-text-subtle">No labs</span>
          )}
        </div>
      </div>
    </SnapshotShell>
  );
}

function SnapshotShell({
  patientId,
  children,
}: {
  patientId?: string;
  children?: React.ReactNode;
}) {
  const action = (
    <Link
      href={patientId ? `/clinic/patients/${patientId}` : "/clinic/patients"}
      className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
    >
      {patientId ? "Chart →" : "Roster →"}
    </Link>
  );

  return (
    <Tile
      eyebrow="Up next"
      title="Patient Snapshot"
      icon="👤"
      span="1x1"
      tone="accent"
      action={action}
    >
      {children}
    </Tile>
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

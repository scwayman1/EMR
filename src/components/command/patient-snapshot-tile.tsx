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
        <TileErrorBody label="the patient snapshot" />
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

  // Pull the facesheet bits in parallel. Each query is tiny and scoped
  // to the featured patient; keeping them separate lets the tile still
  // render if, say, LabResult is unavailable for any reason.
  const [patient, activeMeds, latestLab] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: featured.patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        allergies: true,
      },
    }),
    prisma.patientMedication.count({
      where: { patientId: featured.patientId, active: true },
    }),
    prisma.labResult.findFirst({
      where: { patientId: featured.patientId },
      orderBy: { receivedAt: "desc" },
      select: { panelName: true, receivedAt: true, abnormalFlag: true },
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

  const age = computeAge(patient.dateOfBirth);
  const isUpcoming = featured.startAt.getTime() > now.getTime();
  const apptLabel = isUpcoming ? "Up next" : "Today";
  const apptTime = featured.startAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <SnapshotShell patientId={patient.id}>
      <div className="flex flex-col h-full gap-3">
        <div className="flex items-center gap-3">
          <Avatar
            firstName={patient.firstName}
            lastName={patient.lastName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text truncate">
              {patient.firstName} {patient.lastName}
            </p>
            <p className="text-xs text-text-subtle">
              {age != null ? `${age}y · ` : ""}
              {apptLabel} {apptTime}
            </p>
          </div>
        </div>

        {patient.allergies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {patient.allergies.slice(0, 3).map((a) => (
              <span
                key={a}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200/70"
                title={`Allergy: ${a}`}
              >
                ⚠ {a}
              </span>
            ))}
            {patient.allergies.length > 3 && (
              <span className="text-[10px] text-text-subtle self-center">
                +{patient.allergies.length - 3}
              </span>
            )}
          </div>
        )}

        <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <SnapshotStat
            label="Active meds"
            value={activeMeds > 0 ? String(activeMeds) : "—"}
          />
          <SnapshotStat
            label="Last lab"
            value={
              latestLab
                ? `${latestLab.panelName}${latestLab.abnormalFlag ? " •" : ""}`
                : "—"
            }
            hint={
              latestLab
                ? latestLab.receivedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : undefined
            }
            tone={latestLab?.abnormalFlag ? "warn" : "default"}
          />
        </dl>
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

function SnapshotStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-text-subtle">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm font-medium tabular-nums truncate",
          tone === "warn" ? "text-amber-700" : "text-text"
        )}
      >
        {value}
      </dd>
      {hint && (
        <p className="text-[10px] text-text-subtle tabular-nums">{hint}</p>
      )}
    </div>
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

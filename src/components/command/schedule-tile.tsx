import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import type { AuthedUser } from "@/lib/auth/session";
import { Tile } from "@/components/ui/tile";
import { EmptyState } from "@/components/ui/empty-state";
import { TileErrorBody } from "@/components/command/tile-error";
import {
  loadScheduleEnrichment,
  loadFeaturedSnapshot,
  type FeaturedSnapshot,
  type ScheduleEnrichment,
} from "@/components/command/schedule-card-data";
import { cn } from "@/lib/utils/cn";

/**
 * Schedule tile — today's visits, cards sized by duration.
 *
 * Design intent (from the Mission Control sketch):
 *   - Each appointment card's height is proportional to its duration,
 *     so a 90-min intake reads visibly bigger than a 15-min follow-up.
 *   - Cards are a scannable pre-visit dossier, not the full facesheet:
 *     time, name, reason, outcome signal, chips, brief line. Hover
 *     expands to a preview popover with more context; click-through
 *     still goes to the full chart.
 */
export async function ScheduleTile({ user }: { user: AuthedUser }) {
  if (!user.organizationId) {
    return <ScheduleTileShell count={0} />;
  }

  try {
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

    // One batched enrichment call for all patients in view — 7 queries
    // total regardless of how many appointments are on screen.
    const patientIds = Array.from(new Set(appointments.map((a) => a.patient.id)));
    const enrichment = await loadScheduleEnrichment(patientIds);

    // Featured appointment = first one whose end time hasn't passed.
    // Its card carries the full pre-visit snapshot (allergies, active
    // meds, last lab) — the "walking into the room" payload that
    // used to live in a dedicated Patient Snapshot tile.
    const featured = appointments.find((a) => a.endAt.getTime() >= now.getTime());
    const featuredSnapshot = featured
      ? await loadFeaturedSnapshot(featured.patient.id)
      : null;

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
                enrichment={enrichment.get(appt.patient.id)}
                snapshot={appt.id === featured?.id ? featuredSnapshot : null}
                nowTs={now.getTime()}
              />
            ))}
          </div>
        )}
      </ScheduleTileShell>
    );
  } catch (err) {
    console.error("[command-center] ScheduleTile render failed:", err);
    return (
      <ScheduleTileShell count={0}>
        <TileErrorBody label="today's schedule" error={err} />
      </ScheduleTileShell>
    );
  }
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
  enrichment,
  snapshot,
  nowTs,
}: {
  appointment: AppointmentWithPatient;
  enrichment: ScheduleEnrichment | undefined;
  snapshot: FeaturedSnapshot | null;
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

  // Encounter.reason wins; Appointment.notes is the fallback.
  const reason = enrichment?.reason ?? appointment.notes ?? null;
  const chips = enrichment?.chips ?? [];
  const showOutcomeRow =
    enrichment?.painTrend != null || enrichment?.adherencePct != null;
  // Short cards can't fit every layer — scale disclosure by duration.
  const showChips = durationMin >= 20 && chips.length > 0;
  const showBrief = durationMin >= 30 && enrichment?.briefLine;
  const showReason = durationMin >= 20 && reason;

  return (
    <div className="relative group/card">
      <Link
        href={`/clinic/patients/${appointment.patient.id}`}
        className={cn(
          "block rounded-xl border px-3.5 py-3 transition-all duration-200",
          "hover:shadow-sm hover:-translate-y-px",
          isPast
            ? "bg-surface border-border/50 opacity-60 hover:opacity-80"
            : isNow
              ? "bg-surface border-accent/50 shadow-[0_0_0_3px_var(--accent-soft)]"
              : "bg-surface border-border/70 hover:border-border-strong/60"
        )}
        style={{
          flexGrow: durationMin,
          flexBasis: 0,
          minHeight: "72px",
        }}
      >
        <div className="flex items-start justify-between gap-3 h-full">
          <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
            <p className="text-[11px] font-semibold tabular-nums text-text-subtle tracking-wide">
              {timeLabel}
              <span className="ml-2 font-normal text-text-subtle/60">
                {durationMin}m
              </span>
            </p>
            <p className="text-[15px] font-semibold text-text group-hover/card:text-accent transition-colors truncate leading-tight">
              {appointment.patient.firstName} {appointment.patient.lastName}
              {age != null && (
                <span className="ml-2 text-text-subtle font-normal text-[13px]">
                  {age}
                </span>
              )}
            </p>
            {showReason && (
              <p className="text-[13px] text-text-muted line-clamp-1 leading-snug">{reason}</p>
            )}
            {showOutcomeRow && <OutcomeRow enrichment={enrichment!} />}
            {showChips && <ChipRow chips={chips} />}
            {showBrief && (
              <p className="text-xs italic text-text-subtle line-clamp-2 leading-snug">
                {enrichment!.briefLine}
              </p>
            )}
          </div>
          {isNow && (
            <span
              className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-accent animate-pulse"
              aria-label="Happening now"
            />
          )}
        </div>
      </Link>

      {/* Hover peek. Renders to the right of the card so it doesn't cover
          the card underneath it. Tile body has overflow-y auto, but the
          popover uses z-40 to stack above neighbors inside the tile.
          The featured card also surfaces the full pre-visit snapshot. */}
      {(enrichment || snapshot) && (
        <SchedulePeek
          patient={appointment.patient}
          timeLabel={timeLabel}
          durationMin={durationMin}
          reason={reason}
          enrichment={enrichment ?? null}
          snapshot={snapshot}
        />
      )}
    </div>
  );
}

/**
 * One-line outcome summary: pain trend arrow + adherence %. Either
 * piece omits gracefully when the data isn't there. Colors are semantic
 * so a glance communicates direction: pain down + adherence high = good.
 */
function OutcomeRow({ enrichment }: { enrichment: ScheduleEnrichment }) {
  const { painTrend, adherencePct } = enrichment;
  return (
    <div className="flex items-center gap-3 text-xs">
      {painTrend && (
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium tabular-nums",
            painTrend === "down" && "text-[color:var(--success)]",
            painTrend === "up" && "text-red-600",
            painTrend === "flat" && "text-text-subtle"
          )}
          title={
            painTrend === "down"
              ? "Pain improving over the last 30 days"
              : painTrend === "up"
                ? "Pain worsening over the last 30 days"
                : "Pain stable over the last 30 days"
          }
        >
          Pain{" "}
          {painTrend === "down" ? "↓" : painTrend === "up" ? "↑" : "→"}
        </span>
      )}
      {adherencePct != null && (
        <span
          className={cn(
            "inline-flex items-center gap-1 tabular-nums font-medium",
            adherencePct >= 80
              ? "text-[color:var(--success)]"
              : adherencePct >= 50
                ? "text-amber-700"
                : "text-red-600"
          )}
          title="Adherence over the last 7 days"
        >
          {adherencePct}% adhered
        </span>
      )}
    </div>
  );
}

function ChipRow({
  chips,
}: {
  chips: ScheduleEnrichment["chips"];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.slice(0, 4).map((chip, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-medium leading-none",
            chip.tone === "danger" && "bg-red-50 text-red-800",
            chip.tone === "warn" && "bg-amber-50 text-amber-800",
            chip.tone === "info" && "bg-[color:var(--info-soft)]/60 text-[color:var(--info)]",
            chip.tone === "success" && "bg-[color:var(--success-soft)]/60 text-[color:var(--success)]"
          )}
          title={chip.label}
        >
          <span aria-hidden="true">{chip.emoji}</span>
          <span className="truncate max-w-[100px]">{chip.label}</span>
        </span>
      ))}
      {chips.length > 4 && (
        <span className="text-[11px] text-text-subtle font-medium">
          +{chips.length - 4}
        </span>
      )}
    </div>
  );
}

/**
 * Hover preview popover. Same CSS-only hover pattern used elsewhere
 * (LabTooltip, AgentSignal popover) — no state, no JS. Anchors to the
 * right of the card so a long tile of cards doesn't cover the row
 * beneath with the popover for the row above.
 */
function SchedulePeek({
  patient,
  timeLabel,
  durationMin,
  reason,
  enrichment,
  snapshot,
}: {
  patient: AppointmentWithPatient["patient"];
  timeLabel: string;
  durationMin: number;
  reason: string | null;
  enrichment: ScheduleEnrichment | null;
  snapshot: FeaturedSnapshot | null;
}) {
  const age = computeAge(patient.dateOfBirth);
  const labDate = snapshot?.latestLab?.receivedAt
    ? snapshot.latestLab.receivedAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;
  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-40 top-0 left-full ml-2 w-80 max-w-[calc(100vw-2rem)]",
        "rounded-xl border border-border bg-surface shadow-lg p-4",
        "opacity-0 translate-x-1 transition-all duration-150",
        "group-hover/card:opacity-100 group-hover/card:translate-x-0 group-hover/card:pointer-events-auto",
        "group-focus-within/card:opacity-100 group-focus-within/card:translate-x-0 group-focus-within/card:pointer-events-auto"
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.1em] text-text-subtle font-semibold">
        {snapshot ? "Walking in" : "Pre-visit brief"}
      </p>
      <p className="text-sm font-semibold text-text mt-1.5">
        {patient.firstName} {patient.lastName}
        {age != null && (
          <span className="ml-2 text-text-subtle font-normal text-xs">
            {age}
          </span>
        )}
      </p>
      <p className="text-xs text-text-subtle tabular-nums mt-0.5">
        {timeLabel} · {durationMin}m
      </p>

      {snapshot && snapshot.allergies.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span aria-hidden="true" className="text-red-600 text-xs">⚠</span>
          {snapshot.allergies.slice(0, 4).map((a, i) => (
            <span key={a} className="text-[11px] font-medium text-red-700">
              {a}
              {i < Math.min(snapshot.allergies.length, 4) - 1 && (
                <span className="ml-1.5 text-red-300">·</span>
              )}
            </span>
          ))}
          {snapshot.allergies.length > 4 && (
            <span className="text-[11px] text-red-500/70 font-medium">
              +{snapshot.allergies.length - 4}
            </span>
          )}
        </div>
      )}

      {snapshot && (
        <div className="mt-2 flex items-center gap-2.5 text-xs text-text-muted tabular-nums">
          <span>
            <span className="font-semibold text-text">
              {snapshot.activeMedCount > 0 ? snapshot.activeMedCount : "—"}
            </span>{" "}
            meds
          </span>
          <span className="text-text-subtle/40">·</span>
          {snapshot.latestLab ? (
            <span className="truncate">
              <span
                className={cn(
                  "font-semibold",
                  snapshot.latestLab.abnormalFlag ? "text-amber-700" : "text-text"
                )}
              >
                {snapshot.latestLab.panelName}
                {snapshot.latestLab.abnormalFlag && " •"}
              </span>
              <span className="ml-1.5 text-text-subtle">{labDate}</span>
            </span>
          ) : (
            <span className="text-text-subtle">No labs</span>
          )}
        </div>
      )}

      {reason && (
        <p className="text-xs text-text-muted mt-3 leading-relaxed">
          <span className="font-semibold text-text">Reason. </span>
          {reason}
        </p>
      )}

      {enrichment && (enrichment.painTrend || enrichment.adherencePct != null) && (
        <div className="mt-3">
          <OutcomeRow enrichment={enrichment} />
        </div>
      )}

      {enrichment && enrichment.chips.length > 0 && (
        <div className="mt-3">
          <ChipRow chips={enrichment.chips} />
        </div>
      )}

      {enrichment?.briefLine && (
        <p className="text-xs italic text-text-muted mt-3 leading-relaxed border-l-2 border-accent/30 pl-2.5">
          {enrichment.briefLine}
        </p>
      )}

      <p className="text-[11px] text-text-subtle mt-3 text-right">
        Open chart →
      </p>
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

function formatTimeRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const startStr = fmt(start);
  const endStr = fmt(end);
  const startMeridiem = startStr.slice(-2);
  const endMeridiem = endStr.slice(-2);
  if (startMeridiem === endMeridiem) {
    return `${startStr.replace(/\s?(AM|PM)$/, "")}–${endStr}`;
  }
  return `${startStr}–${endStr}`;
}

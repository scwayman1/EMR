import { prisma } from "@/lib/db/prisma";
import type { AuthedUser } from "@/lib/auth/session";
import { Tile } from "@/components/ui/tile";
import { TileErrorBody } from "@/components/command/tile-error";

/**
 * Clinical Flow tile — "how did my time go today?"
 *
 * Left card in the bottom-row narrative (time → insight → action).
 * Draws from Encounter.startedAt / completedAt for today's visits to
 * compute patient-facing time, average visit length, and completion
 * rate. Charting-carryover and direct-vs-admin split are not yet
 * measurable (the schema doesn't split clinical-ended vs charting-
 * completed) — shown as "—" with an honest tooltip so the gap is
 * visible without pretending we have the data.
 */
export async function ClinicalFlowTile({ user }: { user: AuthedUser }) {
  if (!user.organizationId) return <FlowShell />;
  try {
    return await renderFlowTile(user);
  } catch (err) {
    console.error("[command-center] ClinicalFlowTile render failed:", err);
    return (
      <FlowShell>
        <TileErrorBody label="clinical flow" error={err} />
      </FlowShell>
    );
  }
}

async function renderFlowTile(user: AuthedUser) {
  if (!user.organizationId) return <FlowShell />;

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

  const encounters = await prisma.encounter.findMany({
    where: {
      organizationId: user.organizationId,
      scheduledFor: { gte: startOfDay, lt: endOfDay },
      ...(provider ? { providerId: provider.id } : {}),
    },
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      scheduledFor: true,
      status: true,
    },
  });

  const completed = encounters.filter(
    (e) => e.startedAt != null && e.completedAt != null
  );

  const totalCareMs = completed.reduce(
    (sum, e) =>
      sum + (e.completedAt!.getTime() - e.startedAt!.getTime()),
    0
  );
  const avgVisitMin =
    completed.length > 0
      ? Math.round(totalCareMs / completed.length / 60000)
      : null;

  const totalCareMin = Math.round(totalCareMs / 60000);
  const scheduledCount = encounters.length;
  const completedCount = completed.length;
  const remainingCount = scheduledCount - completedCount;

  return (
    <FlowShell>
      <div className="flex flex-col h-full gap-3">
        <dl className="space-y-2">
          <FlowRow
            label="Patient-facing time"
            value={totalCareMin > 0 ? formatDuration(totalCareMin) : "—"}
          />
          <FlowRow
            label="Avg visit length"
            value={avgVisitMin != null ? `${avgVisitMin}m` : "—"}
          />
          <FlowRow
            label="Visits completed"
            value={
              scheduledCount > 0
                ? `${completedCount} of ${scheduledCount}`
                : "—"
            }
          />
          <FlowRow
            label="Charting carryover"
            value="—"
            muted
            title="Requires chartingCompletedAt on Encounter — coming with the ambient agent fleet."
          />
        </dl>
        <p className="mt-auto text-[11px] italic text-text-subtle leading-snug">
          {interpretFlow(totalCareMin, remainingCount, avgVisitMin)}
        </p>
      </div>
    </FlowShell>
  );
}

function FlowShell({ children }: { children?: React.ReactNode }) {
  return (
    <Tile
      eyebrow="Clinical Flow"
      title="How your day moved"
      icon="⏱"
      span="1x1"
      tone="default"
    >
      {children}
    </Tile>
  );
}

function FlowRow({
  label,
  value,
  muted,
  title,
}: {
  label: string;
  value: string;
  muted?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3" title={title}>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd
        className={`text-sm font-semibold tabular-nums ${
          muted ? "text-text-subtle" : "text-text"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function interpretFlow(
  totalCareMin: number,
  remaining: number,
  avgVisit: number | null
): string {
  if (totalCareMin === 0 && remaining === 0) {
    return "No visits on the books today.";
  }
  if (totalCareMin === 0) {
    return `${remaining} ${remaining === 1 ? "visit" : "visits"} ahead.`;
  }
  if (remaining === 0) {
    return `Day complete — ${formatDuration(totalCareMin)} in direct care.`;
  }
  const pace =
    avgVisit != null && avgVisit <= 18
      ? "Running tight"
      : avgVisit != null && avgVisit >= 35
        ? "Running long"
        : "On pace";
  return `${pace}. ${remaining} ${remaining === 1 ? "visit" : "visits"} remaining.`;
}

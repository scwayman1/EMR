import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import type { AuthedUser } from "@/lib/auth/session";
import { Tile } from "@/components/ui/tile";
import { TileErrorBody } from "@/components/command/tile-error";

/**
 * Patient Impact tile — "who still needs me?"
 *
 * Right card in the bottom-row narrative (time → insight → action).
 * Surfaces unresolved ClinicalObservations at concern / urgent severity,
 * ranked by severity and recency, with the top three rendered as a
 * named action list. Closes the loop: the physician leaves the
 * dashboard knowing where their attention matters most.
 */
export async function PatientImpactTile({ user }: { user: AuthedUser }) {
  if (!user.organizationId) return <ImpactShell />;
  try {
    return await renderImpactTile(user.organizationId);
  } catch (err) {
    console.error("[command-center] PatientImpactTile render failed:", err);
    return (
      <ImpactShell>
        <TileErrorBody label="patient impact" error={err} />
      </ImpactShell>
    );
  }
}

async function renderImpactTile(organizationId: string) {
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const [unresolved, advancedToday] = await Promise.all([
    prisma.clinicalObservation.findMany({
      where: {
        patient: { organizationId, deletedAt: null },
        severity: { in: ["concern", "urgent"] },
        resolvedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        patientId: true,
        severity: true,
        summary: true,
        actionSuggested: true,
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    prisma.encounter.count({
      where: {
        organizationId,
        status: "complete",
        completedAt: { gte: startOfDay },
      },
    }),
  ]);

  // Dedupe to one row per patient (keeps the list scannable), preferring
  // the most urgent observation per patient.
  const severityRank: Record<string, number> = { urgent: 0, concern: 1 };
  const byPatient = new Map<string, (typeof unresolved)[number]>();
  for (const obs of unresolved) {
    const existing = byPatient.get(obs.patientId);
    if (
      !existing ||
      (severityRank[obs.severity] ?? 9) <
        (severityRank[existing.severity] ?? 9)
    ) {
      byPatient.set(obs.patientId, obs);
    }
  }

  const ranked = Array.from(byPatient.values()).sort(
    (a, b) =>
      (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9)
  );

  const topThree = ranked.slice(0, 3);
  const urgentCount = ranked.filter((o) => o.severity === "urgent").length;
  const followUpCount = ranked.length;

  return (
    <ImpactShell>
      <div className="flex flex-col h-full gap-3">
        <dl className="space-y-2">
          <ImpactRow
            label="Care advanced"
            value={advancedToday > 0 ? String(advancedToday) : "—"}
          />
          <ImpactRow
            label="Follow-up needed"
            value={followUpCount > 0 ? String(followUpCount) : "—"}
            tone={followUpCount > 0 ? "warn" : "default"}
          />
          <ImpactRow
            label="Urgent flags"
            value={urgentCount > 0 ? String(urgentCount) : "—"}
            tone={urgentCount > 0 ? "danger" : "default"}
          />
        </dl>

        <div className="mt-auto">
          {topThree.length > 0 ? (
            <ul className="space-y-1.5">
              {topThree.map((obs) => (
                <li key={obs.id}>
                  <Link
                    href={`/clinic/patients/${obs.patient.id}`}
                    className="group block rounded-md px-2 py-1 -mx-2 hover:bg-surface-muted/60 transition-colors"
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full shrink-0 translate-y-[-2px] ${
                          obs.severity === "urgent"
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <p className="text-xs font-semibold text-text group-hover:text-accent transition-colors truncate">
                        {obs.patient.firstName} {obs.patient.lastName}
                      </p>
                    </div>
                    <p className="text-[11px] text-text-muted line-clamp-1 leading-snug ml-3.5">
                      {obs.actionSuggested ?? obs.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] italic text-text-subtle leading-snug">
              No unresolved concerns right now.
            </p>
          )}
        </div>
      </div>
    </ImpactShell>
  );
}

function ImpactShell({ children }: { children?: React.ReactNode }) {
  return (
    <Tile
      eyebrow="Patient Impact"
      title="Who still needs you"
      icon="🧭"
      span="1x1"
      tone="accent"
    >
      {children}
    </Tile>
  );
}

function ImpactRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd
        className={`text-sm font-semibold tabular-nums ${
          tone === "danger"
            ? "text-red-600"
            : tone === "warn"
              ? "text-amber-700"
              : "text-text"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { formatDate } from "@/lib/utils/format";
import type { NoteBlock } from "@/lib/domain/notes";

export const metadata = { title: "Care plan" };

/* ---------- Status helpers ---------- */

function encounterStatusTone(status: string) {
  if (status === "complete") return "success" as const;
  if (status === "scheduled") return "accent" as const;
  if (status === "in_progress") return "info" as const;
  if (status === "cancelled") return "neutral" as const;
  return "neutral" as const;
}

function encounterStatusLabel(status: string) {
  if (status === "complete") return "Completed";
  if (status === "scheduled") return "Upcoming";
  if (status === "in_progress") return "In progress";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function modalityLabel(modality: string) {
  if (modality === "video") return "Video visit";
  if (modality === "phone") return "Phone visit";
  return "In-person visit";
}

/* ---------- Note summary extraction ---------- */

function extractNoteSummary(blocks: unknown): string | null {
  if (!Array.isArray(blocks)) return null;
  const typed = blocks as NoteBlock[];
  // Prefer "summary" block, then "assessment", then first block
  const summary =
    typed.find((b) => b.type === "summary") ??
    typed.find((b) => b.type === "assessment") ??
    typed[0];
  if (!summary?.body) return null;
  const text = summary.body.trim();
  return text.length > 180 ? text.slice(0, 180).trimEnd() + "\u2026" : text;
}

/* ---------- Page ---------- */

export default async function CarePlanPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      encounters: {
        orderBy: { scheduledFor: "desc" },
        include: { notes: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
      tasks: {
        where: { status: { in: ["open", "in_progress"] } },
        orderBy: { dueAt: "asc" },
        take: 10,
      },
    },
  });

  const encounters = patient?.encounters ?? [];
  const tasks = patient?.tasks ?? [];
  const treatmentGoals = patient?.treatmentGoals ?? null;

  // Parse cannabis history
  const cannabis = patient?.cannabisHistory as {
    priorUse?: boolean;
    formats?: string[];
    reportedBenefits?: string[];
    reportedSideEffects?: string[];
  } | null;

  // Split encounters into upcoming vs. past
  const now = new Date();
  const upcoming = encounters.filter(
    (e) =>
      e.status === "scheduled" &&
      e.scheduledFor &&
      new Date(e.scheduledFor) >= now
  );
  const past = encounters.filter(
    (e) =>
      e.status === "complete" ||
      e.status === "cancelled" ||
      (e.scheduledFor && new Date(e.scheduledFor) < now)
  );

  return (
    <PageShell maxWidth="max-w-[960px]">
      {/* ==================== Hero ==================== */}
      <div className="mb-10">
        <Eyebrow className="mb-3">Care plan</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
          Your care plan
        </h1>
        <p className="text-[15px] text-text-muted mt-3 leading-relaxed max-w-2xl">
          Everything your care team has recommended, your upcoming visits, and
          guidance for your cannabis journey — all in one place.
        </p>
      </div>

      {/* ==================== Section 1: Treatment goals ==================== */}
      <section>
        <Card tone="raised">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LeafSprig size={16} className="text-accent/80" />
              What we&apos;re working toward together
      <PatientSectionNav section="health" />
            </CardTitle>
            <CardDescription>
              These goals guide the care plan your team builds with you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {treatmentGoals ? (
              <div className="prose-clinical">
                <p className="text-text-muted whitespace-pre-wrap leading-relaxed">
                  {treatmentGoals}
                </p>
              </div>
            ) : (
              <EmptyState
                title="No goals set yet"
                description="Complete your intake form to share what you'd like to get out of care. Your clinician will refine these with you."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <EditorialRule className="my-10" />

      {/* ==================== Section 2: Your visits ==================== */}
      <section>
        <h2 className="font-display text-2xl text-text tracking-tight mb-6">
          Times we&apos;ve connected
        </h2>

        {encounters.length === 0 ? (
          <EmptyState
            title="No visits yet"
            description="Once your intake is complete, your care team will help you find a time that works."
          />
        ) : (
          <div className="space-y-8">
            {/* Upcoming visits */}
            {upcoming.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent mb-3">
                  Upcoming
                </p>
                <div className="space-y-3">
                  {upcoming.map((e) => (
                    <Card key={e.id} tone="raised" className="card-hover">
                      <CardContent className="py-5 px-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-display text-lg text-text tracking-tight">
                              {formatDate(e.scheduledFor)}
                            </p>
                            <p className="text-sm text-text-muted mt-1">
                              {modalityLabel(e.modality)}
                              {e.reason ? ` \u00b7 ${e.reason}` : ""}
                            </p>
                          </div>
                          <Badge tone={encounterStatusTone(e.status)}>
                            {encounterStatusLabel(e.status)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Past visits */}
            {past.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-subtle mb-3">
                  Past
                </p>
                <div className="space-y-3">
                  {past.map((e) => {
                    const noteSummary =
                      e.notes[0]?.status === "finalized"
                        ? extractNoteSummary(e.notes[0].blocks)
                        : null;

                    return (
                      <Card key={e.id}>
                        <CardContent className="py-5 px-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="font-display text-lg text-text tracking-tight">
                                {formatDate(e.scheduledFor)}
                              </p>
                              <p className="text-sm text-text-muted mt-1">
                                {modalityLabel(e.modality)}
                                {e.reason ? ` \u00b7 ${e.reason}` : ""}
                              </p>
                              {noteSummary && (
                                <div className="mt-3 p-3 rounded-lg bg-surface-muted/60 border border-border/50">
                                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-subtle mb-1.5">
                                    Visit summary
                                  </p>
                                  <p className="text-sm text-text-muted leading-relaxed">
                                    {noteSummary}
                                  </p>
                                </div>
                              )}
                              {e.notes[0]?.status === "finalized" &&
                                !noteSummary && (
                                  <p className="text-xs text-text-subtle mt-2">
                                    Visit note finalized — open in messages for
                                    more detail.
                                  </p>
                                )}
                            </div>
                            <Badge tone={encounterStatusTone(e.status)}>
                              {encounterStatusLabel(e.status)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <EditorialRule className="my-10" />

      {/* ==================== Section 3: Recommended next steps ==================== */}
      <section>
        <h2 className="font-display text-2xl text-text tracking-tight mb-6">
          What comes next
        </h2>

        {tasks.length === 0 ? (
          <EmptyState
            title="You're all caught up"
            description="No open tasks right now. Your care team will add recommendations after your visits."
          />
        ) : (
          <Card tone="raised">
            <CardContent className="py-2">
              <ul className="divide-y divide-border/70">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-start gap-3.5 py-4 group"
                  >
                    {/* Checkbox-style indicator */}
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-accent/40 bg-accent-soft/40 group-hover:border-accent transition-colors">
                      {task.status === "done" ? (
                        <svg
                          className="h-3 w-3 text-accent"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-text-muted mt-0.5 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      {task.dueAt && (
                        <p className="text-xs text-text-subtle mt-1">
                          Due {formatDate(task.dueAt)}
                        </p>
                      )}
                    </div>
                    <Badge
                      tone={task.status === "in_progress" ? "info" : "neutral"}
                      className="shrink-0 mt-0.5"
                    >
                      {task.status === "in_progress" ? "In progress" : "To do"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <EditorialRule className="my-10" />

      {/* ==================== Section 4: Cannabis guidance ==================== */}
      <section className="mb-4">
        <h2 className="font-display text-2xl text-text tracking-tight mb-6">
          Your cannabis journey
        </h2>

        {!cannabis || !cannabis.priorUse ? (
          <EmptyState
            title="No cannabis history on file"
            description="If you've used cannabis before, sharing your experience in the intake form helps your clinician tailor recommendations."
          />
        ) : (
          <Card tone="raised">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LeafSprig size={16} className="text-accent/80" />
                Your cannabis background
              </CardTitle>
              <CardDescription>
                This information helps your care team personalize your plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Formats used */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
                    Formats used
                  </p>
                  {cannabis.formats && cannabis.formats.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cannabis.formats.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-accent-soft text-accent border border-accent/15"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">Not specified</p>
                  )}
                </div>

                {/* Reported benefits */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
                    Reported benefits
                  </p>
                  {cannabis.reportedBenefits &&
                  cannabis.reportedBenefits.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cannabis.reportedBenefits.map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-[color:var(--accent-soft)] text-success border border-success/15"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">None noted</p>
                  )}
                </div>

                {/* Reported side effects */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
                    Reported side effects
                  </p>
                  {cannabis.reportedSideEffects &&
                  cannabis.reportedSideEffects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cannabis.reportedSideEffects.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-highlight-soft text-[color:var(--highlight-hover)] border border-highlight/15"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">None reported</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </PageShell>
  );
}

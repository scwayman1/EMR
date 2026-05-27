import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { Sparkline } from "@/components/ui/sparkline";
import { formatDate, formatRelative } from "@/lib/utils/format";
import { TEMPLATES } from "@/app/(patient)/portal/assessments/[slug]/templates";
import { QuickEntryForm } from "./quick-entry-form";

export const metadata = { title: "Assessments — Chart" };

// EMR-160 — Physician-first Assessments Tab
//
// Old patient-side experience surfaced a 12-card library and asked the
// patient to self-select. That's fine on the portal but disastrous in
// the chart, where:
//   - the physician already knows which instrument they want,
//   - they're often holding a paper form filled out during rooming, and
//   - the score needs to land against the *current visit* so it threads
//     into the note instead of floating in a global list.
//
// This page collapses to two surfaces:
//   1. Quick-entry form on top — pick instrument, type score, link to
//      the active encounter, save. Single click for the common case.
//   2. Per-instrument history below — score sparkline + dated rows so
//      the physician can spot drift before adjusting therapy.
//
// We deliberately removed the patient-facing "browse the library"
// surface from this view. The patient still sees that on /portal/
// assessments; the chart focuses on data the doctor needs in the room.

interface PageProps {
  params: { id: string };
}

const SCORE_INPUT_DENYLIST = new Set<string>([
  // The patient-side library has narrative-only screens that don't have
  // a numeric total to chart against. Filtering them out at the page
  // level keeps the quick-entry dropdown trustworthy.
]);

function instrumentRange(slug: string): { min: number; max: number } {
  const t = TEMPLATES.find((x) => x.slug === slug);
  if (!t) return { min: 0, max: 100 };
  return {
    min: Math.min(...t.interpretations.map((i) => i.min)),
    max: Math.max(...t.interpretations.map((i) => i.max)),
  };
}

function severityTone(label: string | null | undefined) {
  if (!label) return "neutral" as const;
  const l = label.toLowerCase();
  if (l.includes("severe")) return "danger" as const;
  if (l.includes("moderate")) return "warning" as const;
  if (l.includes("mild") || l.includes("minimal")) return "success" as const;
  return "neutral" as const;
}

export default async function ChartAssessmentsPage({ params }: PageProps) {
  const user = await requireUser();
  if (!user.organizationId) notFound();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId,
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) notFound();

  const [responses, recentEncounters] = await Promise.all([
    prisma.assessmentResponse.findMany({
      where: { patientId: patient.id },
      orderBy: { submittedAt: "desc" },
      include: { assessment: true },
      take: 200,
    }),
    prisma.encounter.findMany({
      where: { patientId: patient.id, organizationId: user.organizationId },
      orderBy: [
        { status: "asc" },
        { scheduledFor: "desc" },
      ],
      take: 8,
    }),
  ]);

  // Encounter currently in progress, if any — we default the
  // quick-entry form to it so a typical visit flow is one click away.
  const activeEncounter = recentEncounters.find((e) => e.status === "in_progress");

  const encounterOptions = recentEncounters.map((e) => ({
    id: e.id,
    label: [
      e.scheduledFor ? formatDate(e.scheduledFor) : "Unscheduled",
      e.modality === "video"
        ? "video"
        : e.modality === "phone"
          ? "phone"
          : "in-person",
      e.status === "in_progress" ? "(active)" : e.reason || null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  const instruments = TEMPLATES.filter((t) => !SCORE_INPUT_DENYLIST.has(t.slug)).map(
    (t) => ({ slug: t.slug, title: t.title, range: instrumentRange(t.slug) }),
  );

  // Group responses by slug for the per-instrument history block.
  const bySlug = new Map<
    string,
    { title: string; rows: { id: string; submittedAt: Date; score: number | null; interpretation: string | null }[] }
  >();
  for (const r of responses) {
    const slug = r.assessment.slug;
    let bucket = bySlug.get(slug);
    if (!bucket) {
      bucket = { title: r.assessment.title, rows: [] };
      bySlug.set(slug, bucket);
    }
    bucket.rows.push({
      id: r.id,
      submittedAt: r.submittedAt,
      score: r.score,
      interpretation: r.interpretation,
    });
  }

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Eyebrow className="mb-2">Assessments</Eyebrow>
          <h1 className="font-display text-2xl text-text tracking-tight">
            {patient.firstName} {patient.lastName}
          </h1>
        </div>
        <Link href={`/clinic/patients/${patient.id}`}>
          <Button variant="ghost" size="sm">
            ← Back to chart
          </Button>
        </Link>
      </div>

      {/* Quick entry — the primary surface */}
      <Card tone="raised" className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Record a score</CardTitle>
          <CardDescription>
            Type a total score. Linking to the active visit threads it into the
            encounter timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuickEntryForm
            patientId={patient.id}
            encounterOptions={encounterOptions}
            instruments={instruments}
            defaultEncounterId={activeEncounter?.id}
          />
        </CardContent>
      </Card>

      {/* History */}
      {bySlug.size === 0 ? (
        <EmptyState
          title="No assessment scores on file"
          description="Use the form above to record a score, or send the patient an instrument from the portal."
        />
      ) : (
        <div className="space-y-5">
          {[...bySlug.entries()].map(([slug, group]) => {
            const trend = group.rows
              .slice()
              .reverse()
              .map((r) => r.score ?? 0);
            const latest = group.rows[0];
            return (
              <Card key={slug} tone="raised">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-base">{group.title}</CardTitle>
                      <CardDescription>
                        {group.rows.length} score
                        {group.rows.length === 1 ? "" : "s"} on file · last{" "}
                        {formatRelative(latest.submittedAt)}
                      </CardDescription>
                    </div>
                    {latest.score !== null && (
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-display text-2xl text-accent tabular-nums leading-none">
                            {latest.score}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-text-subtle mt-1">
                            Latest score
                          </p>
                        </div>
                        {trend.length >= 2 && (
                          <Sparkline data={trend} width={120} height={40} />
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="text-left text-[11px] font-medium text-text-subtle uppercase tracking-wider px-6 py-2">
                            Date
                          </th>
                          <th className="text-left text-[11px] font-medium text-text-subtle uppercase tracking-wider px-6 py-2">
                            Score
                          </th>
                          <th className="text-left text-[11px] font-medium text-text-subtle uppercase tracking-wider px-6 py-2">
                            Severity
                          </th>
                          <th className="text-left text-[11px] font-medium text-text-subtle uppercase tracking-wider px-6 py-2">
                            Interpretation
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {group.rows.slice(0, 8).map((row) => {
                          const sev = (row.interpretation ?? "")
                            .split(".")[0]
                            .replace(/[.\s]/g, "");
                          return (
                            <tr key={row.id} className="hover:bg-surface-muted/30">
                              <td className="px-6 py-2 text-text-muted whitespace-nowrap">
                                {formatDate(row.submittedAt)}
                              </td>
                              <td className="px-6 py-2 font-display text-accent tabular-nums">
                                {row.score ?? "—"}
                              </td>
                              <td className="px-6 py-2">
                                <Badge tone={severityTone(sev)}>{sev || "—"}</Badge>
                              </td>
                              <td className="px-6 py-2 text-text-muted">
                                {row.interpretation ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

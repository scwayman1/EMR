import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { LogoMark } from "@/components/ui/logo";
import { formatDate, fullName } from "@/lib/utils/format";
import {
  buildCannabisNarrative,
  buildConcernsNarrative,
  buildGoalsNarrative,
} from "./narrative";
import { ControlBar } from "./control-bar";

export const metadata = { title: "My Story" };

// EMR-162 — My Story, focused on storybook
//
// Pre-EMR-162 the route silently redirected to /portal/storybook. The
// redirect was a stop-gap; it broke patient bookmarks that pre-dated the
// merge and (more importantly) deleted a real distinction:
//
//   - /portal/storybook is the rich, printable, fairytale-flavored
//     experience. Eight chapters, sparklines, reflection pages.
//   - /portal/my-story is meant to be the *quick* version: a vertical
//     timeline of milestones, shareable to outside doctors and family,
//     no preamble.
//
// We restore my-story as that quick view: milestone cards built from
// the patient's encounters, assessment scores, and cannabis history,
// stitched into a single chronological column with a banner pointing to
// the long-form storybook for anyone who wants more.

interface Milestone {
  id: string;
  date: Date;
  kind: "intake" | "visit" | "assessment" | "cannabis" | "outcome" | "milestone";
  emoji: string;
  title: string;
  body?: string;
  badge?: string;
}

function buildMilestones(input: {
  intakeAt: Date | null;
  encounters: { id: string; scheduledFor: Date | null; modality: string; reason: string | null; status: string }[];
  assessments: { id: string; submittedAt: Date; title: string; score: number | null; interpretation: string | null }[];
  firstCannabisAt: Date | null;
  outcomeFirst: Date | null;
  outcomeCount: number;
}): Milestone[] {
  const items: Milestone[] = [];

  if (input.intakeAt) {
    items.push({
      id: "intake",
      date: input.intakeAt,
      kind: "intake",
      emoji: "\u{1F331}",
      title: "Started your journey",
      body: "Your intake answers became the seed of this story.",
    });
  }

  for (const e of input.encounters) {
    if (!e.scheduledFor) continue;
    items.push({
      id: `enc-${e.id}`,
      date: e.scheduledFor,
      kind: "visit",
      emoji: e.modality === "video" ? "\u{1F4F9}" : e.modality === "phone" ? "\u{1F4DE}" : "\u{1F3E5}",
      title:
        e.status === "complete"
          ? "Visited with your care team"
          : e.status === "scheduled"
            ? "Visit scheduled"
            : "Visit",
      body: e.reason || undefined,
      badge: e.modality === "video" ? "Video" : e.modality === "phone" ? "Phone" : "In person",
    });
  }

  for (const a of input.assessments) {
    items.push({
      id: `asmt-${a.id}`,
      date: a.submittedAt,
      kind: "assessment",
      emoji: "\u{1F4DD}",
      title: `Completed ${a.title}`,
      body: a.interpretation || undefined,
      badge: a.score !== null ? `Score ${a.score}` : undefined,
    });
  }

  if (input.firstCannabisAt) {
    items.push({
      id: "cannabis-start",
      date: input.firstCannabisAt,
      kind: "cannabis",
      emoji: "\u{1F33F}",
      title: "First cannabis log",
      body: "The day you started tracking your cannabis use here.",
    });
  }

  if (input.outcomeFirst) {
    items.push({
      id: "outcome-first",
      date: input.outcomeFirst,
      kind: "outcome",
      emoji: "\u{1F4CA}",
      title: "First check-in",
      body: `${input.outcomeCount} total check-ins logged so far.`,
    });
  }

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default async function MyStoryPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      encounters: {
        orderBy: { scheduledFor: "desc" },
        select: {
          id: true,
          scheduledFor: true,
          modality: true,
          reason: true,
          status: true,
        },
      },
      assessmentResponses: {
        orderBy: { submittedAt: "desc" },
        include: { assessment: true },
        take: 20,
      },
      outcomeLogs: {
        orderBy: { loggedAt: "asc" },
        select: { loggedAt: true, metric: true },
      },
      doseLogs: {
        orderBy: { loggedAt: "asc" },
        take: 1,
        select: { loggedAt: true },
      },
    },
  });
  if (!patient) redirect("/portal/intake");

  const patientName = fullName(patient.firstName, patient.lastName);

  const milestones = buildMilestones({
    // No `intakeCompletedAt` column — `createdAt` is the closest proxy
    // for when the patient first showed up here, and gates the "Started
    // your journey" milestone so the timeline always has at least one
    // anchor card.
    intakeAt: patient.createdAt,
    encounters: patient.encounters.map((e) => ({
      id: e.id,
      scheduledFor: e.scheduledFor,
      modality: e.modality,
      reason: e.reason,
      status: e.status,
    })),
    assessments: patient.assessmentResponses.map((r) => ({
      id: r.id,
      submittedAt: r.submittedAt,
      title: r.assessment.title,
      score: r.score,
      interpretation: r.interpretation,
    })),
    firstCannabisAt: patient.doseLogs[0]?.loggedAt ?? null,
    outcomeFirst: patient.outcomeLogs[0]?.loggedAt ?? null,
    outcomeCount: patient.outcomeLogs.length,
  });

  const cannabis = (patient.cannabisHistory as {
    priorUse?: boolean;
    formats?: string[];
    reportedBenefits?: string[];
    reportedSideEffects?: string[];
  }) ?? null;

  return (
    <>
      <ControlBar patientName={patientName} />

      <PageShell maxWidth="max-w-[820px]">
        <PatientSectionNav section="garden" />

        {/* Hero — printable cover */}
        <div className="text-center py-10 print:py-16">
          <LeafSprig size={36} className="text-accent mx-auto mb-6" />
          <Eyebrow className="mb-3">My Story</Eyebrow>
          <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.08]">
            {patientName}
          </h1>
          <p className="font-display text-base text-text-muted tracking-tight italic mt-2">
            A care timeline you can share.
          </p>
          <EditorialRule className="my-8 max-w-xs mx-auto" />
          <div className="flex items-center justify-center gap-2 text-text-subtle">
            <LogoMark size={20} />
            <span className="font-display text-xs tracking-tight">
              Leafjourney
            </span>
            <span className="text-xs">·</span>
            <span className="text-xs">{formatDate(new Date())}</span>
          </div>
        </div>

        {/* Banner — direct anyone wanting more to the long-form storybook */}
        <div className="mb-10 print:hidden rounded-xl border border-accent/30 bg-accent-soft/40 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">
              Want the longer version?
            </p>
            <p className="text-xs text-text-muted">
              Storybook expands every chapter — sparklines, reflections, and
              an AI-narrated fairytale of your journey.
            </p>
          </div>
          <Link href="/portal/storybook">
            <Button variant="secondary" size="sm">
              Open Storybook →
            </Button>
          </Link>
        </div>

        {/* Quick narrative — three short paragraphs */}
        <section className="mb-12">
          <Eyebrow className="mb-3">In short</Eyebrow>
          <div className="prose-clinical space-y-4 text-text-muted leading-relaxed">
            <p>{buildConcernsNarrative(patient.presentingConcerns ?? null)}</p>
            <p>{buildGoalsNarrative(patient.treatmentGoals ?? null)}</p>
            <p>
              {buildCannabisNarrative(
                cannabis && cannabis.priorUse !== undefined
                  ? {
                      priorUse: !!cannabis.priorUse,
                      formats: cannabis.formats,
                      reportedBenefits: cannabis.reportedBenefits,
                      reportedSideEffects: cannabis.reportedSideEffects,
                    }
                  : null,
              )}
            </p>
          </div>
        </section>

        <EditorialRule className="my-10" />

        {/* Timeline */}
        <section>
          <Eyebrow className="mb-6">Your timeline</Eyebrow>
          {milestones.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-text-muted">
                  Your timeline will fill in as you visit, log check-ins, and
                  complete assessments.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ol className="relative border-l-2 border-accent/20 pl-6 space-y-7">
              {milestones.map((m) => (
                <li key={m.id} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[34px] top-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised border-2 border-accent/40 text-sm shadow-sm print:bg-white"
                  >
                    {m.emoji}
                  </span>
                  <div>
                    <div className="flex items-baseline gap-3 flex-wrap mb-1">
                      <p className="font-display text-base text-text tracking-tight">
                        {m.title}
                      </p>
                      {m.badge && <Badge tone="accent">{m.badge}</Badge>}
                      <span className="text-xs text-text-subtle ml-auto">
                        {formatDate(m.date)}
                      </span>
                    </div>
                    {m.body && (
                      <p className="text-sm text-text-muted leading-relaxed">
                        {m.body}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <EditorialRule className="my-12" />

        {/* Footer — credits + share note */}
        <div className="text-center pb-8 print:pb-0">
          <p className="text-xs text-text-subtle max-w-md mx-auto leading-relaxed">
            Use the share button above to send a read-only link to family or
            an outside doctor — it expires in 72 hours and does not include
            messages or chart notes.
          </p>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                nav, aside, [data-shell-sidebar], [data-shell-topbar] {
                  display: none !important;
                }
                body { background: white !important; }
                @page { margin: 0.9in 1in; size: letter; }
              }
            `,
          }}
        />
      </PageShell>
    </>
  );
}

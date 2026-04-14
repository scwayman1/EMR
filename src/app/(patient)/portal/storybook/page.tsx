import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { LogoMark } from "@/components/ui/logo";
import { Sparkline } from "@/components/ui/sparkline";
import { formatDate, fullName } from "@/lib/utils/format";
import type { NoteBlock } from "@/lib/domain/notes";
import {
  buildTrendNarrative,
  buildCannabisNarrative,
  buildGoalsNarrative,
  buildConcernsNarrative,
} from "../my-story/narrative";
import {
  simplifyDiagnosis,
  simpleName,
  personalizeHistory,
} from "@/lib/domain/plain-language";
import { ControlBar } from "../my-story/control-bar";
import { StorybookView } from "./storybook-view";

export const metadata = { title: "My Storybook" };

// ---------------------------------------------------------------------------
// Patient Storybook — EMR-98 / EMR-162
// ---------------------------------------------------------------------------
// The single, rich narrative experience. Merges the data-driven "My Story"
// chapters with the AI-generated fairytale into one beautiful, printable
// storybook. This replaces the standalone My Story tab.
// ---------------------------------------------------------------------------

// ── Helpers ─────────────────────────────────────────────────────────────────

function ChapterHeader({ number, title }: { number: number; title: string }) {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent/30 bg-accent-soft/50 text-accent text-xs font-medium print:border-accent/50">
          {number}
        </span>
        <LeafSprig size={18} className="text-accent/60 print:text-accent/80" />
      </div>
      <h2 className="font-display text-2xl md:text-3xl text-text tracking-tight leading-tight">
        {title}
      </h2>
      <div className="mt-4 h-px bg-gradient-to-r from-accent/30 via-border-strong/40 to-transparent" aria-hidden="true" />
    </header>
  );
}

function extractNoteSummary(blocks: unknown): string | null {
  if (!Array.isArray(blocks)) return null;
  const typed = blocks as NoteBlock[];
  const summary =
    typed.find((b) => b.type === "summary") ??
    typed.find((b) => b.type === "assessment") ??
    typed[0];
  if (!summary?.body) return null;
  return summary.body.trim();
}

function modalityLabel(modality: string): string {
  if (modality === "video") return "video visit";
  if (modality === "phone") return "phone visit";
  return "in-person visit";
}

function assessmentSlugLabel(slug: string): string {
  const labels: Record<string, string> = {
    "phq-9": "PHQ-9 (Depression)",
    "gad-7": "GAD-7 (Anxiety)",
    "pain-vas": "Pain VAS",
  };
  return labels[slug] ?? slug.toUpperCase();
}

const METRIC_DISPLAY: Record<string, { label: string; lowLabel: string; highLabel: string }> = {
  pain: { label: "Pain", lowLabel: "None", highLabel: "Severe" },
  sleep: { label: "Sleep", lowLabel: "Poor", highLabel: "Great" },
  anxiety: { label: "Anxiety", lowLabel: "None", highLabel: "Severe" },
  mood: { label: "Mood", lowLabel: "Low", highLabel: "Great" },
};

function formatSimpleList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1);
  const tail = items[items.length - 1];
  return `${head.join(", ")}, and ${tail}`;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function StorybookPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      outcomeLogs: { orderBy: { loggedAt: "asc" }, take: 500 },
      encounters: {
        orderBy: { scheduledFor: "desc" },
        include: {
          notes: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      assessmentResponses: {
        orderBy: { submittedAt: "desc" },
        include: { assessment: true },
      },
      messageThreads: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              sender: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  if (!patient) redirect("/portal/intake");

  const patientName = fullName(patient.firstName, patient.lastName);
  const today = formatDate(new Date());

  // Cannabis history
  const cannabis = (patient.cannabisHistory as {
    priorUse?: boolean;
    formats?: string[];
    reportedBenefits?: string[];
    reportedSideEffects?: string[];
  }) ?? null;

  // Outcome data
  const metricGroups: Record<string, number[]> = {};
  for (const log of patient.outcomeLogs) {
    if (!metricGroups[log.metric]) metricGroups[log.metric] = [];
    metricGroups[log.metric].push(log.value);
  }
  const trendData = Object.entries(metricGroups).map(([metric, values]) => ({
    metric,
    values,
  }));

  // Assessment responses
  const latestBySlug: Record<
    string,
    { slug: string; score: number | null; interpretation: string | null; submittedAt: Date }
  > = {};
  for (const r of patient.assessmentResponses) {
    const slug = r.assessment.slug;
    if (!latestBySlug[slug]) {
      latestBySlug[slug] = {
        slug,
        score: r.score,
        interpretation: r.interpretation,
        submittedAt: r.submittedAt,
      };
    }
  }

  // Messages
  const latestThread = patient.messageThreads?.[0] ?? null;
  const recentMessages = latestThread
    ? [...latestThread.messages].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )
    : [];

  const dob = patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null;
  const location =
    patient.city && patient.state
      ? `${patient.city}, ${patient.state}`
      : patient.city ?? patient.state ?? null;

  // Simple language data
  const concernTerms = patient.presentingConcerns
    ? patient.presentingConcerns.split(/[,;]+/).map((c: string) => c.trim()).filter(Boolean)
    : [];

  const diagnosisDetails: { name: string; explanation: string }[] = [];
  const seenNames = new Set<string>();
  for (const term of concernTerms) {
    const simplified = simplifyDiagnosis(term);
    if (simplified.includes("\u2014")) {
      const [name, ...rest] = simplified.split(" \u2014 ");
      if (!seenNames.has(name)) {
        seenNames.add(name);
        diagnosisDetails.push({ name, explanation: rest.join(" \u2014 ") });
      }
    }
  }

  return (
    <>
      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              nav, aside, [data-shell-sidebar], [data-shell-topbar] {
                display: none !important;
              }
              body {
                background: white !important;
                color: #1C1A15 !important;
                font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua",
                  Palatino, "Charter", Georgia, ui-serif, serif !important;
                font-size: 12pt !important;
                line-height: 1.6 !important;
              }
              .story-book { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
              .story-chapter { page-break-before: always; }
              .story-chapter:first-of-type { page-break-before: avoid; }
              .story-cover { page-break-after: always; }
              .story-back-cover { page-break-before: always; }
              .sparkline-container { display: none !important; }
              .print-values { display: block !important; }
              .story-reflection { page-break-before: always; min-height: 6in; }
              .reflection-area { min-height: 4in !important; border: 1.5pt dashed #D4C28F !important; }
              .fairytale-section { page-break-before: always; }
              @page { margin: 0.9in 1in; size: letter; }
            }
          `,
        }}
      />

      <ControlBar patientName={patientName} />

      <PageShell maxWidth="max-w-[700px]">
        <PatientSectionNav section="journey" />

        {/* ── COVER PAGE ────────────────────────────────── */}
        <div className="story-cover text-center py-20 md:py-28">
          <LeafSprig size={40} className="text-accent mx-auto mb-8" />
          <h1 className="font-display text-4xl md:text-5xl text-text tracking-tight leading-[1.1] mb-4">
            {patientName}
          </h1>
          <p className="font-display text-xl text-text-muted tracking-tight italic">
            A care story
          </p>
          <EditorialRule className="my-10 max-w-xs mx-auto" />
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <LogoMark size={28} />
            <span className="font-display text-base text-text tracking-tight">
              Leafjourney
            </span>
          </div>
          <p className="text-sm text-text-subtle">{today}</p>
        </div>

        {/* ── CH 1: Your health, in simple words ────────── */}
        <section className="story-chapter my-16 print:my-0">
          <ChapterHeader number={1} title="Your health, in simple words" />
          <div className="prose-clinical space-y-4">
            {concernTerms.length > 0 || patient.treatmentGoals ? (
              <>
                {concernTerms.length > 0 && (
                  <p>
                    You came to Leafjourney because of{" "}
                    {formatSimpleList(concernTerms.map((c) => simpleName(c).toLowerCase()))}.
                  </p>
                )}
                {patient.treatmentGoals && (
                  <>
                    <p>
                      Your goals are to{" "}
                      {patient.treatmentGoals.charAt(0).toLowerCase()}
                      {patient.treatmentGoals.slice(1)}
                      {/[.!?]$/.test(patient.treatmentGoals.trim()) ? "" : "."}
                    </p>
                    <p>
                      These are good goals &mdash; and we&apos;re working on them together.
                    </p>
                  </>
                )}
                {concernTerms.length > 0 && (
                  <p>{personalizeHistory(concernTerms)}</p>
                )}
                {diagnosisDetails.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                      In simple terms
                    </p>
                    {diagnosisDetails.map((d) => (
                      <div key={d.name} className="pl-4 border-l-2 border-accent/25">
                        <p className="text-sm">
                          <span className="font-medium text-text">{d.name}</span>
                          <span className="text-text-muted">{" \u2014 "}{d.explanation}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p>
                Your health story is still coming together. As your care team learns
                more about you, this chapter will explain your health in everyday words.
              </p>
            )}
          </div>
        </section>

        {/* ── CH 2: About Me ────────────────────────────── */}
        <section className="story-chapter my-16 print:my-0">
          <ChapterHeader number={2} title="About Me" />
          <div className="prose-clinical space-y-4">
            <p>{buildConcernsNarrative(patient.presentingConcerns ?? null)}</p>
            <p>{buildGoalsNarrative(patient.treatmentGoals ?? null)}</p>
            {(dob || location) && (
              <p className="text-text-subtle text-sm">
                {dob && <>Born {dob}.</>}
                {dob && location && " "}
                {location && <>Based in {location}.</>}
              </p>
            )}
          </div>
        </section>

        {/* ── CH 3: My Cannabis Journey ─────────────────── */}
        <section className="story-chapter my-16 print:my-0">
          <ChapterHeader number={3} title="My Cannabis Journey" />
          <div className="prose-clinical">
            <p>
              {buildCannabisNarrative(
                cannabis && cannabis.priorUse !== undefined
                  ? {
                      priorUse: !!cannabis.priorUse,
                      formats: cannabis.formats,
                      reportedBenefits: cannabis.reportedBenefits,
                      reportedSideEffects: cannabis.reportedSideEffects,
                    }
                  : null
              )}
            </p>
          </div>
        </section>

        {/* ── CH 4: How I've Been Feeling ───────────────── */}
        <section className="story-chapter my-16 print:my-0">
          <ChapterHeader number={4} title="How I've Been Feeling" />
          {Object.keys(metricGroups).length > 0 ? (
            <div className="space-y-6 mb-8">
              {(["pain", "sleep", "anxiety", "mood"] as const).map((key) => {
                const values = metricGroups[key];
                if (!values || values.length === 0) return null;
                const display = METRIC_DISPLAY[key] ?? { label: key, lowLabel: "Low", highLabel: "High" };
                const latest = values[values.length - 1];
                return (
                  <div key={key} className="flex items-center gap-5">
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-medium text-text capitalize">{display.label}</p>
                      <p className="text-xs text-text-subtle">Latest: {latest.toFixed(1)}</p>
                    </div>
                    <div className="sparkline-container flex-1">
                      <Sparkline
                        data={values.length > 1 ? values : [values[0], values[0]]}
                        width={320}
                        height={48}
                      />
                      <div className="flex justify-between mt-0.5 px-0.5">
                        <span className="text-[10px] text-text-subtle">{display.lowLabel}</span>
                        <span className="text-[10px] text-text-subtle">{display.highLabel}</span>
                      </div>
                    </div>
                    <div className="print-values hidden flex-1">
                      <p className="text-sm text-text-muted">
                        {values.length} readings. Range: {Math.min(...values).toFixed(1)} &ndash;{" "}
                        {Math.max(...values).toFixed(1)}. Latest: {latest.toFixed(1)} / 10.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="prose-clinical">
            <p>{buildTrendNarrative(trendData)}</p>
          </div>
        </section>

        {/* ── CH 5: My Visits ───────────────────────────── */}
        <section className="story-chapter my-16 print:my-0">
          <ChapterHeader number={5} title="My Visits" />
          {patient.encounters.length === 0 ? (
            <div className="prose-clinical">
              <p>
                No visits have been recorded yet. Once you see your care team,
                your visit history will appear here as part of your story.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {patient.encounters.map((encounter) => {
                const note =
                  encounter.notes[0]?.status === "finalized" ? encounter.notes[0] : null;
                const summary = note ? extractNoteSummary(note.blocks) : null;
                const dateStr = formatDate(encounter.scheduledFor ?? encounter.createdAt);
                return (
                  <div key={encounter.id} className="border-l-2 border-accent/20 pl-5 pb-2">
                    <p className="font-display text-lg text-text tracking-tight">{dateStr}</p>
                    <p className="text-sm text-text-muted mt-1">
                      {modalityLabel(encounter.modality)}
                      {encounter.reason ? ` \u2014 ${encounter.reason}` : ""}
                    </p>
                    {summary && (
                      <div className="mt-3 pl-3 border-l border-border-strong/40">
                        <p className="text-sm text-text-muted leading-relaxed">{summary}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── CH 6: What My Assessments Show ─────────────── */}
        <section className="story-chapter my-16 print:my-0">
          <ChapterHeader number={6} title="What My Assessments Show" />
          {Object.keys(latestBySlug).length === 0 ? (
            <div className="prose-clinical">
              <p>
                You haven&apos;t completed any assessments yet. Quick check-ins like the
                PHQ-9 or GAD-7 give your care team a structured way to track how
                you&apos;re doing over time.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.values(latestBySlug).map((entry) => (
                <div key={entry.slug} className="p-5 rounded-lg bg-surface/60 border border-border/60 print:border print:border-gray-300">
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <h3 className="font-display text-base text-text tracking-tight">
                      {assessmentSlugLabel(entry.slug)}
                    </h3>
                    <span className="text-sm text-text-subtle shrink-0">
                      {formatDate(entry.submittedAt)}
                    </span>
                  </div>
                  {entry.score !== null && (
                    <p className="text-sm text-text-muted">
                      <span className="font-display text-lg text-accent mr-1">{entry.score}</span>
                      {entry.interpretation && (
                        <span className="text-text-muted">&mdash; {entry.interpretation}</span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── CH 7: Messages with My Care Team ──────────── */}
        <section className="story-chapter my-16 print:my-0">
          <ChapterHeader number={7} title="Messages with My Care Team" />
          {recentMessages.length === 0 ? (
            <div className="prose-clinical">
              <p>
                No messages yet. When you reach out to your care team through the
                portal, recent conversations will appear here.
              </p>
            </div>
          ) : (
            <div>
              {latestThread && (
                <p className="text-sm text-text-subtle mb-5 italic">
                  Thread: {latestThread.subject}
                </p>
              )}
              <div className="space-y-5">
                {recentMessages.map((msg) => {
                  const isPatient = msg.senderUserId === user.id;
                  const senderName = msg.sender
                    ? fullName(msg.sender.firstName, msg.sender.lastName)
                    : "Care team";
                  return (
                    <div
                      key={msg.id}
                      className={`relative pl-5 border-l-2 ${
                        isPatient ? "border-highlight/40" : "border-accent/30"
                      }`}
                    >
                      <p className="text-xs font-medium text-text-subtle mb-1">
                        {isPatient ? "You" : senderName} &middot;{" "}
                        {formatDate(msg.createdAt)}
                      </p>
                      <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                        {msg.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <EditorialRule className="my-16 print:my-8" />

        {/* ── CH 8: My Story, Written Like a Fairytale ──── */}
        <section className="fairytale-section my-16 print:my-0">
          <ChapterHeader number={8} title="My story, told like a book" />
          <p className="prose-clinical text-text-muted mb-8">
            Here is your care journey, written in the warm voice of a storybook.
            Generated fresh each time you visit, so it always reflects where you
            are right now.
          </p>
          <StorybookView />
        </section>

        <EditorialRule className="my-16 print:my-8" />

        {/* ── Reflection pages ──────────────────────────── */}
        <section className="story-reflection my-16 print:my-0">
          <ChapterHeader number={9} title="My Reflections" />
          <p className="prose-clinical text-text-muted mb-10">
            The pages that follow are yours. Use them however feels right &mdash;
            jot down questions before a visit, process how you&apos;re feeling,
            or leave notes for someone you trust.
          </p>

          <div className="mb-12 print:mb-0 story-reflection">
            <h3 className="font-display text-xl text-text tracking-tight mb-2">
              Questions I want to ask my doctor
            </h3>
            <p className="text-sm text-text-subtle mb-4">
              Visits go fast. Writing your questions down ahead of time helps
              make sure nothing gets missed.
            </p>
            <div className="reflection-area min-h-[200px] rounded-lg border-2 border-dashed border-border-strong/40 bg-surface-muted/20 print:bg-white" />
          </div>

          <div className="mb-12 print:mb-0 story-reflection">
            <h3 className="font-display text-xl text-text tracking-tight mb-2">
              How I&apos;m feeling in my own words
            </h3>
            <p className="text-sm text-text-subtle mb-4">
              Numbers and scores tell part of the story. This space is for
              everything else &mdash; the details that only you can describe.
            </p>
            <div className="reflection-area min-h-[200px] rounded-lg border-2 border-dashed border-border-strong/40 bg-surface-muted/20 print:bg-white" />
          </div>

          <div className="mb-12 print:mb-0 story-reflection">
            <h3 className="font-display text-xl text-text tracking-tight mb-2">
              Notes for my family
            </h3>
            <p className="text-sm text-text-subtle mb-4">
              If there are things you&apos;d like the people closest to you to
              understand about your care, write them here.
            </p>
            <div className="reflection-area min-h-[200px] rounded-lg border-2 border-dashed border-border-strong/40 bg-surface-muted/20 print:bg-white" />
          </div>

          <div className="mb-12 print:mb-0 story-reflection">
            <h3 className="font-display text-xl text-text tracking-tight mb-2">
              What I want to remember
            </h3>
            <p className="text-sm text-text-subtle mb-4">
              Advice that resonated, a moment of progress, a commitment you
              made to yourself &mdash; write it down so you don&apos;t lose it.
            </p>
            <div className="reflection-area min-h-[200px] rounded-lg border-2 border-dashed border-border-strong/40 bg-surface-muted/20 print:bg-white" />
          </div>
        </section>

        {/* ── BACK COVER ────────────────────────────────── */}
        <div className="story-back-cover text-center py-20 md:py-28 border-t border-border/40 print:border-0">
          <p className="font-display text-xl text-text tracking-tight italic mb-2">
            This story belongs to
          </p>
          <p className="font-display text-3xl text-text tracking-tight mb-8">
            {patientName}
          </p>
          <EditorialRule className="my-8 max-w-xs mx-auto" />
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <LogoMark size={24} />
            <span className="font-display text-sm text-text tracking-tight">
              Prepared by Leafjourney
            </span>
          </div>
          <p className="text-sm text-text-subtle mb-8">Generated {today}</p>
          <p className="text-xs text-text-subtle max-w-md mx-auto leading-relaxed">
            This document is a personal summary and is not a substitute for
            professional medical advice. Always consult your care team for
            clinical decisions.
          </p>
        </div>
      </PageShell>
    </>
  );
}

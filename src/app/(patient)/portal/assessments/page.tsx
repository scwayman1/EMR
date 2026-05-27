import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils/format";
import { TEMPLATES } from "./[slug]/templates";

export const metadata = { title: "Assessments" };

// EMR-160: Rethink "Assessments" Tab — physician-first workflow.
//
// Old version: a flat 12-card menu where the patient self-serves any
// questionnaire. Clinically valuable instruments (PHQ-9, GAD-7) sat next
// to optional ones (PSS-10) with no priority signal. Patients didn't
// know which to take, providers didn't know which to expect, and stale
// scores went uncaught.
//
// New version triages into four bands:
//   1. **Up next** — clinically due based on the patient's chart context
//      (chronic-pain dx → pain VAS; depression hx → PHQ-9 every 60 days)
//      or never-taken core screens.
//   2. **Stale** — taken before but the score is older than the per-
//      instrument freshness window (e.g. PHQ-9 every 60d, AUDIT-C 365d).
//   3. **Recent** — taken within the freshness window; show as a small
//      summary so the patient sees the pattern over time.
//   4. **Library** — everything else, collapsed by default; the optional
//      instruments don't compete for attention with what the doctor
//      actually wants.
//
// Without a `recommendedById` column on Assessment, the recommendation
// engine here is a heuristic over chart conditions + recency. When that
// schema lands, the same component reads the explicit assignment and
// the heuristic becomes the fallback.

interface ResponseRow {
  score: number | null;
  interpretation: string | null;
  submittedAt: Date;
}

const FRESHNESS_DAYS: Record<string, number> = {
  "phq-9": 60,
  "phq-2": 30,
  "gad-7": 60,
  "pain-vas": 30,
  "promis-pain": 60,
  isi: 60,
  "pss-10": 90,
  epworth: 365,
  "audit-c": 365,
  "cudit-r": 90,
};

/**
 * Slugs the system considers physician-priority based on simple chart
 * heuristics. When the patient profile signals a relevant condition or
 * history, the matching screen jumps to "Up next" even if it has never
 * been taken.
 */
function inferProviderRecommendations(opts: {
  presentingConcerns: string | null;
  treatmentGoals: string | null;
  hasCannabisHistory: boolean;
}): Set<string> {
  const text =
    `${opts.presentingConcerns ?? ""} ${opts.treatmentGoals ?? ""}`.toLowerCase();
  const set = new Set<string>();

  // Always-on baseline screens for any new patient — the two-question
  // PHQ-2 + a pain VAS so the chart has at least minimal scaffolding.
  set.add("phq-2");

  if (/pain|chronic|fibro|arthrit|migraine|neuropath/.test(text)) {
    set.add("pain-vas");
    set.add("promis-pain");
  }
  if (/depress|mood|sad|hopeless/.test(text)) set.add("phq-9");
  if (/anx|panic|worry/.test(text)) set.add("gad-7");
  if (/sleep|insomnia/.test(text)) set.add("isi");
  if (/stress|burnout|overwhelm/.test(text)) set.add("pss-10");
  if (opts.hasCannabisHistory) set.add("cudit-r");

  return set;
}

export default async function AssessmentsPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      presentingConcerns: true,
      treatmentGoals: true,
      cannabisHistory: true,
    },
  });

  const responses = patient
    ? await prisma.assessmentResponse.findMany({
        where: { patientId: patient.id },
        orderBy: { submittedAt: "desc" },
        include: { assessment: true },
      })
    : [];

  const responsesBySlug: Record<string, ResponseRow[]> = {};
  for (const r of responses) {
    const slug = r.assessment.slug;
    if (!responsesBySlug[slug]) responsesBySlug[slug] = [];
    responsesBySlug[slug].push({
      score: r.score,
      interpretation: r.interpretation,
      submittedAt: r.submittedAt,
    });
  }

  const recommended = inferProviderRecommendations({
    presentingConcerns: patient?.presentingConcerns ?? null,
    treatmentGoals: patient?.treatmentGoals ?? null,
    hasCannabisHistory: Boolean(
      patient?.cannabisHistory &&
        typeof patient.cannabisHistory === "object" &&
        (patient.cannabisHistory as any).priorUse,
    ),
  });

  const now = Date.now();
  type Bucket = "upNext" | "stale" | "recent" | "library";
  const triaged: Record<Bucket, typeof TEMPLATES> = {
    upNext: [],
    stale: [],
    recent: [],
    library: [],
  };

  for (const t of TEMPLATES) {
    const history = responsesBySlug[t.slug] ?? [];
    const latest = history[0];
    const isRecommended = recommended.has(t.slug);
    const freshDays = FRESHNESS_DAYS[t.slug] ?? 90;
    const ageDays = latest
      ? Math.floor((now - latest.submittedAt.getTime()) / 86_400_000)
      : Infinity;

    if (isRecommended && !latest) triaged.upNext.push(t);
    else if (latest && ageDays > freshDays && isRecommended) triaged.stale.push(t);
    else if (latest && ageDays > freshDays) triaged.stale.push(t);
    else if (latest) triaged.recent.push(t);
    else triaged.library.push(t);
  }

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PatientSectionNav section="health" />
      <PageHeader
        eyebrow="Assessments"
        title="Quick check-ins"
        description="Your provider-recommended screens come first. Recent results sit beneath them so you can see the pattern. Everything else lives in the library."
      />

      {!patient ? (
        <EmptyState
          title="No patient profile yet"
          description="Complete your intake to unlock assessments."
        />
      ) : (
        <div className="space-y-10">
          <Section
            title="Up next"
            hint="Recommended for you based on your chart."
            tone="accent"
            empty="You're all caught up on the recommended screens."
          >
            {triaged.upNext.map((t) => (
              <AssessmentCard
                key={t.slug}
                template={t}
                latest={responsesBySlug[t.slug]?.[0] ?? null}
                history={responsesBySlug[t.slug] ?? []}
                pinned
              />
            ))}
          </Section>

          {triaged.stale.length > 0 && (
            <Section
              title="Time for a refresh"
              hint="You've taken these before, but the score is more than a couple of months old."
              tone="warning"
            >
              {triaged.stale.map((t) => (
                <AssessmentCard
                  key={t.slug}
                  template={t}
                  latest={responsesBySlug[t.slug]?.[0] ?? null}
                  history={responsesBySlug[t.slug] ?? []}
                />
              ))}
            </Section>
          )}

          {triaged.recent.length > 0 && (
            <Section
              title="Recently taken"
              hint="Up to date — your provider can see these."
              tone="success"
            >
              {triaged.recent.map((t) => (
                <AssessmentCard
                  key={t.slug}
                  template={t}
                  latest={responsesBySlug[t.slug]?.[0] ?? null}
                  history={responsesBySlug[t.slug] ?? []}
                />
              ))}
            </Section>
          )}

          {triaged.library.length > 0 && (
            <Section
              title="Library"
              hint="Optional self-screens. Take any of these whenever you want."
              tone="neutral"
            >
              {triaged.library.map((t) => (
                <AssessmentCard
                  key={t.slug}
                  template={t}
                  latest={null}
                  history={[]}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </PageShell>
  );
}

function Section({
  title,
  hint,
  tone,
  empty,
  children,
}: {
  title: string;
  hint: string;
  tone: "accent" | "warning" | "success" | "neutral";
  empty?: string;
  children: React.ReactNode;
}) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasChildren = childArray.some((c) => c !== false && c != null);
  if (!hasChildren && !empty) return null;

  const dot =
    tone === "accent"
      ? "bg-accent"
      : tone === "warning"
        ? "bg-[color:var(--highlight)]"
        : tone === "success"
          ? "bg-[color:var(--success)]"
          : "bg-border-strong/50";

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
        <div>
          <h2 className="font-display text-lg text-text tracking-tight">
            {title}
          </h2>
          <p className="text-[12px] text-text-subtle leading-snug">{hint}</p>
        </div>
      </div>
      {hasChildren ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>
      ) : (
        empty && (
          <p className="text-sm text-text-muted italic px-1">{empty}</p>
        )
      )}
    </section>
  );
}

function AssessmentCard({
  template,
  latest,
  history,
  pinned,
}: {
  template: (typeof TEMPLATES)[number];
  latest: ResponseRow | null;
  history: ResponseRow[];
  pinned?: boolean;
}) {
  const interp = (latest?.interpretation ?? "").toLowerCase();
  const tone = interp.includes("severe")
    ? ("danger" as const)
    : interp.includes("moderate")
      ? ("warning" as const)
      : interp.includes("mild") || interp.includes("minimal")
        ? ("success" as const)
        : ("neutral" as const);

  return (
    <Card
      tone="raised"
      className={`card-hover flex flex-col ${pinned ? "border-accent/50" : ""}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{template.title}</CardTitle>
          {pinned ? (
            <Badge tone="accent">Recommended</Badge>
          ) : latest ? (
            <Badge tone={tone}>
              {latest.score !== null ? `Score ${latest.score}` : "Recorded"}
            </Badge>
          ) : null}
        </div>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-end">
        {latest ? (
          <div className="mb-4 p-3 rounded-lg bg-surface-muted/60 border border-border/50">
            <p className="text-xs text-text-subtle mb-1">
              Last taken {formatDate(latest.submittedAt)}
            </p>
            {latest.interpretation && (
              <p className="text-sm text-text-muted leading-relaxed line-clamp-2">
                {latest.interpretation}
              </p>
            )}
            {history.length > 1 && (
              <p className="text-xs text-text-subtle mt-1.5">
                {history.length} responses on file
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-subtle mb-4">
            Not yet taken — about two minutes.
          </p>
        )}

        <Link href={`/portal/assessments/${template.slug}`}>
          <Button
            size="sm"
            variant={pinned ? "primary" : "secondary"}
            className="w-full"
          >
            {latest ? "Take again" : "Start"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

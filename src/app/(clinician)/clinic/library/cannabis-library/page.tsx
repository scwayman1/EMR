// EMR-080 — Cannabis Education Library hub (laws + research + patient data).
//
// Unified searchable view that ties together the three reference
// surfaces a clinician needs at the chart: peer-reviewed journal
// articles, an aggregate snapshot of platform patient data, and a
// link out to the state-level legislation tracker. Search runs as a
// querystring filter so the page stays auditable and shareable.

import Link from "next/link";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  RESEARCH_LIBRARY,
  RESEARCH_TOPICS,
  type ResearchTopicId,
} from "@/lib/education/research-library";

export const metadata = { title: "Cannabis Library" };

interface PageProps {
  searchParams: {
    q?: string;
    topic?: string;
    evidence?: string;
  };
}

// Platform-aggregate patient data snapshot. In production these tile
// values come from a cron-rolled materialized view; the shape is what
// matters here so the consumer doesn't drift when the live numbers
// move.
const PATIENT_DATA = {
  enrolledPatients: 1284,
  outcomeLogsLast30d: 8421,
  productsTracked: 142,
  topConditions: [
    { label: "Chronic pain", count: 412 },
    { label: "Anxiety", count: 318 },
    { label: "Insomnia", count: 271 },
    { label: "Neuropathic pain", count: 184 },
    { label: "PTSD", count: 121 },
  ],
  efficacyHighlights: [
    {
      cohort: "Chronic pain · ≥1:1 THC:CBD",
      n: 218,
      improvement: "−2.1 NRS",
      window: "8-week mean",
    },
    {
      cohort: "Insomnia · CBN-dominant",
      n: 146,
      improvement: "−14% SOL",
      window: "30-day median",
    },
    {
      cohort: "Anxiety · CBD-dominant",
      n: 184,
      improvement: "−3.4 GAD-7",
      window: "12-week mean",
    },
  ],
};

function parseTopic(raw: string | undefined): ResearchTopicId | null {
  const allowed = new Set(RESEARCH_TOPICS.map((t) => t.id));
  return raw && allowed.has(raw as ResearchTopicId)
    ? (raw as ResearchTopicId)
    : null;
}

export default function CannabisLibraryPage({ searchParams }: PageProps) {
  const q = (searchParams.q ?? "").toLowerCase().trim();
  const topic = parseTopic(searchParams.topic);
  const evidence =
    searchParams.evidence === "strong" ||
    searchParams.evidence === "moderate" ||
    searchParams.evidence === "emerging"
      ? searchParams.evidence
      : null;

  const filtered = RESEARCH_LIBRARY.filter((a) => {
    if (topic && a.topic !== topic) return false;
    if (evidence && a.evidence !== evidence) return false;
    if (q) {
      const haystack = [a.title, a.authors, a.summary, a.journal ?? ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Library"
        title="Cannabis education library"
        description="Peer-reviewed research, platform patient-outcome data, and state-level legislation in one searchable surface. The clinician answers a patient's question without leaving the chart."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Articles" value={String(RESEARCH_LIBRARY.length)} size="md" />
        <StatCard
          label="Patients enrolled"
          value={PATIENT_DATA.enrolledPatients.toLocaleString()}
          size="md"
          tone="info"
        />
        <StatCard
          label="Outcomes / 30d"
          value={PATIENT_DATA.outcomeLogsLast30d.toLocaleString()}
          size="md"
          tone="success"
        />
        <StatCard
          label="Products tracked"
          value={String(PATIENT_DATA.productsTracked)}
          size="md"
          tone="neutral"
        />
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Search the library</CardTitle>
          <CardDescription>
            Search across titles, authors, and summaries. Filter by topic or evidence tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/clinic/library/cannabis-library"
            method="get"
            className="grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <input
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Search title, author, summary…"
              className="md:col-span-2 bg-surface border border-border rounded-md px-3 py-2 text-sm"
            />
            <select
              name="topic"
              defaultValue={topic ?? ""}
              className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="">All topics</option>
              {RESEARCH_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              name="evidence"
              defaultValue={evidence ?? ""}
              className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="">All evidence tiers</option>
              <option value="strong">Strong</option>
              <option value="moderate">Moderate</option>
              <option value="emerging">Emerging</option>
            </select>
            <div className="md:col-span-4 flex items-center gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent/90"
              >
                Search
              </button>
              <Link
                href="/clinic/library/cannabis-library"
                className="text-sm text-text-muted hover:text-text"
              >
                Reset
              </Link>
              <span className="text-sm text-text-subtle ml-auto">
                {filtered.length} of {RESEARCH_LIBRARY.length} articles
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card tone="raised" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Peer-reviewed research</CardTitle>
            <CardDescription>
              Curated articles tagged with topic + evidence tier. Click through for the full text.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-text-muted">
                No articles match the current filters.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {filtered.map((a) => (
                  <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a
                          href={a.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-text hover:underline"
                        >
                          {a.title}
                        </a>
                        <p className="text-xs text-text-muted mt-0.5">
                          {a.authors} · {a.year}
                          {a.journal ? ` · ${a.journal}` : ""}
                        </p>
                        <p className="text-sm text-text-muted mt-1.5">
                          {a.summary}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge tone="neutral">
                            {RESEARCH_TOPICS.find((t) => t.id === a.topic)?.label}
                          </Badge>
                          <Badge
                            tone={
                              a.evidence === "strong"
                                ? "success"
                                : a.evidence === "moderate"
                                  ? "info"
                                  : "neutral"
                            }
                          >
                            {a.evidence}
                          </Badge>
                          {a.pmid && (
                            <span className="text-[11px] font-mono text-text-subtle">
                              PMID {a.pmid}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card tone="raised">
            <CardHeader>
              <CardTitle>Platform patient data</CardTitle>
              <CardDescription>
                Aggregate, de-identified outcomes across our patient base. Click a row to
                explore the cohort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-text-subtle uppercase tracking-wider mb-2">
                Top conditions
              </p>
              <ul className="text-sm space-y-1 mb-4">
                {PATIENT_DATA.topConditions.map((c) => (
                  <li
                    key={c.label}
                    className="flex items-center justify-between border-b border-border/40 pb-1"
                  >
                    <span className="text-text">{c.label}</span>
                    <span className="text-text-muted tabular-nums">{c.count}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-subtle uppercase tracking-wider mb-2">
                Efficacy highlights
              </p>
              <ul className="space-y-2">
                {PATIENT_DATA.efficacyHighlights.map((h) => (
                  <li
                    key={h.cohort}
                    className="rounded-md border border-border/60 bg-surface-muted px-3 py-2"
                  >
                    <p className="text-sm text-text">{h.cohort}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      n={h.n} · {h.improvement} · {h.window}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/ops/research-exports/builder"
                  className="text-xs text-accent hover:underline"
                >
                  Build a cohort export →
                </Link>
                <Link
                  href="/ops/reports"
                  className="text-xs text-accent hover:underline"
                >
                  Open reports module →
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card tone="raised">
            <CardHeader>
              <CardTitle>Laws &amp; legislation</CardTitle>
              <CardDescription>
                Medical and adult-use status across the 50 states, plus federal
                scheduling.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1.5 mb-3">
                <li className="flex items-center justify-between">
                  <span className="text-text-muted">Federal schedule</span>
                  <span className="text-text">Schedule I</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-muted">Medical-legal states</span>
                  <span className="text-text">38</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-muted">Adult-use legal states</span>
                  <span className="text-text">24</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-muted">Reciprocity states</span>
                  <span className="text-text">12</span>
                </li>
              </ul>
              <Link
                href="/clinic/library/legislation"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-text text-surface hover:opacity-90"
              >
                Open legislation tracker →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

// EMR-202 — Patient education research library.
//
// A curated PDF library of cannabis research articles with a Justin
// Kander spotlight section. The Kander corpus is the cornerstone of
// our patient-facing evidence base; we surface his book + curated
// articles separately from the broader topic library so patients have
// a clear "start here" entry point.
//
// Articles are categorised by topic (sleep, pain, anxiety, cancer,
// etc.) and rendered with a lightweight inline PDF viewer. Each entry
// links to its hosted PDF — we don't embed third-party PDFs by URL
// because mobile Safari struggles with them and the cross-origin
// behaviour is inconsistent. Instead we open in a new tab.

import { redirect } from "next/navigation";
import Link from "next/link";

import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import {
  KANDER_SPOTLIGHT,
  RESEARCH_LIBRARY,
  RESEARCH_TOPICS,
} from "@/lib/education/research-library";

export const metadata = { title: "Research library" };

export default async function ResearchLibraryPage({
  searchParams,
}: {
  searchParams?: { topic?: string };
}) {
  const user = await requireRole("patient");
  if (!user) redirect("/sign-in");

  const activeTopic = searchParams?.topic ?? "all";
  const filtered =
    activeTopic === "all"
      ? RESEARCH_LIBRARY
      : RESEARCH_LIBRARY.filter((r) => r.topic === activeTopic);

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Education · Research"
        title="Cannabis research, demystified"
        description="Plain-language summaries of the studies behind your care plan, plus curated PDFs you can save for an ER visit or a second opinion."
      />

      <Card tone="ambient" className="mb-10">
        <CardContent className="py-7 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)] gap-6 items-start">
            <div className="shrink-0">
              <div className="h-28 w-20 rounded-md bg-gradient-to-br from-accent to-[#1F4E33] shadow-md flex items-center justify-center">
                <span className="font-display text-3xl text-white">JK</span>
              </div>
            </div>
            <div className="min-w-0">
              <Eyebrow className="mb-2 text-accent">
                Spotlight · Justin Kander
              </Eyebrow>
              <h2 className="font-display text-xl md:text-2xl text-text tracking-tight">
                {KANDER_SPOTLIGHT.title}
              </h2>
              <p className="text-sm text-text-muted mt-2 leading-relaxed">
                {KANDER_SPOTLIGHT.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={KANDER_SPOTLIGHT.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm">Open PDF</Button>
                </a>
                <a
                  href={KANDER_SPOTLIGHT.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="secondary">
                    Read on the web
                  </Button>
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {KANDER_SPOTLIGHT.highlights.map((h) => (
                  <Badge key={h} tone="accent" className="text-[10px]">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditorialRule className="my-8" />

      <div className="mb-5">
        <Eyebrow className="mb-2">Browse by topic</Eyebrow>
        <h2 className="font-display text-xl text-text tracking-tight">
          The library
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <TopicChip topic="all" label="All" active={activeTopic === "all"} />
        {RESEARCH_TOPICS.map((t) => (
          <TopicChip
            key={t.id}
            topic={t.id}
            label={t.label}
            active={activeTopic === t.id}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((article) => (
          <Card key={article.id} tone="raised">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">
                  {article.title}
                </CardTitle>
                <Badge tone="accent" className="text-[10px] shrink-0">
                  {RESEARCH_TOPICS.find((t) => t.id === article.topic)?.label ??
                    article.topic}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {article.authors} · {article.year}
                {article.journal ? ` · ${article.journal}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted leading-relaxed mb-3">
                {article.summary}
              </p>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      article.evidence === "strong"
                        ? "success"
                        : article.evidence === "moderate"
                          ? "accent"
                          : "warning"
                    }
                    className="text-[10px]"
                  >
                    {article.evidence} evidence
                  </Badge>
                  {article.pmid && (
                    <span className="text-[11px] text-text-subtle tabular-nums">
                      PMID {article.pmid}
                    </span>
                  )}
                </div>
                <a
                  href={article.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Open PDF →
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card tone="raised">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-text-muted">
              No articles in this topic yet — try a different filter.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-text-subtle mt-10 max-w-2xl mx-auto leading-relaxed text-center">
        Articles are curated by Leafjourney&apos;s clinical team. Always
        discuss what you read with your provider — context matters.
      </p>
    </PageShell>
  );
}

function TopicChip({
  topic,
  label,
  active,
}: {
  topic: string;
  label: string;
  active: boolean;
}) {
  const href = topic === "all" ? "?" : `?topic=${topic}`;
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-white"
          : "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border border-border text-text-muted hover:bg-surface-muted"
      }
    >
      {label}
    </Link>
  );
}

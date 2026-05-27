"use client";

import { useState, useTransition, useEffect } from "react";
import { generateEducationSheet, type EducationSheetResult, type EducationReference } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeafSprig, EditorialRule } from "@/components/ui/ornament";
import {
  citationAnchorProps,
  findCitationSpans,
} from "@/lib/research/citation-resolver";

/**
 * Linkify inline `[N]` citation markers against the supplied reference
 * list. Each marker becomes a superscript anchor that opens the matching
 * PubMed / DOI URL in a new tab. EMR-179.
 */
function renderWithCitations(
  para: string,
  references: EducationReference[],
): React.ReactNode {
  if (references.length === 0) return para;
  const spans = findCitationSpans(para);
  if (spans.length === 0) return para;

  const refByIndex = new Map(references.map((r) => [r.index, r]));
  const out: React.ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    if (span.start > cursor) out.push(para.slice(cursor, span.start));
    const links: React.ReactNode[] = [];
    span.indexes.forEach((idx, j) => {
      const ref = refByIndex.get(idx);
      const anchor = ref
        ? citationAnchorProps({ title: ref.title, pmid: ref.pmid, doi: ref.doi })
        : null;
      if (anchor) {
        links.push(
          <a
            key={`${i}-${j}`}
            {...anchor}
            className="text-accent hover:underline font-medium"
          >
            {idx}
          </a>,
        );
      } else {
        links.push(
          <span key={`${i}-${j}`} className="text-accent">
            {idx}
          </span>,
        );
      }
      if (j < span.indexes.length - 1) links.push(<span key={`sep-${i}-${j}`}>,</span>);
    });
    out.push(
      <sup
        key={`sup-${i}`}
        className="font-mono text-[10px] mx-0.5 text-accent"
        aria-label={`Reference ${span.indexes.join(", ")}`}
      >
        [{links}]
      </sup>,
    );
    cursor = span.end;
  });
  if (cursor < para.length) out.push(para.slice(cursor));
  return <>{out}</>;
}

// Section icon mapping
function SectionIcon({ icon, className }: { icon: string; className?: string }) {
  const icons: Record<string, string> = {
    heart: "\u2764\uFE0F",
    leaf: "\uD83C\uDF3F",
    eye: "\uD83D\uDC41\uFE0F",
    target: "\uD83C\uDFAF",
    shield: "\uD83D\uDEE1\uFE0F",
    book: "\uD83D\uDCD6",
  };
  return <span className={className}>{icons[icon] ?? icons.leaf}</span>;
}

export function EducationView() {
  const [result, setResult] = useState<EducationSheetResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [autoRan, setAutoRan] = useState(false);

  useEffect(() => {
    if (autoRan) return;
    setAutoRan(true);
    startTransition(async () => {
      const r = await generateEducationSheet();
      setResult(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRegenerate() {
    startTransition(async () => {
      const r = await generateEducationSheet();
      setResult(r);
    });
  }

  // Loading
  if (isPending && !result) {
    return (
      <Card tone="ambient" className="text-center py-20">
        <CardContent>
          <div className="flex flex-col items-center gap-5">
            <LeafSprig size={32} className="text-accent animate-pulse" />
            <div>
              <p className="font-display text-xl text-text">
                Creating your care guide...
              </p>
              <p className="text-sm text-text-muted mt-2">
                We are building a personalized education sheet based on your
                care plan, medications, and goals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error
  if (result && !result.ok) {
    return (
      <Card tone="raised" className="border-l-4 border-l-danger">
        <CardContent className="py-10 text-center">
          <p className="text-sm text-danger mb-4">{result.error}</p>
          <Button onClick={handleRegenerate} variant="secondary">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!result?.sheet) return null;
  const { sheet } = result;

  return (
    <div className="space-y-8 print:space-y-6">
      {/* ── Print styles ────────────────────────────── */}
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
                font-size: 12pt !important;
                line-height: 1.6 !important;
              }
              .education-sheet { max-width: 100% !important; padding: 0 !important; }
              .education-section { page-break-inside: avoid; }
              @page { margin: 0.8in 1in; size: letter; }
            }
          `,
        }}
      />

      {/* ── Section cards ───────────────────────────── */}
      {sheet.sections.map((section, i) => (
        <Card key={i} tone="raised" className="education-section overflow-hidden">
          <CardContent className="py-8 px-6 md:px-8">
            <div className="flex items-start gap-4 mb-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg">
                <SectionIcon icon={section.icon} />
              </span>
              <h2 className="font-display text-2xl text-text tracking-tight pt-1">
                {section.heading}
              </h2>
            </div>

            <div className="prose-clinical space-y-3 pl-14">
              {section.body.split("\n\n").map((para, j) => (
                <p key={j} className="text-[15px] text-text-muted leading-relaxed">
                  {renderWithCitations(para, sheet.references ?? [])}
                </p>
              ))}
            </div>

            {section.tips && section.tips.length > 0 && (
              <div className="mt-6 pl-14">
                <div className="rounded-xl bg-accent-soft/40 border border-accent/10 px-5 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent mb-3">
                    Tips for you
                  </p>
                  <ul className="space-y-2">
                    {section.tips.map((tip, k) => (
                      <li key={k} className="flex items-start gap-2 text-sm text-text-muted">
                        <LeafSprig size={12} className="text-accent/60 mt-1 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <EditorialRule />

      {/* ── Safety reminders ────────────────────────── */}
      {sheet.safetyReminders.length > 0 && (
        <Card tone="raised" className="education-section border-l-4 border-l-accent">
          <CardContent className="py-8 px-6 md:px-8">
            <h2 className="font-display text-xl text-text tracking-tight mb-5 flex items-center gap-3">
              <span className="text-lg">&#x1F6E1;&#xFE0F;</span>
              Important reminders
            </h2>
            <ul className="space-y-3">
              {sheet.safetyReminders.map((reminder, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-text-muted">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-medium mt-0.5">
                    {i + 1}
                  </span>
                  {reminder}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── References ──────────────────────────────── */}
      {sheet.references && sheet.references.length > 0 && (
        <Card tone="raised" className="education-section">
          <CardContent className="py-8 px-6 md:px-8">
            <h2 className="font-display text-xl text-text tracking-tight mb-5">
              Research articles cited
            </h2>
            <ol className="space-y-3 list-none">
              {sheet.references.map((ref) => {
                const anchor = citationAnchorProps({
                  title: ref.title,
                  pmid: ref.pmid,
                  doi: ref.doi,
                });
                return (
                  <li
                    key={ref.index}
                    className="pl-4 border-l-2 border-accent/25"
                    id={`reference-${ref.index}`}
                  >
                    <p className="text-sm leading-relaxed">
                      <span className="font-mono text-xs text-accent mr-1">
                        [{ref.index}]
                      </span>
                      {anchor ? (
                        <a
                          {...anchor}
                          className="font-medium text-text hover:text-accent hover:underline"
                        >
                          {ref.title} ↗
                        </a>
                      ) : (
                        <span className="font-medium text-text">{ref.title}</span>
                      )}
                      {ref.authors && (
                        <span className="text-text-muted"> — {ref.authors}</span>
                      )}
                      {ref.journal && (
                        <span className="text-text-subtle italic">, {ref.journal}</span>
                      )}
                      {ref.year && (
                        <span className="text-text-subtle"> ({ref.year})</span>
                      )}
                      {ref.pmid && (
                        <span className="text-[11px] text-text-subtle ml-2 font-mono">
                          PMID: {ref.pmid}
                        </span>
                      )}
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* ── Glossary ────────────────────────────────── */}
      {sheet.glossary.length > 0 && (
        <Card tone="ambient" className="education-section">
          <CardContent className="py-8 px-6 md:px-8">
            <h2 className="font-display text-xl text-text tracking-tight mb-5">
              Words you might see
            </h2>
            <div className="space-y-3">
              {sheet.glossary.map((entry, i) => (
                <div key={i} className="pl-4 border-l-2 border-accent/25">
                  <p className="text-sm">
                    <span className="font-medium text-text">{entry.term}</span>
                    <span className="text-text-muted">
                      {" \u2014 "}
                      {entry.definition}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Actions ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 print:hidden">
        <Button onClick={() => window.print()} variant="primary">
          Print this guide
        </Button>
        <Button onClick={handleRegenerate} variant="secondary" disabled={isPending}>
          {isPending ? "Creating..." : "Generate a new guide"}
        </Button>
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <p className="text-[11px] text-text-subtle text-center">
        Prepared for {sheet.patientName} on{" "}
        {new Date(sheet.generatedAt).toLocaleString()} ·{" "}
        {(result.durationMs / 1000).toFixed(1)}s
      </p>
    </div>
  );
}

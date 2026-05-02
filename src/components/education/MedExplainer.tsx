"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  MED_EXPLAINERS,
  type MedExplainer as MedExplainerData,
  type Severity,
  searchExplainers,
} from "@/lib/education/medication-explainer";

// ---------------------------------------------------------------------------
// EMR-133 — Patient Medication Explainer
// ---------------------------------------------------------------------------
// Cartoon-style, plain-language explainer for one or more medications.
// Two surfaces:
//   • <MedExplainer name="metformin" /> — single med, embedded inline.
//   • <MedExplainerBrowser /> — searchable catalog page.
// ---------------------------------------------------------------------------

const SEVERITY_TONE: Record<Severity, string> = {
  common: "bg-amber-50 border-amber-200 text-amber-900",
  serious: "bg-rose-50 border-rose-200 text-rose-900",
  rare: "bg-sky-50 border-sky-200 text-sky-900",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  common: "Often",
  serious: "Important",
  rare: "Rare",
};

interface MedExplainerProps {
  /** Lookup by id, generic, or brand name. */
  name?: string;
  /** Or pass the explainer record directly. */
  explainer?: MedExplainerData;
  /** Hide the cannabis note when not relevant for this patient. */
  hideCannabisNote?: boolean;
}

export function MedExplainer({ name, explainer, hideCannabisNote }: MedExplainerProps) {
  const data = useMemo(() => {
    if (explainer) return explainer;
    if (!name) return null;
    return MED_EXPLAINERS.find(
      (m) =>
        m.id === name.toLowerCase() ||
        m.name.toLowerCase() === name.toLowerCase() ||
        m.brands?.some((b) => b.toLowerCase() === name.toLowerCase()),
    ) ?? null;
  }, [name, explainer]);

  if (!data) {
    return (
      <Card tone="ambient">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-text-muted">
            We don&apos;t have a friendly explainer for{" "}
            <span className="font-medium text-text">{name}</span> yet. Your care
            team can help.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <article className="space-y-5">
      {/* Hero */}
      <Card tone="raised" className="overflow-hidden">
        <div className="bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 px-6 py-8 text-center">
          <span aria-hidden className="block text-7xl mb-3 drop-shadow-sm">
            {data.emoji}
          </span>
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-subtle mb-1">
            {data.category}
          </p>
          <h2 className="font-display text-3xl text-text tracking-tight">
            {data.name}
          </h2>
          {data.brands && data.brands.length > 0 && (
            <p className="text-xs text-text-muted mt-1">
              also known as {data.brands.join(", ")}
            </p>
          )}
        </div>
        <CardContent className="py-6 px-6 text-center">
          <p className="text-[17px] text-text leading-relaxed max-w-prose mx-auto">
            {data.whatItDoes}
          </p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-surface-muted px-5 py-3">
            <span aria-hidden className="text-3xl">
              {data.illustration.actor}
            </span>
            <span aria-hidden className="text-text-subtle text-xl">
              {data.illustration.arrow}
            </span>
            <span aria-hidden className="text-3xl">
              {data.illustration.target}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* How to take */}
      <Card tone="raised">
        <CardContent className="py-5 px-5">
          <h3 className="font-display text-lg text-text mb-2 flex items-center gap-2">
            <span aria-hidden>⏰</span>
            How to take it
          </h3>
          <p className="text-sm text-text leading-relaxed">{data.howToTake}</p>
          {data.helpfulTips.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {data.helpfulTips.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                  <span aria-hidden className="text-accent">✦</span>
                  {t}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Side effects */}
      <Card tone="raised">
        <CardContent className="py-5 px-5">
          <h3 className="font-display text-lg text-text mb-3 flex items-center gap-2">
            <span aria-hidden>👀</span>
            Things to watch for
          </h3>
          <ul className="space-y-2">
            {data.sideEffects.map((s, i) => (
              <li
                key={i}
                className={`rounded-md border px-3 py-2 ${SEVERITY_TONE[s.severity]}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold mt-0.5 shrink-0">
                    {SEVERITY_LABEL[s.severity]}
                  </span>
                  <span className="text-sm leading-relaxed">{s.text}</span>
                </div>
                {s.whatToDo && (
                  <p className="text-xs mt-1 italic">{s.whatToDo}</p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Interactions */}
      {data.interactions.length > 0 && (
        <Card tone="raised">
          <CardContent className="py-5 px-5">
            <h3 className="font-display text-lg text-text mb-3 flex items-center gap-2">
              <span aria-hidden>⚠️</span>
              Mix carefully with
            </h3>
            <ul className="space-y-2">
              {data.interactions.map((it, i) => (
                <li
                  key={i}
                  className={`rounded-md border px-3 py-2 ${SEVERITY_TONE[it.severity]}`}
                >
                  <p className="text-sm">
                    <span className="font-medium">{it.with}</span> —{" "}
                    {it.warning}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Cannabis note */}
      {data.cannabisNote && !hideCannabisNote && (
        <Card tone="ambient" className="border-l-4 border-l-accent">
          <CardContent className="py-4 px-5 flex items-start gap-3">
            <span aria-hidden className="text-2xl">🌿</span>
            <p className="text-sm text-text-muted leading-relaxed">
              {data.cannabisNote}
            </p>
          </CardContent>
        </Card>
      )}
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Searchable browser variant                                                 */
/* -------------------------------------------------------------------------- */

export function MedExplainerBrowser() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MedExplainerData | null>(null);
  const results = useMemo(() => searchExplainers(query, 12), [query]);

  if (selected) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-sm text-accent hover:underline"
        >
          ← Back to all medicines
        </button>
        <MedExplainer explainer={selected} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name (metformin, Lipitor, CBD)…"
        className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text shadow-sm"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelected(m)}
            className="text-left"
          >
            <Card tone="raised" className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="py-4 px-5 flex items-center gap-4">
                <span aria-hidden className="text-4xl">
                  {m.emoji}
                </span>
                <div>
                  <p className="font-display text-base text-text">{m.name}</p>
                  <p className="text-[11px] uppercase tracking-wider text-text-subtle mt-0.5">
                    {m.category}
                  </p>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">
                    {m.whatItDoes}
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
        {results.length === 0 && (
          <p className="col-span-full text-sm text-text-muted text-center py-8">
            No matches. Try a different word, or ask your care team.
          </p>
        )}
      </div>
    </div>
  );
}

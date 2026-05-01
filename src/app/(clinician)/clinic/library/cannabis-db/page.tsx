// EMR-111 — Cannabis education database (clinician view).
//
// Browser for the EDUCATION_ENTRIES corpus. Filter by category, search
// any field, drill into compound detail. Drives chart-side answers
// when the clinician needs to explain CBG, citral, or 5-HT1A activity
// without leaving the patient context.

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
import { EmptyState } from "@/components/ui/empty-state";
import { LeafSprig } from "@/components/ui/ornament";
import {
  EDUCATION_ENTRIES,
  searchEducation,
  entriesByCategory,
  getEducationEntry,
  type CompoundCategory,
} from "@/lib/billing/education-db";

export const metadata = { title: "Cannabis education database" };

const CATEGORIES: CompoundCategory[] = [
  "cannabinoid",
  "terpene",
  "flavonoid",
  "receptor",
  "dosing",
  "system",
];

const CATEGORY_TONE: Record<CompoundCategory, "accent" | "info" | "highlight" | "success" | "warning" | "neutral"> = {
  cannabinoid: "accent",
  terpene: "info",
  flavonoid: "highlight",
  receptor: "success",
  dosing: "warning",
  system: "neutral",
};

export default function CannabisDbPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; id?: string };
}) {
  const query = (searchParams.q ?? "").trim();
  const categoryFilter = (CATEGORIES as readonly string[]).includes(searchParams.category ?? "")
    ? (searchParams.category as CompoundCategory)
    : null;
  const detail = searchParams.id ? getEducationEntry(searchParams.id) : null;

  let entries = query
    ? searchEducation(query, 100)
    : categoryFilter
      ? entriesByCategory(categoryFilter)
      : EDUCATION_ENTRIES;
  if (categoryFilter && query) {
    entries = entries.filter((e) => e.category === categoryFilter);
  }

  const counts: Record<CompoundCategory, number> = {
    cannabinoid: 0,
    terpene: 0,
    flavonoid: 0,
    receptor: 0,
    dosing: 0,
    system: 0,
  };
  for (const e of EDUCATION_ENTRIES) counts[e.category]++;

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Library"
        title="Cannabis education database"
        description="Curated reference data for cannabinoids, terpenes, flavonoids, receptors, dosing fundamentals, and the endocannabinoid system. Searchable across every field; safe to embed in patient-facing materials."
      />

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/clinic/library/cannabis-db?category=${cat}`}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 hover:bg-surface-muted transition-colors"
          >
            <p className="text-[11px] uppercase tracking-wider text-text-subtle">{cat}</p>
            <p className="font-display text-xl text-text mt-0.5 tabular-nums">
              {counts[cat]}
            </p>
          </Link>
        ))}
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent/80" />
            Search
          </CardTitle>
          <CardDescription>
            Searches name, aliases, summary, body, and reported effects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/clinic/library/cannabis-db" method="get" className="flex gap-2 items-end">
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-text-muted">Query</span>
              <input
                name="q"
                defaultValue={query}
                placeholder="myrcene, anti-inflammatory, CB1…"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Category</span>
              <select
                name="category"
                defaultValue={categoryFilter ?? ""}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">all</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md bg-text px-4 py-2 text-sm text-surface hover:opacity-90"
            >
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      {detail && (
        <Card tone="raised" className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {detail.name}
                  <Badge tone={CATEGORY_TONE[detail.category]}>{detail.category}</Badge>
                </CardTitle>
                <CardDescription>{detail.oneLineSummary}</CardDescription>
              </div>
              <Link
                href="/clinic/library/cannabis-db"
                className="text-xs text-text-muted hover:text-text underline"
              >
                ← back to list
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {detail.aliases.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {detail.aliases.map((a) => (
                  <span
                    key={a}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-muted text-text-muted"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-muted">
              {detail.body.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {detail.reportedEffects && detail.reportedEffects.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-2">
                  Reported effects
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail.reportedEffects.map((e) => (
                    <Badge key={e} tone="success">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {detail.aromaticNotes && detail.aromaticNotes.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-2">
                  Aromatic notes
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail.aromaticNotes.map((n) => (
                    <Badge key={n} tone="info">
                      {n}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {detail.citations.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-2">
                  Citations
                </p>
                <ul className="text-xs text-text-muted space-y-1">
                  {detail.citations.map((c) => (
                    <li key={c} className="font-mono">
                      doi:{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card tone="raised">
        <CardHeader>
          <CardTitle>
            {entries.length === EDUCATION_ENTRIES.length
              ? "All entries"
              : `${entries.length} match${entries.length === 1 ? "" : "es"}`}
          </CardTitle>
          <CardDescription>
            Click an entry to view the full record. The dataset doubles as the source for claim
            narratives and appeal letters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState title="Nothing matches" description="Try a different keyword or clear the category filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Name</th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Category</th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Aliases</th>
                    <th className="py-2 text-text-subtle text-[11px] uppercase tracking-wider">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 pr-3 text-text">
                        <Link
                          href={`/clinic/library/cannabis-db?id=${e.id}${query ? `&q=${encodeURIComponent(query)}` : ""}${categoryFilter ? `&category=${categoryFilter}` : ""}`}
                          className="hover:text-accent underline-offset-2 hover:underline"
                        >
                          {e.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={CATEGORY_TONE[e.category]}>{e.category}</Badge>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-text-muted">
                        {e.aliases.slice(0, 3).join(", ") || "—"}
                      </td>
                      <td className="py-2 text-text-muted">{e.oneLineSummary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

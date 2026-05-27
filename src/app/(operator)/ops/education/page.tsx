import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  EDUCATION_ENTRIES,
  searchEducation,
  entriesByCategory,
  type CompoundCategory,
  type EducationEntry,
} from "@/lib/billing/education-db";

export const metadata = { title: "Cannabis Education Database" };

const CATEGORY_LABEL: Record<CompoundCategory, string> = {
  cannabinoid: "Cannabinoids",
  terpene: "Terpenes",
  flavonoid: "Flavonoids",
  receptor: "Receptors",
  dosing: "Dosing",
  system: "Systems",
};

const CATEGORY_TONE: Record<CompoundCategory, "highlight" | "accent" | "success" | "info" | "warning" | "neutral"> = {
  cannabinoid: "highlight",
  terpene: "accent",
  flavonoid: "success",
  receptor: "info",
  dosing: "warning",
  system: "neutral",
};

const CATEGORY_ORDER: CompoundCategory[] = [
  "cannabinoid",
  "terpene",
  "flavonoid",
  "receptor",
  "system",
  "dosing",
];

export default async function EducationDbPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: CompoundCategory };
}) {
  const query = (searchParams.q ?? "").trim();
  const category = searchParams.category;
  let results: EducationEntry[];
  if (query) {
    results = searchEducation(query, 50);
  } else if (category) {
    results = entriesByCategory(category);
  } else {
    results = EDUCATION_ENTRIES;
  }

  const counts = CATEGORY_ORDER.map((c) => ({
    category: c,
    count: entriesByCategory(c).length,
  }));

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Education curation"
        title="Cannabis Education Database"
        description="Curated reference data behind the patient Education tab and the appeals-letter generator. Search compounds, scan categories, drop one-line summaries into payer correspondence."
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        <StatCard label="Entries" value={String(EDUCATION_ENTRIES.length)} size="sm" />
        {counts.map((c) => (
          <StatCard
            key={c.category}
            label={CATEGORY_LABEL[c.category]}
            value={String(c.count)}
            size="sm"
          />
        ))}
      </div>

      <form action="/ops/education" method="get" className="mb-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by name, alias, or text…"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-text px-4 py-2 text-sm text-surface hover:opacity-90"
        >
          Search
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((entry) => (
          <Card key={entry.id} tone="raised">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{entry.name}</CardTitle>
                  <CardDescription>{entry.aliases.join(" · ") || entry.id}</CardDescription>
                </div>
                <Badge tone={CATEGORY_TONE[entry.category]}>
                  {CATEGORY_LABEL[entry.category]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text mb-3">{entry.oneLineSummary}</p>
              <ul className="text-sm text-text-muted space-y-1 list-disc pl-5">
                {entry.body.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              {entry.aromaticNotes && entry.aromaticNotes.length > 0 && (
                <p className="text-xs text-text-subtle mt-3">
                  <span className="font-medium">Aromatic notes:</span>{" "}
                  {entry.aromaticNotes.join(", ")}
                </p>
              )}
              {entry.reportedEffects && entry.reportedEffects.length > 0 && (
                <p className="text-xs text-text-subtle mt-1">
                  <span className="font-medium">Reported effects:</span>{" "}
                  {entry.reportedEffects.join(", ")}
                </p>
              )}
              {entry.citations.length > 0 && (
                <p className="text-xs text-text-subtle mt-2">
                  Citations: {entry.citations.join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

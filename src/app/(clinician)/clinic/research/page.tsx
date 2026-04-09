import { prisma } from "@/lib/db/prisma";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResearchSearchForm } from "./research-form";

export const metadata = { title: "Research" };

export default async function ResearchConsolePage({
  searchParams,
}: {
  searchParams: { q?: string; id?: string };
}) {
  const recent = await prisma.researchQuery.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { results: { orderBy: { rank: "asc" } } },
  });

  const selected = searchParams.id
    ? recent.find((r) => r.id === searchParams.id) ?? null
    : recent[0] ?? null;

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Research"
        title="Evidence at the point of care"
        description="Query the research corpus. Results are summarized and traceable to source."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search</CardTitle>
              <CardDescription>
                Try: &quot;neuropathic pain&quot;, &quot;sleep&quot;, &quot;anxiety cbd&quot;.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResearchSearchForm />
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader>
                <CardTitle>{selected.queryText}</CardTitle>
                <CardDescription>
                  {selected.results.length} result{selected.results.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selected.results.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    No matches in the indexed corpus. Try broadening the query.
                  </p>
                ) : (
                  <ul className="divide-y divide-border -mx-6">
                    {selected.results.map((r) => (
                      <li key={r.id} className="px-6 py-4">
                        <p className="text-sm font-medium text-text">{r.title}</p>
                        <p className="text-xs text-text-subtle mt-1">{r.citation}</p>
                        <p className="text-sm text-text-muted mt-2">{r.summary}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent queries</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-text-muted">No searches yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recent.map((q) => (
                    <li key={q.id}>
                      <a
                        href={`?id=${q.id}`}
                        className="block text-sm text-text hover:text-accent transition-colors"
                      >
                        {q.queryText}
                      </a>
                      <Badge tone="neutral" className="mt-1">
                        {q.results.length} results
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

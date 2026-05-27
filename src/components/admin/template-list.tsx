"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Row data passed in by the server component. Kept intentionally narrow so
 * we don't leak the full manifest into the client bundle — the detail view
 * loads it again on demand.
 */
export interface TemplateRow {
  slug: string;
  name: string;
  version: string;
  description?: string | null;
  icon?: string | null;
  includedModalitiesCount: number;
  excludedModalitiesCount: number;
  hasCannabisModality: boolean;
  dependentPracticesCount: number;
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "cannabis", label: "Has cannabis modality" },
  { id: "pain-management", label: "Pain Management" },
  { id: "internal-medicine", label: "Internal Medicine" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function matchesFilter(row: TemplateRow, filter: FilterId): boolean {
  switch (filter) {
    case "all":
      return true;
    case "cannabis":
      return row.hasCannabisModality;
    case "pain-management":
      return row.slug === "pain-management";
    case "internal-medicine":
      return row.slug === "internal-medicine";
  }
}

export function TemplateList({ rows }: { rows: TemplateRow[] }) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FilterId>("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          type="search"
          placeholder="Search by name or slug"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="md:max-w-sm"
          aria-label="Search templates"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={
                  "px-3 h-8 text-xs rounded-full border transition-colors " +
                  (active
                    ? "bg-accent text-accent-ink border-accent"
                    : "bg-surface text-text-muted border-border-strong/60 hover:bg-surface-muted")
                }
                aria-pressed={active}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-strong/60 px-6 py-12 text-center text-sm text-text-muted">
          No templates match the current search/filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border/80">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-text-muted">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Template</th>
                <th className="px-4 py-2.5 font-medium">Slug</th>
                <th className="px-4 py-2.5 font-medium">Version</th>
                <th className="px-4 py-2.5 font-medium text-right">Included</th>
                <th className="px-4 py-2.5 font-medium text-right">Excluded</th>
                <th className="px-4 py-2.5 font-medium text-right">Practices</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.slug}
                  className="border-t border-border/60 hover:bg-surface-muted/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/templates/${row.slug}`}
                      className="font-medium text-text hover:text-accent"
                    >
                      <span className="inline-flex items-center gap-2">
                        {row.icon ? (
                          <span aria-hidden className="text-base leading-none">
                            {row.icon}
                          </span>
                        ) : null}
                        {row.name}
                      </span>
                    </Link>
                    {row.hasCannabisModality ? (
                      <Badge tone="accent" className="ml-2 align-middle">
                        cannabis
                      </Badge>
                    ) : null}
                    {row.description ? (
                      <p className="text-xs text-text-subtle mt-0.5 line-clamp-1">
                        {row.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">
                    {row.slug}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{row.version}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.includedModalitiesCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                    {row.excludedModalitiesCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.dependentPracticesCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-subtle">
        Showing {filtered.length} of {rows.length} templates.
      </p>
    </div>
  );
}

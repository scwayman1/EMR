"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  presentingConcerns: string | null;
  completenessScore: number | null;
  updatedAt: string;
}

type SortField = "name" | "updated";
type SortDir = "asc" | "desc";

export function PatientListClient({ patients }: { patients: PatientRow[] }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = patients;
    if (q) {
      list = list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortField === "name") {
        const cmp = `${a.lastName}${a.firstName}`.localeCompare(
          `${b.lastName}${b.firstName}`
        );
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp =
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [patients, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "updated" ? "desc" : "asc");
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Search + sort controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="w-full h-10 pl-9 pr-4 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-text placeholder:text-text-subtle"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleSort("name")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              sortField === "name"
                ? "bg-accent-soft text-accent"
                : "text-text-muted hover:bg-surface-muted"
            }`}
          >
            Name {sortField === "name" && (sortDir === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => toggleSort("updated")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              sortField === "updated"
                ? "bg-accent-soft text-accent"
                : "text-text-muted hover:bg-surface-muted"
            }`}
          >
            Last updated{" "}
            {sortField === "updated" && (sortDir === "asc" ? "↑" : "↓")}
          </button>
        </div>
      </div>

      {/* Patient list */}
      <Card>
        <CardContent className="pt-2 pb-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-muted">
                {search ? "No patients match your search." : "No patients on record."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border -mx-6">
              {filtered.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/clinic/patients/${p.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-surface-muted transition-colors"
                  >
                    <Avatar firstName={p.firstName} lastName={p.lastName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text">
                          {p.firstName} {p.lastName}
                        </p>
                        <Badge tone="neutral">{p.status}</Badge>
                        {p.completenessScore !== null && (
                          <Badge tone="accent">
                            Chart {p.completenessScore}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-subtle mt-1 truncate">
                        {p.presentingConcerns ?? "—"}
                      </p>
                    </div>
                    <p className="text-xs text-text-subtle hidden md:block tabular-nums">
                      Updated {formatDate(p.updatedAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

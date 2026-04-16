"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export type PolicyCategory = "Clinical" | "HIPAA" | "Safety" | "Operations" | "Emergency";

export interface Policy {
  id: string;
  title: string;
  category: PolicyCategory;
  updatedAt: string; // yyyy-mm-dd
  body: string;
}

const CATEGORIES: PolicyCategory[] = ["Clinical", "HIPAA", "Safety", "Operations", "Emergency"];
const ACK_STORAGE = "leafjourney:policy-ack";

function loadAcks(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ACK_STORAGE);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveAcks(next: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACK_STORAGE, JSON.stringify(next));
}

export function PoliciesView({ policies }: { policies: Policy[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PolicyCategory | "All">("All");
  const [selectedId, setSelectedId] = useState<string>(policies[0]?.id ?? "");
  const [acks, setAcks] = useState<Record<string, string>>({});

  useEffect(() => {
    setAcks(loadAcks());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return policies.filter((p) => {
      const catOk = category === "All" ? true : p.category === category;
      const qOk = !q
        ? true
        : p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [policies, query, category]);

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  function acknowledge(id: string) {
    const next = { ...acks, [id]: new Date().toISOString() };
    setAcks(next);
    saveAcks(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          type="search"
          placeholder="Search policies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="md:w-80"
        />
        <Button size="sm" variant="secondary" onClick={() => alert("Demo: open new-policy editor")}>
          + Create new policy
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <Card tone="raised">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wider text-text-subtle mb-2">Categories</p>
            <ul className="space-y-1">
              {(["All", ...CATEGORIES] as const).map((c) => {
                const count =
                  c === "All" ? policies.length : policies.filter((p) => p.category === c).length;
                const active = category === c;
                return (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors",
                        active
                          ? "bg-accent-soft text-accent"
                          : "text-text-muted hover:bg-surface-muted",
                      )}
                    >
                      <span>{c}</span>
                      <span className="text-[10px] tabular-nums text-text-subtle">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 pt-4 border-t border-border/60">
              <p className="text-xs uppercase tracking-wider text-text-subtle mb-2">Policies</p>
              <ul className="space-y-1 max-h-[380px] overflow-y-auto">
                {filtered.map((p) => {
                  const active = selected?.id === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors",
                          active
                            ? "bg-surface-muted text-text"
                            : "text-text-muted hover:bg-surface-muted/60",
                        )}
                      >
                        {p.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardContent className="py-6">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge tone="accent">{selected.category}</Badge>
                      <span className="text-[11px] text-text-subtle">
                        Updated {selected.updatedAt}
                      </span>
                      {acks[selected.id] && (
                        <Badge tone="success">Acknowledged</Badge>
                      )}
                    </div>
                    <h2 className="font-display text-2xl text-text">{selected.title}</h2>
                  </div>
                  <Button
                    size="sm"
                    variant={acks[selected.id] ? "ghost" : "primary"}
                    onClick={() => acknowledge(selected.id)}
                    disabled={!!acks[selected.id]}
                  >
                    {acks[selected.id] ? "Acknowledged" : "Acknowledge this policy"}
                  </Button>
                </div>
                <article className="prose prose-sm max-w-none text-text-muted whitespace-pre-line leading-relaxed">
                  {selected.body}
                </article>
                {acks[selected.id] && (
                  <p className="mt-6 text-[11px] text-text-subtle">
                    Acknowledged on {new Date(acks[selected.id]!).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-text-subtle">No policy selected.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface Condition {
  id: string;
  name: string;
  emoji: string;
  icd10: string;
  patients: number;
  avgImprovementPct: number;
  topProduct: string;
  products: { name: string; usage: number; improvement: number }[];
  // 5 buckets: >50%, 25-50%, 10-25%, <10%, no improvement
  distribution: [number, number, number, number, number];
}

const BUCKETS = [
  { label: ">50% improvement", color: "bg-emerald-500" },
  { label: "25-50% improvement", color: "bg-emerald-300" },
  { label: "10-25% improvement", color: "bg-amber-300" },
  { label: "<10% improvement", color: "bg-orange-300" },
  { label: "No improvement", color: "bg-red-400" },
];

// EMR-379 — Inline expand. Each condition row toggles a details panel
// that renders directly underneath that row instead of pushing a single
// shared panel to the bottom of the page. Multiple cards can be open
// simultaneously; clicking the same card again collapses it.
export function AtlasView({ conditions }: { conditions: Condition[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-3 mb-8">
      {conditions.map((c) => {
        const open = openIds.has(c.id);
        return (
          <div key={c.id}>
            <button
              type="button"
              onClick={() => toggle(c.id)}
              aria-expanded={open}
              aria-controls={`atlas-panel-${c.id}`}
              className="w-full text-left group"
            >
              <Card
                tone="raised"
                className={cn(
                  "transition-all duration-200 hover:shadow-lg hover:border-accent/40",
                  open && "border-accent ring-2 ring-accent/30 rounded-b-none"
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl leading-none">{c.emoji}</span>
                      <div className="min-w-0">
                        <CardTitle className="group-hover:text-accent transition-colors truncate">
                          {c.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge tone="neutral">{c.icd10}</Badge>
                          <span className="text-xs text-text-subtle">
                            {c.patients} patients
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                          Avg improvement
                        </p>
                        <p className="font-display text-2xl text-emerald-600 tabular-nums leading-none mt-1">
                          +{c.avgImprovementPct}%
                        </p>
                      </div>
                      <div className="hidden sm:block min-w-[180px] max-w-[220px]">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                          Top product
                        </p>
                        <p className="text-sm text-text mt-0.5 truncate">
                          {c.topProduct}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "text-text-subtle transition-transform duration-200",
                          open && "rotate-180"
                        )}
                      >
                        ▾
                      </span>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </button>

            {open && (
              <div
                id={`atlas-panel-${c.id}`}
                className="border-x border-b border-accent rounded-b-lg bg-surface px-6 py-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-4">
                      Outcome distribution
                    </h4>
                    <div className="space-y-3">
                      {c.distribution.map((pct, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-muted">
                              {BUCKETS[i].label}
                            </span>
                            <span className="tabular-nums text-text">{pct}%</span>
                          </div>
                          <div className="h-3 bg-surface-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                BUCKETS[i].color
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-4">
                      Top products for {c.name}
                    </h4>
                    <div className="space-y-3">
                      {c.products.map((p) => (
                        <div
                          key={p.name}
                          className="p-3 rounded-lg border border-border bg-surface-muted"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-text">
                              {p.name}
                            </p>
                            <Badge tone="success">+{p.improvement}%</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-subtle">
                            <span>{p.usage} patients</span>
                            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (p.usage / c.patients) * 100 * 1.5
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle(c.id)}
                  >
                    Collapse
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

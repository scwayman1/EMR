"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
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

export function AtlasView({ conditions }: { conditions: Condition[] }) {
  const [active, setActive] = useState<Condition | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {conditions.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c)}
            className="text-left group"
          >
            <Card
              tone="raised"
              className={cn(
                "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-accent/40 h-full",
                active?.id === c.id && "border-accent ring-2 ring-accent/30"
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl leading-none">{c.emoji}</span>
                  <Badge tone="neutral">{c.icd10}</Badge>
                </div>
                <CardTitle className="mt-3 group-hover:text-accent transition-colors">
                  {c.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-text-subtle">Patients</span>
                    <span className="font-display text-xl text-text tabular-nums">
                      {c.patients}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-text-subtle">
                      Avg improvement
                    </span>
                    <span className="font-display text-xl text-emerald-600 tabular-nums">
                      +{c.avgImprovementPct}%
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                      Top product
                    </p>
                    <p className="text-sm text-text mt-1 truncate">
                      {c.topProduct}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {active && (
        <Card tone="raised" className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{active.emoji}</span>
                  {active.name}
                  <Badge tone="neutral">{active.icd10}</Badge>
                </CardTitle>
                <CardDescription>
                  {active.patients} patients · Avg improvement{" "}
                  <strong className="text-emerald-600">
                    +{active.avgImprovementPct}%
                  </strong>
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActive(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-4">
                  Outcome distribution
                </h4>
                <div className="space-y-3">
                  {active.distribution.map((pct, i) => (
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
                  Top products for {active.name}
                </h4>
                <div className="space-y-3">
                  {active.products.map((p) => (
                    <div
                      key={p.name}
                      className="p-3 rounded-lg border border-border bg-surface"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-text">
                          {p.name}
                        </p>
                        <Badge tone="success">+{p.improvement}%</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-subtle">
                        <span>{p.usage} patients</span>
                        <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (p.usage / active.patients) * 100 * 1.5
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
          </CardContent>
        </Card>
      )}
    </>
  );
}

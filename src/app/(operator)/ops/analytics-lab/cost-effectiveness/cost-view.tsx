"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export interface CostProduct {
  id: string;
  name: string;
  category: string;
  monthlyCost: number;
  avgImprovementPct: number;
  qalyProxy: number;
}

type SortKey = "ratio" | "cost" | "improvement" | "qaly";

function improvementPerDollar(p: CostProduct) {
  return p.avgImprovementPct / p.monthlyCost;
}

export function CostView({ products }: { products: CostProduct[] }) {
  const [sort, setSort] = useState<SortKey>("ratio");

  const sorted = useMemo(() => {
    const copy = [...products];
    switch (sort) {
      case "ratio":
        copy.sort((a, b) => improvementPerDollar(b) - improvementPerDollar(a));
        break;
      case "cost":
        copy.sort((a, b) => a.monthlyCost - b.monthlyCost);
        break;
      case "improvement":
        copy.sort((a, b) => b.avgImprovementPct - a.avgImprovementPct);
        break;
      case "qaly":
        copy.sort((a, b) => b.qalyProxy - a.qalyProxy);
        break;
    }
    return copy;
  }, [products, sort]);

  const best5 = useMemo(() => {
    return [...products]
      .sort((a, b) => improvementPerDollar(b) - improvementPerDollar(a))
      .slice(0, 5)
      .map((p) => p.id);
  }, [products]);

  const maxRatio = Math.max(...products.map(improvementPerDollar));

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            { key: "ratio", label: "Improvement / $" },
            { key: "cost", label: "Cost" },
            { key: "improvement", label: "Improvement %" },
            { key: "qaly", label: "QALY proxy" },
          ] as { key: SortKey; label: string }[]
        ).map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={cn(
              "h-9 px-4 rounded-full text-sm font-medium border transition-all",
              sort === s.key
                ? "bg-accent text-accent-ink border-accent"
                : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Card tone="raised" className="mb-6 border-emerald-300/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            Top 5 best value
          </CardTitle>
          <CardDescription>
            Highest improvement-per-dollar products. Starred throughout the grid.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((p) => {
          const ratio = improvementPerDollar(p);
          const isBest = best5.includes(p.id);
          const ratioPct = (ratio / maxRatio) * 100;
          return (
            <Card
              key={p.id}
              tone="raised"
              className={cn(
                isBest && "border-emerald-400 bg-emerald-50/40"
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {isBest && <span>💎</span>}
                      {p.name}
                    </CardTitle>
                    <CardDescription>{p.category}</CardDescription>
                  </div>
                  {isBest && <Badge tone="success">Best value</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                      Cost / month
                    </p>
                    <p className="font-display text-xl text-text mt-0.5 tabular-nums">
                      ${p.monthlyCost}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                      Avg improvement
                    </p>
                    <p className="font-display text-xl text-emerald-600 mt-0.5 tabular-nums">
                      +{p.avgImprovementPct}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                      QALY proxy
                    </p>
                    <p className="font-display text-xl text-text mt-0.5 tabular-nums">
                      {p.qalyProxy.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                      Improv / $
                    </p>
                    <p className="font-display text-xl text-text mt-0.5 tabular-nums">
                      {ratio.toFixed(3)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium mb-1.5">
                    Cost-effectiveness
                  </p>
                  <div className="h-2.5 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isBest ? "bg-emerald-500" : "bg-accent"
                      )}
                      style={{ width: `${ratioPct}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-text-subtle mt-6 leading-relaxed">
        <strong>Method:</strong> Monthly cost is the typical patient spend at
        prescribed dose. Improvement % is the cohort-average change in the
        patient's primary outcome over 90 days. QALY proxy is a heuristic based
        on self-reported wellbeing deltas — not a formal ICER analysis.
      </p>
    </>
  );
}

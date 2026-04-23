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
import { cn } from "@/lib/utils/cn";

export interface Terpene {
  name: string;
  emoji: string;
  color: string;
  avgImprovementPct: number;
  patients: number;
  effects: string[];
  aroma: string;
}

export interface Correlation {
  terpene: string;
  values: number[];
}

type Tab = "grid" | "correlation";

function corrColor(v: number): string {
  if (v >= 75) return "bg-emerald-500 text-white";
  if (v >= 60) return "bg-emerald-300 text-emerald-900";
  if (v >= 45) return "bg-amber-200 text-amber-900";
  if (v >= 30) return "bg-orange-200 text-orange-900";
  return "bg-red-200 text-red-900";
}

export function TerpenesView({
  terpenes,
  correlations,
  outcomes,
}: {
  terpenes: Terpene[];
  correlations: Correlation[];
  outcomes: string[];
}) {
  const [tab, setTab] = useState<Tab>("grid");

  return (
    <>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("grid")}
          className={cn(
            "h-9 px-4 rounded-full text-sm font-medium border transition-all",
            tab === "grid"
              ? "bg-accent text-accent-ink border-accent"
              : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
          )}
        >
          Terpene grid
        </button>
        <button
          onClick={() => setTab("correlation")}
          className={cn(
            "h-9 px-4 rounded-full text-sm font-medium border transition-all",
            tab === "correlation"
              ? "bg-accent text-accent-ink border-accent"
              : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
          )}
        >
          Outcome correlations
        </button>
      </div>

      {tab === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {terpenes.map((t) => (
            <Card key={t.name} tone="raised">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-4xl leading-none">{t.emoji}</span>
                  <span
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full border",
                      t.color
                    )}
                  >
                    {t.name}
                  </span>
                </div>
                <CardTitle className="mt-3">{t.name}</CardTitle>
                <CardDescription>{t.aroma}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                      Avg improvement
                    </p>
                    <p className="font-display text-2xl text-emerald-600 tabular-nums mt-0.5">
                      +{t.avgImprovementPct}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                      Patients
                    </p>
                    <p className="font-display text-2xl text-text tabular-nums mt-0.5">
                      {t.patients}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium mb-2">
                    Associated effects
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.effects.map((e) => (
                      <Badge key={e} tone="accent">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "correlation" && (
        <Card tone="raised">
          <CardHeader>
            <CardTitle>Terpene × outcome correlation</CardTitle>
            <CardDescription>
              Value = % of patients reporting improvement on that outcome while
              on a regimen containing the terpene.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                      Terpene
                    </th>
                    {outcomes.map((o) => (
                      <th
                        key={o}
                        className="px-3 py-3 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle"
                      >
                        {o}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {correlations.map((c) => (
                    <tr key={c.terpene}>
                      <td className="px-6 py-3 font-medium text-text">
                        {c.terpene}
                      </td>
                      {c.values.map((v, i) => (
                        <td key={i} className="px-3 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-14 h-9 rounded text-xs font-semibold tabular-nums",
                              corrColor(v)
                            )}
                          >
                            {v}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center gap-4 text-xs text-text-muted">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Strong (75+)
              <span className="w-3 h-3 rounded bg-emerald-300" /> Moderate (60+)
              <span className="w-3 h-3 rounded bg-amber-200" /> Mild (45+)
              <span className="w-3 h-3 rounded bg-red-200" /> Weak
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

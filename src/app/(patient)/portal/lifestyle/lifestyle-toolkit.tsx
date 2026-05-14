"use client";

// Wellness toolkit checkbox dropdown — EMR-191 + EMR-19
//
// EMR-19 redesign: the colored left-border "ribbon" on each card was
// distracting and clashed with the rest of the wellness hub. It's gone,
// replaced with a single tonal accent (a small dot beside the domain
// icon). The checkboxes now feed a visible wellness score so the
// patient can see their effort move the number — score lives at the
// top of the toolkit, weighted by difficulty (easy=1, moderate=2,
// challenging=3).

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LifestyleDomain, LifestyleTip } from "@/lib/domain/lifestyle";

const STORAGE_KEY = "lj-lifestyle-checked";

const DIFFICULTY_TONE: Record<
  LifestyleTip["difficulty"],
  "success" | "warning" | "danger"
> = {
  easy: "success",
  moderate: "warning",
  challenging: "danger",
};

// EMR-19 — difficulty-weighted scoring. Encourages tackling harder items
// without making easy ones feel pointless.
const DIFFICULTY_WEIGHT: Record<LifestyleTip["difficulty"], number> = {
  easy: 1,
  moderate: 2,
  challenging: 3,
};

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  if (score >= 25) return "text-orange-600";
  return "text-text-subtle";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Thriving";
  if (score >= 75) return "Strong";
  if (score >= 50) return "Steady";
  if (score >= 25) return "Building";
  return "Getting started";
}

interface ToolkitProps {
  domains: LifestyleDomain[];
  tips: Record<string, LifestyleTip[]>;
}

function readChecked(): Record<string, true> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeChecked(state: Record<string, true>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

function tipKey(domainId: string, tipTitle: string): string {
  return `${domainId}::${tipTitle}`;
}

export function LifestyleToolkit({ domains, tips }: ToolkitProps) {
  const [checked, setChecked] = useState<Record<string, true>>({});
  const [openDomain, setOpenDomain] = useState<string | null>(domains[0]?.id ?? null);

  useEffect(() => {
    setChecked(readChecked());
  }, []);

  const total = useMemo(
    () => Object.values(tips).reduce((sum, arr) => sum + arr.length, 0),
    [tips],
  );
  const checkedCount = Object.keys(checked).length;

  // EMR-19 — difficulty-weighted wellness score (0–100). Each tip
  // contributes its weight if checked; we normalize against the total
  // available weight so the score is comparable across patients.
  const wellnessScore = useMemo(() => {
    let earned = 0;
    let possible = 0;
    for (const domain of domains) {
      const domainTips = tips[domain.id] ?? [];
      for (const tip of domainTips) {
        const w = DIFFICULTY_WEIGHT[tip.difficulty];
        possible += w;
        if (checked[tipKey(domain.id, tip.title)]) earned += w;
      }
    }
    if (possible === 0) return 0;
    return Math.round((earned / possible) * 100);
  }, [checked, domains, tips]);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      writeChecked(next);
      return next;
    });
  }

  return (
    <section>
      {/* EMR-19 — wellness score header replaces the ribbon-styled card.
           Score is the load-bearing visual cue; the active count is
           secondary. */}
      <div className="mb-5 rounded-2xl bg-surface border border-border/60 p-5 sm:p-6 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-surface-muted"
            />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 30}
              strokeDashoffset={2 * Math.PI * 30 * (1 - wellnessScore / 100)}
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
              className={`transition-[stroke-dashoffset] duration-500 ${scoreColor(wellnessScore)}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-display text-xl tabular-nums ${scoreColor(wellnessScore)}`}>
              {wellnessScore}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
            Wellness score
          </p>
          <p className="font-display text-xl text-text tracking-tight">
            {scoreLabel(wellnessScore)}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {checkedCount} of {total} active · weighted by difficulty
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl text-text tracking-tight">
          Pick what you are working on
        </h2>
        <Badge tone="neutral">
          {checkedCount}/{total} active
        </Badge>
      </div>

      <div className="space-y-3">
        {domains.map((domain) => {
          const isOpen = openDomain === domain.id;
          const domainTips = tips[domain.id] ?? [];
          const activeInDomain = domainTips.filter(
            (t) => checked[tipKey(domain.id, t.title)],
          ).length;

          return (
            <Card
              key={domain.id}
              tone="raised"
              className="overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenDomain(isOpen ? null : domain.id)}
                aria-expanded={isOpen}
                className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-surface-muted/40 transition-colors"
              >
                {/* EMR-19 — domain color survives as a small dot in place of
                     the old left-border ribbon. */}
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl relative"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${domain.color} 12%, transparent)`,
                  }}
                  aria-hidden="true"
                >
                  {domain.icon}
                  <span
                    className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-surface"
                    style={{ backgroundColor: domain.color }}
                  />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text">{domain.label}</p>
                  <p className="text-xs text-text-subtle mt-0.5 line-clamp-1">
                    {domain.description}
                  </p>
                </div>
                {activeInDomain > 0 && (
                  <Badge tone="accent" className="text-[10px]">
                    {activeInDomain} active
                  </Badge>
                )}
                <span
                  className={`text-text-subtle text-xs transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                  aria-hidden="true"
                >
                  {"▶"}
                </span>
              </button>

              {isOpen && (
                <CardContent className="pt-1 pb-4 border-t border-border/50">
                  <ul className="divide-y divide-border/50">
                    {domainTips.map((tip) => {
                      const key = tipKey(domain.id, tip.title);
                      const on = !!checked[key];
                      return (
                        <li key={tip.title} className="py-3">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggle(key)}
                              className="mt-1 h-4 w-4 rounded border-border-strong text-accent focus:ring-accent/40"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm ${
                                    on
                                      ? "text-text font-medium"
                                      : "text-text"
                                  }`}
                                >
                                  {tip.title}
                                </span>
                                <Badge
                                  tone={DIFFICULTY_TONE[tip.difficulty]}
                                  className="text-[10px]"
                                >
                                  {tip.difficulty}
                                </Badge>
                                {tip.timeCommitment !== "0 min" && (
                                  <span className="text-[11px] text-text-subtle">
                                    {tip.timeCommitment}
                                  </span>
                                )}
                              </span>
                              <span className="block text-sm text-text-muted leading-relaxed mt-1">
                                {tip.body}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

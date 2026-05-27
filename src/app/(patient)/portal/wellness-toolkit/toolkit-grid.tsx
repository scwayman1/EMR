"use client";

// EMR-191 — Wellness toolkit grid (no ribbon)
// Card-based grid of expandable category panels. Each panel has a checkbox
// per tip so the patient can pick what they are working on this week.

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { LifestyleDomain, LifestyleTip } from "@/lib/domain/lifestyle";

const STORAGE_KEY = "lj-wellness-toolkit-v3";

const DIFFICULTY_TONE: Record<
  LifestyleTip["difficulty"],
  "success" | "warning" | "danger"
> = {
  easy: "success",
  moderate: "warning",
  challenging: "danger",
};

interface Props {
  domains: LifestyleDomain[];
  tips: Record<string, LifestyleTip[]>;
}

function tipKey(domainId: string, tipTitle: string): string {
  return `${domainId}::${tipTitle}`;
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
    /* ignore */
  }
}

export function WellnessToolkitGrid({ domains, tips }: Props) {
  const [checked, setChecked] = useState<Record<string, true>>({});
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecked(readChecked());
  }, []);

  const totalTips = useMemo(
    () => Object.values(tips).reduce((s, arr) => s + arr.length, 0),
    [tips],
  );
  const checkedCount = Object.keys(checked).length;

  function toggleTip(key: string) {
    setChecked((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      writeChecked(next);
      return next;
    });
  }

  function toggleDomain(id: string) {
    setOpenDomains((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-sm text-text-muted">
          {checkedCount > 0
            ? `${checkedCount} of ${totalTips} tools selected.`
            : "Pick the categories that fit your week."}
        </p>
        {checkedCount > 0 && (
          <Badge tone="accent" className="text-[11px]">
            {checkedCount} active
          </Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {domains.map((domain) => {
          const domainTips = tips[domain.id] ?? [];
          const checkedHere = domainTips.filter(
            (t) => checked[tipKey(domain.id, t.title)],
          ).length;
          const open = Boolean(openDomains[domain.id]);
          return (
            <Card key={domain.id} tone="raised" className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggleDomain(domain.id)}
                aria-expanded={open}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surface-muted/30 transition-colors"
              >
                <span className="text-2xl shrink-0" aria-hidden="true">
                  {domain.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{domain.label}</p>
                  <p className="text-[11px] text-text-subtle line-clamp-1">
                    {domain.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-text-subtle">
                    {checkedHere}/{domainTips.length}
                  </p>
                  <span
                    className={cn(
                      "text-text-subtle text-xs transition-transform inline-block mt-1",
                      open && "rotate-90",
                    )}
                    aria-hidden="true"
                  >
                    {"▶"}
                  </span>
                </div>
              </button>

              {open && (
                <CardContent className="pt-0 pb-4 border-t border-border/60">
                  <ul className="divide-y divide-border/40 -mx-1">
                    {domainTips.length === 0 && (
                      <li className="text-xs text-text-subtle px-1 py-3">
                        No tips yet for this category.
                      </li>
                    )}
                    {domainTips.map((tip) => {
                      const k = tipKey(domain.id, tip.title);
                      const isChecked = Boolean(checked[k]);
                      return (
                        <li
                          key={tip.title}
                          className="px-1 py-3 flex items-start gap-3"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTip(k)}
                            className="mt-0.5 h-4 w-4 accent-accent shrink-0"
                            aria-label={`Working on ${tip.title}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  isChecked ? "text-accent" : "text-text",
                                )}
                              >
                                {tip.title}
                              </p>
                              <Badge
                                tone={DIFFICULTY_TONE[tip.difficulty]}
                                className="text-[10px] capitalize"
                              >
                                {tip.difficulty}
                              </Badge>
                              <span className="text-[10px] text-text-subtle">
                                · {tip.timeCommitment}
                              </span>
                            </div>
                            <p className="text-xs text-text-muted leading-relaxed mt-1">
                              {tip.body}
                            </p>
                          </div>
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

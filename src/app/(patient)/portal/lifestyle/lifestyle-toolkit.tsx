"use client";

// Wellness toolkit checkbox dropdown — EMR-191
// Replaces the lifestyle-page domain pills with a vertical list of expandable
// cards. Each card has a checkbox row per tip so the patient can mark which
// ones they are working on this week. State is local to the device.

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
              style={
                {
                  borderLeftWidth: "4px",
                  borderLeftColor: domain.color,
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                onClick={() => setOpenDomain(isOpen ? null : domain.id)}
                aria-expanded={isOpen}
                className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-surface-muted/40 transition-colors"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${domain.color} 12%, transparent)`,
                  }}
                  aria-hidden="true"
                >
                  {domain.icon}
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

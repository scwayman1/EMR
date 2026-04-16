"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { FeatureFlag } from "@/lib/domain/overnight-batch";

type Audience = "all" | "beta" | "specific";

interface FlagState extends FeatureFlag {
  audience: Audience;
  lastChangedAt: string;
  lastChangedBy: string;
}

const CATEGORY_LABELS: Record<FeatureFlag["category"], string> = {
  experimental: "Experimental",
  ai: "AI",
  billing: "Billing",
  integrations: "Integrations",
  compliance: "Compliance",
};

const CATEGORY_ORDER: FeatureFlag["category"][] = [
  "ai",
  "integrations",
  "billing",
  "compliance",
  "experimental",
];

export function FlagsView({ initialFlags }: { initialFlags: FeatureFlag[] }) {
  const [flags, setFlags] = useState<FlagState[]>(() =>
    initialFlags.map((f) => ({
      ...f,
      audience: "all" as Audience,
      lastChangedAt: "2026-03-18 14:22",
      lastChangedBy: "scott@leafjourney.com",
    }))
  );

  const grouped = useMemo(() => {
    const out: Record<string, FlagState[]> = {};
    for (const f of flags) {
      if (!out[f.category]) out[f.category] = [];
      out[f.category].push(f);
    }
    return out;
  }, [flags]);

  const toggle = (key: string) => {
    setFlags((prev) =>
      prev.map((f) =>
        f.key === key
          ? {
              ...f,
              enabled: !f.enabled,
              lastChangedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
              lastChangedBy: "you (this session)",
            }
          : f
      )
    );
  };

  const changeAudience = (key: string, audience: Audience) => {
    setFlags((prev) =>
      prev.map((f) =>
        f.key === key
          ? {
              ...f,
              audience,
              lastChangedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
              lastChangedBy: "you (this session)",
            }
          : f
      )
    );
  };

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map((cat) => {
        const list = grouped[cat];
        if (!list || list.length === 0) return null;
        return (
          <section key={cat}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-display text-lg text-text">{CATEGORY_LABELS[cat]}</h2>
              <Badge tone="neutral">{list.length}</Badge>
              {cat === "experimental" && (
                <Badge tone="warning">Unsupported — subject to change</Badge>
              )}
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="divide-y divide-border">
                  {list.map((flag) => (
                    <div key={flag.key} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text">
                              {flag.label}
                            </span>
                            <code className="text-[11px] font-mono text-text-subtle">
                              {flag.key}
                            </code>
                            {flag.category === "experimental" && (
                              <Badge tone="warning">experimental</Badge>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">
                            {flag.description}
                          </p>
                          <div className="text-[11px] text-text-subtle mt-1.5">
                            Last changed {flag.lastChangedAt} · by {flag.lastChangedBy}
                          </div>
                        </div>
                        <Toggle
                          checked={flag.enabled}
                          onChange={() => toggle(flag.key)}
                        />
                      </div>

                      {flag.enabled && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-text-muted">Applied to:</span>
                          {(["all", "beta", "specific"] as Audience[]).map((a) => (
                            <button
                              key={a}
                              onClick={() => changeAudience(flag.key, a)}
                              className={cn(
                                "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                                flag.audience === a
                                  ? "bg-accent text-accent-ink border-accent"
                                  : "bg-surface border-border text-text-muted hover:text-text"
                              )}
                            >
                              {a === "all"
                                ? "All orgs"
                                : a === "beta"
                                ? "Beta orgs"
                                : "Specific users"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        );
      })}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative h-6 w-10 rounded-full transition-colors shrink-0 mt-1",
        checked ? "bg-accent" : "bg-border-strong/60"
      )}
      aria-pressed={checked}
    >
      <div
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

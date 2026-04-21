"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ModelConfigPanel } from "./model-config";
import { AgentFleetPanel } from "./agent-fleet";

type Tab = "default" | "fleet";

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: "default", label: "Practice default", hint: "One model that powers every agent unless overridden." },
  { key: "fleet", label: "Agent fleet", hint: "Per-agent model overrides, enable / disable, fleet cost." },
];

export function AiConfigTabs() {
  const [tab, setTab] = useState<Tab>("default");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-border mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              tab === t.key ? "text-accent" : "text-text-muted hover:text-text",
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent rounded-full" />
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-text-subtle mb-5">{active.hint}</p>
      {tab === "default" && <ModelConfigPanel />}
      {tab === "fleet" && <AgentFleetPanel />}
    </div>
  );
}

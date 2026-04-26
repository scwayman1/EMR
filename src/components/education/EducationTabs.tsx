"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { Users, Atom, Sparkles, BookOpen } from "lucide-react";

export type TabKey = "community" | "wheel" | "chatcb" | "research";

export const EDUCATION_TABS: { key: TabKey; label: string; Icon: React.ElementType }[] = [
  { key: "community", label: "Community", Icon: Users },
  { key: "wheel", label: "Cannabis Wheel", Icon: Atom },
  { key: "chatcb", label: "ChatCB", Icon: Sparkles },
  { key: "research", label: "Research", Icon: BookOpen },
];

export const tabId = (key: TabKey) => `edu-tab-${key}`;
export const panelId = (key: TabKey) => `edu-panel-${key}`;

export function EducationTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}) {
  const buttonRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    community: null,
    wheel: null,
    chatcb: null,
    research: null,
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const idx = EDUCATION_TABS.findIndex((t) => t.key === activeTab);
    let nextIdx = idx;
    switch (e.key) {
      case "ArrowRight":
        nextIdx = (idx + 1) % EDUCATION_TABS.length;
        break;
      case "ArrowLeft":
        nextIdx = (idx - 1 + EDUCATION_TABS.length) % EDUCATION_TABS.length;
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = EDUCATION_TABS.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const nextKey = EDUCATION_TABS[nextIdx].key;
    onTabChange(nextKey);
    buttonRefs.current[nextKey]?.focus();
  };

  return (
    <div
      className={cn(
        "sticky top-16 z-20 border-b border-border/60",
        "backdrop-blur-xl backdrop-saturate-150 bg-bg/70",
        "shadow-[0_1px_0_0_rgba(28,26,21,0.04)]"
      )}
    >
      <div className="max-w-[1320px] mx-auto px-6 lg:px-12">
        <div
          role="tablist"
          aria-label="Education sections"
          className="flex items-center gap-2 overflow-x-auto py-4 -mb-px scrollbar-thin"
        >
          {EDUCATION_TABS.map((tab) => {
            const Icon = tab.Icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                ref={(el) => {
                  buttonRefs.current[tab.key] = el;
                }}
                id={tabId(tab.key)}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={panelId(tab.key)}
                tabIndex={active ? 0 : -1}
                onClick={() => onTabChange(tab.key)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-full whitespace-nowrap border",
                  "transition-all duration-300 ease-smooth",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  active
                    ? "bg-accent text-white border-accent shadow-md scale-105"
                    : "bg-white/50 text-text-muted border-border hover:text-text hover:border-accent/40 hover:bg-white"
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

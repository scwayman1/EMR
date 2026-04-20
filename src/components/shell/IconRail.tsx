"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  getSectionBadge,
  pillarId,
  sectionContainsPath,
  type NavSection,
} from "./nav-sections";

export interface IconRailProps {
  sections: NavSection[];
  /** Currently focused pillar id (drawer open). May be null if nothing open. */
  activePillar: string | null;
  /** Pillar id matching the current pathname (if any) — gets an accent bar. */
  pathPillar: string | null;
  /** Toggle a pillar. Same id → closes; different id → opens. */
  onSelect: (id: string) => void;
  pathname: string;
}

/**
 * 64px vertical strip. One button per pillar. Clicking a button focuses its
 * drawer via the parent shell. Route-active pillar gets a left accent bar,
 * drawer-focused pillar gets a subtle surface wash — the two states can
 * coexist (you can have Approvals open but be looking at Today).
 *
 * A `data-pulse` hook is reserved on each button for Agent K's live-signal
 * pass (e.g., critical denial count pulsing the Billing icon).
 */
export function IconRail({
  sections,
  activePillar,
  pathPillar,
  onSelect,
  pathname,
}: IconRailProps) {
  return (
    <ul className="flex flex-col gap-1 px-2 py-3">
      {sections.map((section, idx) => {
        const Icon = section.icon;
        if (!Icon) return null;
        const id = pillarId(section, idx);
        const badge = getSectionBadge(section);
        const isFocused = activePillar === id;
        const isOnPath = pathPillar === id || sectionContainsPath(section, pathname);
        const label = section.label ?? id;
        const pulse =
          badge && (badge.severity === "critical" || badge.severity === "warn");
        return (
          <li key={id}>
            <button
              type="button"
              aria-label={label}
              aria-pressed={isFocused}
              data-pulse={pulse ? "true" : undefined}
              onClick={() => onSelect(id)}
              className={cn(
                "group relative flex h-12 w-12 items-center justify-center rounded-xl",
                "text-text-muted transition-colors duration-200 ease-smooth",
                "hover:bg-surface-muted hover:text-text",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                isFocused && "bg-surface-muted text-text",
                !isFocused && isOnPath && "text-text",
              )}
            >
              {/* Left accent bar: signals route-active pillar. */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-accent",
                  "transition-opacity duration-200",
                  isOnPath ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon width={22} height={22} />
              {/* Badge dot — matches NavSections severity palette. */}
              {badge && badge.severity !== "ok" && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-surface",
                    badge.severity === "critical" && "bg-red-600",
                    badge.severity === "warn" && "bg-amber-500",
                    badge.severity === "info" && "bg-accent",
                  )}
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

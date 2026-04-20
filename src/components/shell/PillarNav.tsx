"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { IconRail } from "./IconRail";
import { ContextDrawer } from "./ContextDrawer";
import { pillarId, sectionContainsPath, type NavSection } from "./nav-sections";

const LAST_PILLAR_KEY = "nav:lastPillar:v1";

export interface PillarNavProps {
  sections: NavSection[];
  /** Slotted content above the rail icons — typically a logo link. */
  header?: React.ReactNode;
  /** Slotted content below the rail icons — typically account controls. */
  footer?: React.ReactNode;
}

/**
 * Client wrapper that owns the "which drawer is open" state for the icon
 * rail layout. Server-rendered `AppShell` delegates the interactive bits
 * here so it can stay a server component.
 *
 * Layout: a 64px rail column (header slot, icons, footer slot) plus a
 * 240px drawer that slides in when a pillar is focused. Both live inside
 * a single `data-nav-rail` wrapper so `ContextDrawer` can distinguish
 * rail clicks from true outside clicks.
 *
 * Behavior:
 *   - On mount, restore last-opened pillar from localStorage (if still
 *     present in `sections`).
 *   - If the current pathname lives inside a pillar, that wins on first
 *     render — user sees their current context, not a stale one.
 *   - Clicking a rail icon toggles its drawer. Same id → close. Different
 *     id → switch.
 */
export function PillarNav({ sections, header, footer }: PillarNavProps) {
  const pathname = usePathname() ?? "";

  const pathPillar = React.useMemo(() => {
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.icon) continue;
      if (sectionContainsPath(s, pathname)) return pillarId(s, i);
    }
    return null;
  }, [sections, pathname]);

  const [activePillar, setActivePillar] = React.useState<string | null>(
    pathPillar,
  );

  // Hydrate from localStorage once per route change; route context wins.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathPillar) {
      setActivePillar(pathPillar);
      return;
    }
    try {
      const stored = window.localStorage.getItem(LAST_PILLAR_KEY);
      if (!stored) return;
      const exists = sections.some(
        (s, i) => s.icon && pillarId(s, i) === stored,
      );
      if (exists) setActivePillar(stored);
    } catch {
      /* private mode — non-fatal */
    }
  }, [pathPillar, sections]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (activePillar) {
        window.localStorage.setItem(LAST_PILLAR_KEY, activePillar);
      }
    } catch {
      /* non-fatal */
    }
  }, [activePillar]);

  const onSelect = (id: string) => {
    setActivePillar((prev) => (prev === id ? null : id));
  };

  const activeSection = React.useMemo(() => {
    if (!activePillar) return null;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.icon) continue;
      if (pillarId(s, i) === activePillar) return s;
    }
    return null;
  }, [sections, activePillar]);

  return (
    <div className="flex" data-nav-rail>
      <aside className="flex w-16 shrink-0 flex-col items-center border-r border-border bg-surface">
        {header}
        <div className="flex-1 w-full">
          <IconRail
            sections={sections}
            activePillar={activePillar}
            pathPillar={pathPillar}
            onSelect={onSelect}
            pathname={pathname}
          />
        </div>
        {footer}
      </aside>
      <ContextDrawer
        section={activeSection}
        pathname={pathname}
        onClose={() => setActivePillar(null)}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { key: "demographics", label: "Demographics", dot: "bg-[color:var(--info)]" },
  { key: "memory", label: "Memory", dot: "bg-accent" },
  { key: "records", label: "Records", dot: "bg-accent" },
  { key: "images", label: "Images", dot: "bg-[color:var(--info)]" },
  { key: "labs", label: "Labs", dot: "bg-[color:var(--success)]" },
  { key: "notes", label: "Notes", dot: "bg-[color:var(--highlight)]" },
  { key: "correspondence", label: "Correspondence", dot: "bg-[color:var(--info)]" },
  { key: "rx", label: "Cannabis Rx", dot: "bg-[color:var(--highlight)]" },
  { key: "billing", label: "Billing", dot: "bg-[color:var(--success)]" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

/** A single "last N entries" row inside a tab's hover-peek popover. */
export interface PeekEntry {
  id: string;
  /** Primary label — usually the item's title or filename. */
  title: string;
  /** Secondary line — relative date, status, tag, whatever reads well. */
  meta?: string;
  /** Where clicking the row deep-links to (typically a sub-route). */
  href: string;
}

/** Peek data per tab. Only tabs present here show a peek popover. */
export type TabPeeks = Partial<Record<TabKey, PeekEntry[]>>;

interface ChartTabsProps {
  patientId: string;
  counts: Record<TabKey, number>;
  peeks?: TabPeeks;
}

export function ChartTabs({ patientId, counts, peeks }: ChartTabsProps) {
  const searchParams = useSearchParams();
  const active = (searchParams.get("tab") as TabKey) || "records";

  // Which tab's peek popover is open right now. At most one open at a time.
  const [openKey, setOpenKey] = React.useState<TabKey | null>(null);
  // A small close delay keeps the popover open while the cursor slides
  // from the tab onto the popover itself. Without this, the popover
  // flickers shut as soon as you exit the tab's hit area.
  const closeTimer = React.useRef<number | null>(null);

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenKey(null), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  React.useEffect(() => () => cancelClose(), []);

  return (
    <nav
      className="relative flex flex-wrap items-center gap-1 border-b border-border mb-8"
      aria-label="Chart sections"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const count = counts[tab.key];
        const entries = peeks?.[tab.key];
        const hasPeek = entries !== undefined;
        const isOpen = openKey === tab.key;

        return (
          <div
            key={tab.key}
            className="relative"
            onMouseEnter={() => {
              cancelClose();
              if (hasPeek) setOpenKey(tab.key);
            }}
            onMouseLeave={scheduleClose}
            onFocus={() => {
              cancelClose();
              if (hasPeek) setOpenKey(tab.key);
            }}
            onBlur={scheduleClose}
          >
            <Link
              href={`/clinic/patients/${patientId}?tab=${tab.key}`}
              scroll={false}
              aria-haspopup={hasPeek ? "true" : undefined}
              aria-expanded={hasPeek ? isOpen : undefined}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-t-md whitespace-nowrap",
                isActive
                  ? "text-accent"
                  : "text-text-muted hover:text-text hover:bg-surface-muted"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  isActive ? tab.dot : "bg-border-strong/50"
                )}
              />
              {tab.label}
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-medium rounded-full tabular-nums",
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "bg-surface-muted text-text-subtle"
                )}
              >
                {count}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </Link>

            {hasPeek && isOpen && (
              <TabPeekPopover
                label={tab.label}
                entries={entries}
                seeAllHref={`/clinic/patients/${patientId}?tab=${tab.key}`}
                onLeave={scheduleClose}
                onEnter={cancelClose}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Hover-peek popover. Anchored beneath its tab, shows the last five
 * entries from that section plus a "See all" link. Keeps the popover
 * open while the cursor is inside it via the onEnter/onLeave hooks
 * (the parent tab container handles open/close timing).
 */
function TabPeekPopover({
  label,
  entries,
  seeAllHref,
  onEnter,
  onLeave,
}: {
  label: string;
  entries: PeekEntry[];
  seeAllHref: string;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      role="menu"
      aria-label={`${label} recent`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        "absolute left-0 top-full mt-1 z-30 w-80 max-w-[calc(100vw-2rem)]",
        "rounded-lg border border-border bg-surface shadow-lg"
      )}
    >
      <div className="px-4 pt-3 pb-2 border-b border-border/60">
        <p className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">
          Recent · {label}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-5 text-sm text-text-muted italic text-center">
          Nothing yet.
        </p>
      ) : (
        <ul className="py-1">
          {entries.slice(0, 5).map((e) => (
            <li key={e.id}>
              <Link
                href={e.href}
                role="menuitem"
                className="block px-4 py-2 text-sm hover:bg-surface-muted transition-colors"
              >
                <p className="font-medium text-text truncate">{e.title}</p>
                {e.meta && (
                  <p className="text-[11px] text-text-subtle mt-0.5 truncate">
                    {e.meta}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="px-4 py-2 border-t border-border/60">
        <Link
          href={seeAllHref}
          className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
        >
          See all in {label} →
        </Link>
      </div>
    </div>
  );
}

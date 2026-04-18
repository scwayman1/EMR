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

const TAB_BY_KEY = new Map<TabKey, (typeof TABS)[number]>(
  TABS.map((t) => [t.key, t])
);
const DEFAULT_ORDER: TabKey[] = TABS.map((t) => t.key);
const STORAGE_KEY = "chart-tabs:order:v1";

/**
 * Reconcile a stored order array against the canonical TABS list.
 * Drops stale keys (tab removed), appends any new keys (tab added) at
 * the end so the physician doesn't silently lose access to a section
 * just because their saved order predates the schema.
 */
function reconcileOrder(stored: unknown): TabKey[] {
  if (!Array.isArray(stored)) return DEFAULT_ORDER;
  const seen = new Set<TabKey>();
  const valid: TabKey[] = [];
  for (const k of stored) {
    if (typeof k === "string" && TAB_BY_KEY.has(k as TabKey) && !seen.has(k as TabKey)) {
      valid.push(k as TabKey);
      seen.add(k as TabKey);
    }
  }
  for (const k of DEFAULT_ORDER) {
    if (!seen.has(k)) valid.push(k);
  }
  return valid;
}

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

  // Tab order. Seeded with the canonical order so SSR output matches
  // the server render; hydrated from localStorage in an effect so the
  // personalized order takes effect on the first paint after mount.
  const [order, setOrder] = React.useState<TabKey[]>(DEFAULT_ORDER);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setOrder(reconcileOrder(JSON.parse(raw)));
    } catch {
      // Corrupt JSON or blocked storage — silently fall back to the default.
    }
    setHydrated(true);
  }, []);

  const persistOrder = React.useCallback((next: TabKey[]) => {
    setOrder(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Safari private mode or quota exhausted — order stays in memory only.
    }
  }, []);

  const resetOrder = React.useCallback(() => {
    setOrder(DEFAULT_ORDER);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Drag state — source tab plus which tab + edge the cursor is over,
  // so the insertion indicator can render on the right side of the
  // drop target. Without the "side" bit we can only insert *before*
  // the hovered tab, making the end-of-list slot unreachable in a
  // single drag (Codex review on PR #18, P2).
  const [draggingKey, setDraggingKey] = React.useState<TabKey | null>(null);
  const [dragOverKey, setDragOverKey] = React.useState<TabKey | null>(null);
  const [dropSide, setDropSide] = React.useState<"before" | "after">("before");

  // Hover-peek state. At most one open at a time.
  const [openKey, setOpenKey] = React.useState<TabKey | null>(null);
  // A small close delay keeps the popover open while the cursor slides
  // from the tab onto the popover itself.
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

  const handleDragStart = (key: TabKey) => (e: React.DragEvent) => {
    setDraggingKey(key);
    setOpenKey(null); // peek would obscure the drop zones
    cancelClose();
    // Firefox requires dataTransfer to have data set for drag to initiate.
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (key: TabKey) => (e: React.DragEvent) => {
    if (!draggingKey) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Which half of the target the cursor is over decides whether we
    // insert before or after it. This is what makes the end-of-list
    // slot reachable — drop on the right half of the rightmost tab
    // and the dragged tab lands after it.
    const rect = e.currentTarget.getBoundingClientRect();
    const side: "before" | "after" =
      e.clientX < rect.left + rect.width / 2 ? "before" : "after";
    if (dragOverKey !== key) setDragOverKey(key);
    if (dropSide !== side) setDropSide(side);
  };

  const handleDragLeave = (key: TabKey) => () => {
    if (dragOverKey === key) setDragOverKey(null);
  };

  const handleDrop = (targetKey: TabKey) => (e: React.DragEvent) => {
    e.preventDefault();
    const source = draggingKey;
    const side = dropSide;
    setDraggingKey(null);
    setDragOverKey(null);
    if (!source || source === targetKey) return;
    const without = order.filter((k) => k !== source);
    const targetIdx = without.indexOf(targetKey);
    if (targetIdx < 0) return;
    const insertAt = side === "before" ? targetIdx : targetIdx + 1;
    const next = [
      ...without.slice(0, insertAt),
      source,
      ...without.slice(insertAt),
    ];
    persistOrder(next);
  };

  const handleDragEnd = () => {
    setDraggingKey(null);
    setDragOverKey(null);
  };

  const isReordered =
    hydrated && order.some((k, i) => k !== DEFAULT_ORDER[i]);

  return (
    <nav
      className="relative flex flex-wrap items-center gap-1 border-b border-border mb-8"
      aria-label="Chart sections"
    >
      {order.map((key) => {
        const tab = TAB_BY_KEY.get(key);
        if (!tab) return null;
        const isActive = active === tab.key;
        const count = counts[tab.key];
        const entries = peeks?.[tab.key];
        const hasPeek = entries !== undefined;
        const isOpen = openKey === tab.key && !draggingKey;
        const isDragging = draggingKey === tab.key;
        const isDropTarget = dragOverKey === tab.key && draggingKey !== tab.key;

        return (
          <div
            key={tab.key}
            draggable
            onDragStart={handleDragStart(tab.key)}
            onDragOver={handleDragOver(tab.key)}
            onDragLeave={handleDragLeave(tab.key)}
            onDrop={handleDrop(tab.key)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative group/tab transition-opacity",
              isDragging && "opacity-40"
            )}
            onMouseEnter={() => {
              if (draggingKey) return;
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
            {isDropTarget && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-2 bottom-2 w-0.5 rounded-full bg-accent",
                  dropSide === "before" ? "-left-0.5" : "-right-0.5"
                )}
              />
            )}
            <Link
              href={`/clinic/patients/${patientId}?tab=${tab.key}`}
              scroll={false}
              draggable={false}
              aria-haspopup={hasPeek ? "true" : undefined}
              aria-expanded={hasPeek ? isOpen : undefined}
              className={cn(
                "relative flex items-center gap-2 pl-3 pr-4 py-2.5 text-sm font-medium transition-colors rounded-t-md whitespace-nowrap cursor-grab active:cursor-grabbing",
                isActive
                  ? "text-accent"
                  : "text-text-muted hover:text-text hover:bg-surface-muted"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "text-text-subtle/40 leading-none text-[10px] tracking-tighter select-none transition-opacity",
                  "opacity-0 group-hover/tab:opacity-100"
                )}
                title="Drag to reorder"
              >
                ⋮⋮
              </span>
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

      {isReordered && (
        <button
          type="button"
          onClick={resetOrder}
          className="ml-auto mr-2 text-[11px] text-text-subtle hover:text-accent transition-colors"
          title="Restore the default tab order"
        >
          Reset order
        </button>
      )}
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

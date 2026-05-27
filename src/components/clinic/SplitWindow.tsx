"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * EMR-028: Split Window / Multi-Tab View.
 *
 * Generic 1- to 3-pane container. Each pane wraps a route (rendered as
 * an iframe so any internal page can be loaded without rebuilding it as
 * an embeddable component). Column widths are user-resizable via drag
 * handles between panes; widths persist in localStorage per pane count.
 *
 * Why iframes over portals/embeds: every clinic page already runs as a
 * full Next.js route with its own data-fetching, auth gate, and shell.
 * Wrapping them as embeddable components would require re-architecting
 * every chart, message, and lab tool. iframes give "open this view in
 * a side panel" with zero per-page changes.
 *
 * The shell of each iframe is hidden via a `?embed=1` query param the
 * AppShell respects (and falls back gracefully if it doesn't yet).
 */

export interface SplitPane {
  /** Internal app route, e.g. "/clinic/patients/abc?tab=labs". */
  url: string;
  /** Display label in the pane header. Defaults to the URL pathname. */
  label?: string;
}

interface SplitWindowProps {
  panes: SplitPane[];
  onPanesChange: (next: SplitPane[]) => void;
  /** Optional list of suggested routes to populate the "Add" picker. */
  suggestions?: { label: string; url: string }[];
}

const STORAGE_KEY = "split-window:widths:v1";

function readStoredWidths(): Record<number, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredWidths(map: Record<number, number[]>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // private mode / quota — keep state in memory only
  }
}

function defaultWidths(count: number): number[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, () => 100 / count);
}

function appendEmbedParam(url: string): string {
  // Tag the iframe URL so embedded pages can hide their outer shell
  // when present. Pages that don't recognize the param render normally.
  try {
    const u = new URL(url, "http://localhost");
    u.searchParams.set("embed", "1");
    return u.pathname + (u.search ? u.search : "") + (u.hash ?? "");
  } catch {
    return url + (url.includes("?") ? "&" : "?") + "embed=1";
  }
}

function labelFor(pane: SplitPane): string {
  if (pane.label) return pane.label;
  try {
    const u = new URL(pane.url, "http://localhost");
    return u.pathname.replace(/^\//, "") || "/";
  } catch {
    return pane.url;
  }
}

export function SplitWindow({ panes, onPanesChange, suggestions }: SplitWindowProps) {
  const count = Math.min(panes.length, 3);
  const [widths, setWidths] = React.useState<number[]>(() => defaultWidths(count));
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const dragState = React.useRef<null | {
    index: number;
    startX: number;
    startWidths: number[];
    containerWidth: number;
  }>(null);

  // Load persisted widths for this pane count once on mount.
  React.useEffect(() => {
    const stored = readStoredWidths();
    const forCount = stored[count];
    if (
      Array.isArray(forCount) &&
      forCount.length === count &&
      forCount.every((w) => typeof w === "number" && w > 5)
    ) {
      setWidths(forCount);
    } else {
      setWidths(defaultWidths(count));
    }
  }, [count]);

  const persistWidths = React.useCallback(
    (next: number[]) => {
      setWidths(next);
      const stored = readStoredWidths();
      stored[count] = next;
      writeStoredWidths(stored);
    },
    [count]
  );

  // Resize: drag a divider to redistribute width between left+right
  // neighbors. Keeps each pane >= 12% so a pane never collapses to
  // unusable, and prevents accidental "I lost the third pane" moments.
  const handlePointerDown = (index: number) => (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = {
      index,
      startX: e.clientX,
      startWidths: [...widths],
      containerWidth: containerRef.current.getBoundingClientRect().width,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const deltaPct = (dx / drag.containerWidth) * 100;
    const left = drag.startWidths[drag.index] + deltaPct;
    const right = drag.startWidths[drag.index + 1] - deltaPct;
    if (left < 12 || right < 12) return;
    const next = [...drag.startWidths];
    next[drag.index] = left;
    next[drag.index + 1] = right;
    setWidths(next);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    dragState.current = null;
    persistWidths(widths);
  };

  const closePane = (index: number) => {
    const next = panes.filter((_, i) => i !== index);
    onPanesChange(next);
  };

  const addPane = (url: string) => {
    if (panes.length >= 3) return;
    onPanesChange([...panes, { url }]);
  };

  if (count === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong/60 bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">
          No panes open. Add a workspace to start.
        </p>
        {suggestions && suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s.url}
                type="button"
                onClick={() => addPane(s.url)}
                className="text-xs text-accent hover:text-accent-hover px-3 py-1.5 rounded-full border border-accent/30 hover:bg-accent-soft transition-colors"
              >
                + {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-12rem)] min-h-[480px] flex rounded-xl border border-border bg-surface overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {panes.slice(0, 3).map((pane, i) => (
        <React.Fragment key={`${i}-${pane.url}`}>
          <section
            className="flex flex-col min-w-0 border-r border-border last:border-r-0"
            style={{ width: `${widths[i] ?? 100 / count}%` }}
            aria-label={`Pane ${i + 1}: ${labelFor(pane)}`}
          >
            <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface-muted/40 shrink-0">
              <span className="text-xs font-medium text-text-muted truncate">
                {labelFor(pane)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={pane.url}
                  target="_blank"
                  rel="noopener"
                  className="text-[10px] uppercase tracking-wider text-text-subtle hover:text-text px-2 py-1 rounded transition-colors"
                  title="Open in a new tab"
                >
                  Pop out
                </a>
                {panes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => closePane(i)}
                    aria-label={`Close pane ${i + 1}`}
                    className="text-text-subtle hover:text-danger w-6 h-6 inline-flex items-center justify-center rounded transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            </header>
            <iframe
              src={appendEmbedParam(pane.url)}
              title={labelFor(pane)}
              className="flex-1 w-full bg-bg"
              loading="lazy"
            />
          </section>
          {i < count - 1 && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={`Resize between pane ${i + 1} and pane ${i + 2}`}
              tabIndex={0}
              onPointerDown={handlePointerDown(i)}
              className={cn(
                "relative w-1 shrink-0 cursor-col-resize select-none",
                "bg-border hover:bg-accent/40 transition-colors",
                "after:content-[''] after:absolute after:inset-y-0 after:-left-1 after:-right-1"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

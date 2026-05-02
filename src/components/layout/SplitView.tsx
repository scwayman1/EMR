"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * SplitView — EMR-028
 *
 * Multi-pane window layout for clinicians who want to keep two or three
 * surfaces visible side-by-side (chart + dose log + messages, etc.) without
 * juggling browser tabs. The component is purely a layout primitive: it
 * renders 1–3 panes with draggable dividers and persists the user's split
 * ratio + pane mix in localStorage so the workspace survives a reload.
 *
 * Each pane carries an `id` plus an arbitrary ReactNode body. Callers are
 * expected to compose pane content from existing routes via iframes, slot
 * components, or async server components rendered inside the client tree.
 */

export type SplitDirection = "horizontal" | "vertical";

export interface SplitPane {
  /** Stable id used as React key + persistence slot. */
  id: string;
  /** Title shown in the pane header — typically the route the pane mirrors. */
  title: string;
  /** Pane body. */
  content: React.ReactNode;
  /** Optional close handler; omit to make the pane permanent. */
  onClose?: () => void;
}

export interface SplitViewProps {
  panes: SplitPane[];
  direction?: SplitDirection;
  /**
   * Persistence key for the divider ratios. Two panes store one number,
   * three panes store two — both as comma-joined floats summing to 1.
   */
  storageKey?: string;
  className?: string;
}

const MIN_PANE_FRACTION = 0.12; // never let a pane shrink below ~12% of total
const MAX_PANES = 3;

function clampRatios(ratios: number[]): number[] {
  if (ratios.length === 0) return ratios;
  const min = MIN_PANE_FRACTION;
  const max = 1 - min * (ratios.length - 1);
  const clamped = ratios.map((r) => Math.min(Math.max(r, min), max));
  const sum = clamped.reduce((a, b) => a + b, 0);
  return clamped.map((r) => r / sum);
}

function defaultRatios(count: number): number[] {
  return Array.from({ length: count }, () => 1 / count);
}

function readPersistedRatios(
  key: string,
  count: number,
): number[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = raw.split(",").map((s) => Number(s));
    if (parsed.length !== count) return null;
    if (parsed.some((n) => !Number.isFinite(n) || n <= 0)) return null;
    return clampRatios(parsed);
  } catch {
    return null;
  }
}

function persistRatios(key: string, ratios: number[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, ratios.join(","));
  } catch {
    /* private mode / quota — non-fatal */
  }
}

export function SplitView({
  panes,
  direction = "horizontal",
  storageKey = "split-view:ratios:v1",
  className,
}: SplitViewProps) {
  const count = Math.min(panes.length, MAX_PANES);
  const visible = panes.slice(0, count);
  const isHorizontal = direction === "horizontal";

  const persistKey = `${storageKey}:${count}:${direction}`;

  const [ratios, setRatios] = React.useState<number[]>(() =>
    defaultRatios(count),
  );
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const persisted = readPersistedRatios(persistKey, count);
    setRatios(persisted ?? defaultRatios(count));
  }, [persistKey, count]);

  const startDrag = (dividerIdx: number) => (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const total = isHorizontal ? rect.width : rect.height;
    const startCoord = isHorizontal ? rect.left : rect.top;
    const initialRatios = [...ratios];

    const handleMove = (move: PointerEvent) => {
      const pos = (isHorizontal ? move.clientX : move.clientY) - startCoord;
      const fraction = Math.min(Math.max(pos / total, 0), 1);
      // Sum of ratios up to and including the divider's left/top pane
      // must equal `fraction`. Distribute the delta only between the two
      // panes adjacent to the divider so other panes stay put.
      const next = [...initialRatios];
      const before = next.slice(0, dividerIdx).reduce((a, b) => a + b, 0);
      const pair = next[dividerIdx] + next[dividerIdx + 1];
      const newLeft = Math.min(
        Math.max(fraction - before, MIN_PANE_FRACTION),
        pair - MIN_PANE_FRACTION,
      );
      next[dividerIdx] = newLeft;
      next[dividerIdx + 1] = pair - newLeft;
      setRatios(clampRatios(next));
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setRatios((current) => {
        persistRatios(persistKey, current);
        return current;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  if (count === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full w-full bg-bg",
        isHorizontal ? "flex flex-row" : "flex flex-col",
        className,
      )}
      role="group"
      aria-label="Split workspace"
    >
      {visible.map((pane, i) => {
        const ratio = ratios[i] ?? 1 / count;
        const isLast = i === count - 1;
        return (
          <React.Fragment key={pane.id}>
            <section
              className={cn(
                "min-w-0 min-h-0 flex flex-col bg-surface border-border",
                isHorizontal ? "border-r" : "border-b",
                isLast && (isHorizontal ? "border-r-0" : "border-b-0"),
              )}
              style={{ flexBasis: `${ratio * 100}%`, flexGrow: 0, flexShrink: 1 }}
              aria-label={pane.title}
            >
              <header className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-surface-muted/40">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle truncate">
                  {pane.title}
                </span>
                {pane.onClose && (
                  <button
                    type="button"
                    onClick={pane.onClose}
                    aria-label={`Close ${pane.title}`}
                    className="text-text-subtle hover:text-text text-base leading-none px-1"
                  >
                    ×
                  </button>
                )}
              </header>
              <div className="flex-1 min-h-0 min-w-0 overflow-auto">
                {pane.content}
              </div>
            </section>
            {!isLast && (
              <div
                role="separator"
                aria-orientation={isHorizontal ? "vertical" : "horizontal"}
                aria-label={`Resize divider ${i + 1}`}
                tabIndex={0}
                onPointerDown={startDrag(i)}
                className={cn(
                  "shrink-0 bg-border hover:bg-accent/40 transition-colors",
                  isHorizontal
                    ? "w-1 cursor-col-resize"
                    : "h-1 cursor-row-resize",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * useSplitPanes — small controller hook for hosts that want to manage the
 * pane stack reactively (open/close, swap order). The host renders
 * <SplitView panes={panes} /> off the returned `panes` array.
 */
export function useSplitPanes(initial: SplitPane[] = []) {
  const [panes, setPanes] = React.useState<SplitPane[]>(initial.slice(0, MAX_PANES));

  const open = React.useCallback((pane: SplitPane) => {
    setPanes((prev) => {
      if (prev.some((p) => p.id === pane.id)) return prev;
      const next = [...prev, pane];
      return next.slice(0, MAX_PANES);
    });
  }, []);

  const close = React.useCallback((id: string) => {
    setPanes((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const replace = React.useCallback((id: string, pane: SplitPane) => {
    setPanes((prev) => prev.map((p) => (p.id === id ? pane : p)));
  }, []);

  return { panes, open, close, replace };
}

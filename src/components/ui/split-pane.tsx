"use client";

/**
 * SplitPane — pure-React resizable split layout primitive.
 *
 * Goals (Apple-iOS Mail-tier polish):
 *  - Hairline divider by default; thickens to a 4px hit-target on hover.
 *  - Smooth pointer-driven drag, cursor flips to col-resize / row-resize.
 *  - Double-click divider resets to `defaultSize`.
 *  - Keyboard support: when the divider has focus, ← / → (or ↑ / ↓) nudges
 *    by 16px; Home resets to default; Enter / Space toggles collapse.
 *  - Optional persistence via localStorage when `storageKey` is provided.
 *  - Min / max constraints; dragging past min collapses that pane and shows
 *    a "show again" button on the divider edge.
 *
 * Sizes are stored as pixel widths/heights of the FIRST pane (left/top).
 * The second pane fills the remainder via flex-1, so the primitive plays
 * well with parents that don't have a fixed dimension.
 *
 * No new dependencies — only React + the existing `cn` util.
 */

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils/cn";

const NUDGE_PX = 16;

export type SplitPaneProps = {
  /** Layout direction. `horizontal` = side-by-side (vertical divider). */
  orientation?: "horizontal" | "vertical";
  /** Initial size of the first pane (px). Default 320. */
  defaultSize?: number;
  /** Minimum size for the first pane in px. Default 180. */
  minSize?: number;
  /** Maximum size for the first pane in px. Default Infinity. */
  maxSize?: number;
  /** Per-key persistence in localStorage. */
  storageKey?: string;
  /** Allow dragging past min-size to collapse the first pane. Default true. */
  collapsible?: boolean;
  /** [left/top, right/bottom] children. */
  children: [ReactNode, ReactNode];
  /** Class applied to the outer container. */
  className?: string;
  /** Accessible label for the divider. */
  ariaLabel?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readStored(key: string | undefined): number | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`lj-split-pane:${key}`);
    if (!raw) return null;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(key: string | undefined, value: number): void {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`lj-split-pane:${key}`, String(value));
  } catch {
    /* swallow — quota / privacy mode */
  }
}

export function SplitPane({
  orientation = "horizontal",
  defaultSize = 320,
  minSize = 180,
  maxSize = Number.POSITIVE_INFINITY,
  storageKey,
  collapsible = true,
  children,
  className,
  ariaLabel,
}: SplitPaneProps) {
  const isHorizontal = orientation === "horizontal";
  const [first, second] = children;

  // Lazily hydrate from storage. Start with `defaultSize` for SSR parity,
  // then hydrate on mount to avoid hydration mismatches.
  const [size, setSize] = useState<number>(defaultSize);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [dragging, setDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const secondPaneId = useId();

  // Hydrate from storage post-mount.
  useEffect(() => {
    const stored = readStored(storageKey);
    if (stored == null) return;
    if (stored < 0) {
      setCollapsed(true);
      return;
    }
    setSize(clamp(stored, minSize, maxSize));
  }, [storageKey, minSize, maxSize]);

  // Persist on change.
  useEffect(() => {
    if (!storageKey) return;
    writeStored(storageKey, collapsed ? -1 : size);
  }, [size, collapsed, storageKey]);

  const beginDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      setDragging(true);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const raw = isHorizontal
        ? event.clientX - rect.left
        : event.clientY - rect.top;
      const total = isHorizontal ? rect.width : rect.height;
      // Cap maxSize at total - minSize so the second pane keeps at least one
      // min-size worth of space available.
      const effectiveMax = Math.min(
        maxSize,
        Math.max(total - minSize, minSize),
      );

      if (collapsible && raw < minSize - 24) {
        setCollapsed(true);
        return;
      }
      setCollapsed(false);
      setSize(clamp(raw, minSize, effectiveMax));
    },
    [dragging, isHorizontal, minSize, maxSize, collapsible],
  );

  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setDragging(false);
    },
    [],
  );

  const reset = useCallback(() => {
    setCollapsed(false);
    setSize(clamp(defaultSize, minSize, maxSize));
  }, [defaultSize, minSize, maxSize]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const decrease = isHorizontal ? "ArrowLeft" : "ArrowUp";
      const increase = isHorizontal ? "ArrowRight" : "ArrowDown";

      if (event.key === decrease) {
        event.preventDefault();
        setCollapsed(false);
        setSize((prev) => clamp(prev - NUDGE_PX, minSize, maxSize));
      } else if (event.key === increase) {
        event.preventDefault();
        setCollapsed(false);
        setSize((prev) => clamp(prev + NUDGE_PX, minSize, maxSize));
      } else if (event.key === "Home") {
        event.preventDefault();
        reset();
      } else if (event.key === "Enter" || event.key === " ") {
        if (collapsible) {
          event.preventDefault();
          setCollapsed((prev) => !prev);
        }
      }
    },
    [isHorizontal, minSize, maxSize, reset, collapsible],
  );

  // While dragging, lock body cursor and disable selection.
  useLayoutEffect(() => {
    if (!dragging) return;
    const previous = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = previous;
      document.body.style.userSelect = previousSelect;
    };
  }, [dragging, isHorizontal]);

  const firstStyle: CSSProperties = useMemo(() => {
    if (collapsed) {
      return isHorizontal
        ? { width: 0, minWidth: 0, flexBasis: 0 }
        : { height: 0, minHeight: 0, flexBasis: 0 };
    }
    return isHorizontal
      ? {
          width: size,
          minWidth: 0,
          flexBasis: size,
          flexShrink: 0,
          flexGrow: 0,
        }
      : {
          height: size,
          minHeight: 0,
          flexBasis: size,
          flexShrink: 0,
          flexGrow: 0,
        };
  }, [collapsed, isHorizontal, size]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-full w-full overflow-hidden",
        isHorizontal ? "flex-row" : "flex-col",
        className,
      )}
      data-orientation={orientation}
    >
      <div
        className={cn(
          "min-w-0 min-h-0 overflow-hidden",
          collapsed ? "pointer-events-none opacity-0" : "opacity-100",
          // Skip transitions while actively dragging — feels laggy otherwise.
          dragging ? "" : "transition-opacity duration-150",
        )}
        style={firstStyle}
        aria-hidden={collapsed || undefined}
      >
        {first}
      </div>

      {/* Divider — outer hit area is wider than the visible hairline. */}
      <div
        role="separator"
        aria-orientation={isHorizontal ? "vertical" : "horizontal"}
        aria-label={ariaLabel ?? "Resize panes"}
        aria-valuenow={Math.round(size)}
        aria-valuemin={minSize}
        aria-valuemax={Number.isFinite(maxSize) ? maxSize : undefined}
        aria-controls={secondPaneId}
        tabIndex={0}
        onPointerDown={beginDrag}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={reset}
        onKeyDown={onKeyDown}
        className={cn(
          "group relative shrink-0 flex items-center justify-center",
          // Wide hit target, narrow visible line. Horizontal orientation
          // means a *vertical* divider.
          isHorizontal
            ? "w-1 cursor-col-resize hover:w-1.5"
            : "h-1 cursor-row-resize hover:h-1.5",
          "transition-[width,height] duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-0",
          dragging && "bg-accent/40",
        )}
      >
        {/* Hairline visible element */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 m-auto bg-border transition-colors duration-150 group-hover:bg-accent/60",
            isHorizontal ? "w-px h-full" : "h-px w-full",
            dragging && "bg-accent",
          )}
        />
        {/* Grip pill — only visible on hover/focus/drag. */}
        <span
          aria-hidden
          className={cn(
            "relative z-10 rounded-full bg-text-subtle/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
            isHorizontal ? "h-8 w-[3px]" : "w-8 h-[3px]",
            dragging && "opacity-100 bg-accent",
          )}
        />
      </div>

      {/* "Show again" affordance when the first pane is collapsed. */}
      {collapsed && (
        <button
          type="button"
          onClick={reset}
          className={cn(
            "absolute z-20 inline-flex items-center justify-center rounded-full",
            "border border-border bg-surface-raised text-text-subtle shadow-sm",
            "hover:text-accent hover:border-accent/40 transition-colors",
            isHorizontal
              ? "left-1.5 top-3 h-7 w-7"
              : "top-1.5 left-3 h-7 w-7",
          )}
          aria-label="Show pane"
          title="Show pane"
        >
          {isHorizontal ? (
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
              <path
                d="M9 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
              <path
                d="M6 9l6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      )}

      <div
        id={secondPaneId}
        className="flex-1 min-w-0 min-h-0 overflow-hidden"
      >
        {second}
      </div>
    </div>
  );
}

export default SplitPane;

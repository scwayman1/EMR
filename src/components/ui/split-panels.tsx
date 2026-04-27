"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * SplitPanels — resizable split-pane primitive (EMR-028).
 *
 * API-compatible-ish with `react-resizable-panels` for an easy swap-in
 * later: <SplitPanels direction="horizontal"> with <Panel>s separated
 * by <PanelHandle>s. Each Panel takes a `defaultSize` (percent) and
 * an optional `minSize`. Drag a handle to resize the adjacent panes;
 * the rest of the layout stays put.
 *
 * Sizes are stored as percentages so the layout stays correct as the
 * window or container resizes, and they round-trip through localStorage
 * via the optional `storageKey` prop.
 */

interface SplitPanelsProps {
  direction?: "horizontal" | "vertical";
  /** Persists pane sizes across sessions when set. */
  storageKey?: string;
  className?: string;
  children: React.ReactNode;
}

interface PanelProps {
  defaultSize?: number;
  minSize?: number;
  className?: string;
  children: React.ReactNode;
}

interface PanelHandleProps {
  className?: string;
}

export function Panel(_props: PanelProps): JSX.Element {
  // Rendered by SplitPanels; this component exists to carry props.
  // Returning a fragment keeps it valid if used standalone.
  return <></>;
}
Panel.displayName = "Panel";

export function PanelHandle(_props: PanelHandleProps): JSX.Element {
  return <></>;
}
PanelHandle.displayName = "PanelHandle";

interface ChildSpec {
  type: "panel" | "handle";
  node: React.ReactElement;
  index: number;
}

function classifyChildren(children: React.ReactNode): ChildSpec[] {
  const arr = React.Children.toArray(children).filter(
    React.isValidElement
  ) as React.ReactElement[];
  return arr.map((node, index) => {
    const t =
      (node.type as { displayName?: string })?.displayName === "PanelHandle"
        ? "handle"
        : "panel";
    return { type: t, node, index };
  });
}

export function SplitPanels({
  direction = "horizontal",
  storageKey,
  className,
  children,
}: SplitPanelsProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const items = classifyChildren(children);
  const panels = items.filter((i) => i.type === "panel");

  // Initial sizes: respect each panel's defaultSize, then redistribute
  // any leftover percentage equally across panels that didn't specify.
  const initialSizes = React.useMemo(() => {
    const explicit: (number | null)[] = panels.map((p) =>
      typeof (p.node.props as PanelProps).defaultSize === "number"
        ? ((p.node.props as PanelProps).defaultSize as number)
        : null
    );
    const explicitSum: number = explicit.reduce<number>(
      (a, b) => a + (typeof b === "number" ? b : 0),
      0
    );
    const remaining = Math.max(0, 100 - explicitSum);
    const unsetCount = explicit.filter((s) => s === null).length;
    const each = unsetCount > 0 ? remaining / unsetCount : 0;
    return explicit.map((s) => (s === null ? each : s));
  }, [panels]);

  const [sizes, setSizes] = React.useState<number[]>(initialSizes);

  // Hydrate from storage after mount so SSR markup is deterministic.
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.length === initialSizes.length &&
        parsed.every((n) => typeof n === "number")
      ) {
        setSizes(parsed);
      }
    } catch {
      // Corrupt storage — fall back to defaults.
    }
  }, [storageKey, initialSizes.length]);

  const persist = React.useCallback(
    (next: number[]) => {
      setSizes(next);
      if (!storageKey) return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  // Reset sizes when the panel count changes (a pane was opened or closed).
  React.useEffect(() => {
    if (sizes.length !== initialSizes.length) {
      setSizes(initialSizes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSizes.length]);

  const startDrag = (handleIdx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    const rect = container.getBoundingClientRect();
    const total = direction === "horizontal" ? rect.width : rect.height;
    const startSizes = [...sizes];
    const startCoord = direction === "horizontal" ? e.clientX : e.clientY;

    // handleIdx = N means: handle between panel N and panel N+1.
    const leftIdx = handleIdx;
    const rightIdx = handleIdx + 1;
    const minLeft = (panels[leftIdx]?.node.props as PanelProps)?.minSize ?? 5;
    const minRight = (panels[rightIdx]?.node.props as PanelProps)?.minSize ?? 5;

    const onMove = (ev: PointerEvent) => {
      const coord = direction === "horizontal" ? ev.clientX : ev.clientY;
      const deltaPx = coord - startCoord;
      const deltaPct = (deltaPx / total) * 100;
      const left = startSizes[leftIdx] + deltaPct;
      const right = startSizes[rightIdx] - deltaPct;
      if (left < minLeft || right < minRight) return;
      const next = [...startSizes];
      next[leftIdx] = left;
      next[rightIdx] = right;
      persist(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  let panelCursor = 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex w-full h-full",
        direction === "horizontal" ? "flex-row" : "flex-col",
        className
      )}
      role="group"
      aria-label="Split view"
    >
      {items.map((item, i) => {
        if (item.type === "panel") {
          const idx = panelCursor++;
          const size = sizes[idx] ?? 0;
          const props = item.node.props as PanelProps;
          return (
            <div
              key={`p-${i}`}
              className={cn(
                "min-w-0 min-h-0 overflow-auto",
                props.className
              )}
              style={{
                flexBasis: `${size}%`,
                flexGrow: 0,
                flexShrink: 0,
              }}
            >
              {props.children}
            </div>
          );
        }
        const handleIdx = panelCursor - 1;
        return (
          <div
            key={`h-${i}`}
            role="separator"
            aria-orientation={
              direction === "horizontal" ? "vertical" : "horizontal"
            }
            tabIndex={0}
            onPointerDown={startDrag(handleIdx)}
            className={cn(
              "shrink-0 bg-border/60 hover:bg-accent transition-colors",
              direction === "horizontal"
                ? "w-1 cursor-col-resize"
                : "h-1 cursor-row-resize"
            )}
          />
        );
      })}
    </div>
  );
}

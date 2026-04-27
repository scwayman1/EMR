"use client";

import * as React from "react";
import { SplitPanels, Panel, PanelHandle } from "@/components/ui/split-panels";
import { cn } from "@/lib/utils/cn";

interface RouteOption {
  label: string;
  href: string;
}

interface WorkspaceSplitProps {
  routes: RouteOption[];
}

const STORAGE_PANES = "workspace:panes:v1";
const STORAGE_SIZES = "workspace:sizes:v1";
const MAX_PANES = 3;

export function WorkspaceSplit({ routes }: WorkspaceSplitProps) {
  const [panes, setPanes] = React.useState<string[]>([routes[0].href]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_PANES);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.length <= MAX_PANES &&
        parsed.every((s) => typeof s === "string")
      ) {
        setPanes(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const persistPanes = (next: string[]) => {
    setPanes(next);
    try {
      window.localStorage.setItem(STORAGE_PANES, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const addPane = () => {
    if (panes.length >= MAX_PANES) return;
    persistPanes([...panes, routes[0].href]);
  };
  const removePane = (idx: number) => {
    if (panes.length <= 1) return;
    persistPanes(panes.filter((_, i) => i !== idx));
  };
  const updatePane = (idx: number, href: string) => {
    persistPanes(panes.map((p, i) => (i === idx ? href : p)));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-subtle">
          {panes.length} of {MAX_PANES} panes open
        </p>
        <button
          type="button"
          onClick={addPane}
          disabled={panes.length >= MAX_PANES}
          className={cn(
            "text-xs h-7 px-3 rounded-md border border-border bg-surface text-text-muted",
            "hover:bg-surface-muted hover:text-text transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          + Add pane
        </button>
      </div>

      <div className="h-[calc(100vh-220px)] min-h-[480px] rounded-xl border border-border overflow-hidden bg-surface">
        <SplitPanels
          direction="horizontal"
          storageKey={`${STORAGE_SIZES}:${panes.length}`}
        >
          {panes.flatMap((href, idx) => {
            const nodes: React.ReactNode[] = [
              <Panel key={`pane-${idx}`} minSize={15}>
                <PaneFrame
                  href={href}
                  routes={routes}
                  onChange={(next) => updatePane(idx, next)}
                  onClose={panes.length > 1 ? () => removePane(idx) : undefined}
                />
              </Panel>,
            ];
            if (idx < panes.length - 1) {
              nodes.push(<PanelHandle key={`handle-${idx}`} />);
            }
            return nodes;
          })}
        </SplitPanels>
      </div>
    </div>
  );
}

function PaneFrame({
  href,
  routes,
  onChange,
  onClose,
}: {
  href: string;
  routes: RouteOption[];
  onChange: (next: string) => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-surface-muted/40 shrink-0">
        <select
          value={href}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs h-7 rounded-md border border-border bg-surface px-2 flex-1 min-w-0"
          aria-label="Pane route"
        >
          {routes.map((r) => (
            <option key={r.href} value={r.href}>
              {r.label}
            </option>
          ))}
        </select>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-text-subtle hover:text-text transition-colors px-1.5"
          title="Open in new tab"
        >
          ↗
        </a>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-text-subtle hover:text-danger transition-colors px-1.5 text-sm"
            aria-label="Close pane"
          >
            ×
          </button>
        )}
      </div>
      <iframe
        src={href}
        className="flex-1 w-full bg-bg"
        title={`Pane ${href}`}
      />
    </div>
  );
}

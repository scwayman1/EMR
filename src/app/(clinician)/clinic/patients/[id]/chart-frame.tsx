"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type ChartTabPosition = "top" | "bottom";

export interface ChartFrameSettings {
  position: ChartTabPosition;
  setPosition: (p: ChartTabPosition) => void;
  /** True when the tab bar should render as dots + counts only, hiding labels. */
  compact: boolean;
  setCompact: (c: boolean) => void;
  /** False until localStorage hydration has run once. Consumers can use
   * this to avoid rendering personalized UI before the preference loads. */
  hydrated: boolean;
}

const Ctx = React.createContext<ChartFrameSettings | null>(null);

const STORAGE_KEY = "chart-tabs:settings:v1";

type StoredSettings = {
  position?: ChartTabPosition;
  compact?: boolean;
};

function readStored(): StoredSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const out: StoredSettings = {};
    if (parsed?.position === "top" || parsed?.position === "bottom") {
      out.position = parsed.position;
    }
    if (typeof parsed?.compact === "boolean") {
      out.compact = parsed.compact;
    }
    return out;
  } catch {
    // Corrupt JSON / blocked storage — silently use defaults.
    return {};
  }
}

function writeStored(settings: { position: ChartTabPosition; compact: boolean }) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Safari private mode or quota exhausted — keep state in memory.
  }
}

export function useChartFrame(): ChartFrameSettings {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error("useChartFrame must be used inside <ChartFrame>");
  }
  return ctx;
}

/**
 * ChartFrame wraps the patient chart's tab bar + tab content so both
 * can respond to a shared position / compact preference that the
 * clinician controls from the tab bar itself.
 *
 * Why a wrapper instead of CSS on the nav alone: the tab *content* is
 * a sibling of the nav, so controlling vertical order (top vs bottom
 * nav) requires wrapping both in a single flex container and flipping
 * its direction. Putting that container here — with state + storage
 * centralized — keeps the patient page itself declarative.
 *
 * SSR-safety: renders with default settings on the server so the
 * markup is deterministic; hydrates from localStorage in a useEffect
 * after mount. `hydrated` flips true once, and consumers that want
 * to avoid a default-then-personalized flash can gate on it.
 */
export function ChartFrame({
  nav,
  children,
}: {
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  const [position, setPositionState] = React.useState<ChartTabPosition>("top");
  const [compact, setCompactState] = React.useState<boolean>(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = readStored();
    if (stored.position) setPositionState(stored.position);
    if (stored.compact !== undefined) setCompactState(stored.compact);
    setHydrated(true);
  }, []);

  const setPosition = (p: ChartTabPosition) => {
    setPositionState(p);
    writeStored({ position: p, compact });
  };
  const setCompact = (c: boolean) => {
    setCompactState(c);
    writeStored({ position, compact: c });
  };

  return (
    <Ctx.Provider
      value={{ position, setPosition, compact, setCompact, hydrated }}
    >
      <div
        className={cn(
          "flex flex-col",
          position === "bottom" && "flex-col-reverse"
        )}
      >
        {nav}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </Ctx.Provider>
  );
}

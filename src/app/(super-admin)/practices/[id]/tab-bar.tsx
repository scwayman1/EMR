// Server-rendered tab bar driven by the `?tab=` URL search param.
//
// We intentionally keep this server-only so the drill-in page can use
// server components throughout and each tab can lazy-load its data on
// selection rather than fetching everything up front (per AC). The
// History tab is rendered as a disabled anchor with a tooltip pointing
// at EMR-743 — implementation lives in that ticket's epic (E5).

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type TabKey = "overview" | "providers" | "activity" | "billing" | "history";

export const TAB_KEYS: TabKey[] = [
  "overview",
  "providers",
  "activity",
  "billing",
  "history",
];

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  providers: "Providers",
  activity: "Activity",
  billing: "Billing",
  history: "History",
};

export function isTabKey(value: string | undefined): value is TabKey {
  return !!value && (TAB_KEYS as string[]).includes(value);
}

export function TabBar({
  practiceId,
  active,
}: {
  practiceId: string;
  active: TabKey;
}) {
  return (
    <div
      className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto"
      role="tablist"
      aria-label="Practice tabs"
    >
      {TAB_KEYS.map((key) => {
        const isHistory = key === "history";
        const isActive = key === active;
        const base =
          "relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-t-md";

        if (isHistory) {
          return (
            <span
              key={key}
              role="tab"
              aria-disabled="true"
              aria-selected="false"
              title="Shipped in EMR-743"
              className={cn(
                base,
                "text-text-muted/60 cursor-not-allowed select-none",
              )}
            >
              {TAB_LABELS[key]}
              <span className="ml-1.5 text-[10px] uppercase tracking-wider rounded-full bg-surface-muted text-text-muted/70 px-1.5 py-0.5 align-middle">
                Soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={key}
            href={`/practices/${practiceId}?tab=${key}`}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={cn(
              base,
              isActive
                ? "text-accent"
                : "text-text-muted hover:text-text",
            )}
          >
            {TAB_LABELS[key]}
            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

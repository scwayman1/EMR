"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

// EMR-177 — Two-row chart tab ribbon, no horizontal scroll
//
// The original chart-tabs ribbon (chart-tabs.tsx in the chart route)
// supports 9 tabs in a single horizontal row that wraps when narrow.
// In practice that produced a "swipe-only" experience on 13" laptops —
// physicians had to scroll horizontally to reach Cannabis Rx and the
// Financial cockpit, and the wrap break was unpredictable.
//
// This ribbon is a different shape: it's *categorically* split into
// two rows. Row 1 is clinical (the data the physician reads to make
// a decision), Row 2 is administrative (billing, correspondence,
// referrals, compliance). Both rows wrap independently on mobile so
// the worst case is two short rows of 3-4 tabs each, never a swipe.
//
// We keep this component standalone (rather than rebuilding the
// existing ribbon) so it can be adopted from the patient-facing
// route shells where the existing drag-to-reorder + hover-peek
// machinery would be overkill. The chart route can switch to this
// component as a follow-up when the design system call lands.

export interface RibbonTab {
  key: string;
  label: string;
  href: string;
  /** Optional small count badge. */
  count?: number;
  /** Tone color for the leading dot — defaults to accent. */
  tone?: "accent" | "info" | "success" | "highlight" | "danger" | "neutral";
}

export interface RibbonRow {
  /** Pill label rendered to the left of the row on wide viewports. */
  label: string;
  tabs: RibbonTab[];
}

const DOT_TONE: Record<NonNullable<RibbonTab["tone"]>, string> = {
  accent: "bg-accent",
  info: "bg-[color:var(--info)]",
  success: "bg-[color:var(--success)]",
  highlight: "bg-[color:var(--highlight)]",
  danger: "bg-[color:var(--danger)]",
  neutral: "bg-border-strong/50",
};

interface ChartTabRibbonProps {
  /** Top row — usually clinical. */
  clinical: RibbonRow;
  /** Bottom row — usually administrative. */
  admin: RibbonRow;
  /**
   * Search-param key used to determine the active tab. Defaults to "tab"
   * so this drops in alongside the existing chart-tabs route shape.
   */
  paramKey?: string;
  /** Active key fallback when no search param is set. */
  defaultKey?: string;
  className?: string;
}

export function ChartTabRibbon({
  clinical,
  admin,
  paramKey = "tab",
  defaultKey,
  className,
}: ChartTabRibbonProps) {
  const searchParams = useSearchParams();
  const active = searchParams.get(paramKey) || defaultKey || clinical.tabs[0]?.key || "";

  // Mobile: collapse to a primary row + "More" toggle for the admin row.
  // The admin row stays visible by default on md+ viewports because the
  // whole point of the two-row layout is to show both at once.
  const adminHasActive = admin.tabs.some((t) => t.key === active);
  const [mobileAdminOpen, setMobileAdminOpen] = React.useState(adminHasActive);

  React.useEffect(() => {
    if (adminHasActive) setMobileAdminOpen(true);
  }, [adminHasActive]);

  return (
    <div
      className={cn(
        "border-b border-border mb-6 print:hidden",
        className,
      )}
      data-testid="chart-tab-ribbon"
    >
      <RibbonRowView row={clinical} active={active} />
      <div className="hidden md:block">
        <RibbonRowView row={admin} active={active} muted />
      </div>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileAdminOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle hover:text-text"
          aria-expanded={mobileAdminOpen}
          aria-controls="chart-tab-ribbon-admin"
        >
          <span>{admin.label}</span>
          <span aria-hidden="true" className={cn(mobileAdminOpen && "rotate-180", "transition-transform")}>
            ▾
          </span>
        </button>
        {mobileAdminOpen && (
          <div id="chart-tab-ribbon-admin">
            <RibbonRowView row={admin} active={active} muted />
          </div>
        )}
      </div>
    </div>
  );
}

function RibbonRowView({
  row,
  active,
  muted,
}: {
  row: RibbonRow;
  active: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 flex-wrap py-1",
        // Subtle ground-color change on the admin row so the categorical
        // split reads at a glance even before the eye lands on labels.
        muted && "bg-surface-muted/30",
      )}
    >
      <span
        className={cn(
          "hidden md:inline-flex items-center px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
          muted ? "text-text-subtle" : "text-accent",
        )}
        aria-hidden="true"
      >
        {row.label}
      </span>
      {row.tabs.map((tab) => (
        <RibbonTabLink key={tab.key} tab={tab} active={active} />
      ))}
    </div>
  );
}

function RibbonTabLink({
  tab,
  active,
}: {
  tab: RibbonTab;
  active: string;
}) {
  const isActive = tab.key === active;
  return (
    <Link
      href={tab.href}
      scroll={false}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors",
        isActive
          ? "text-accent bg-accent-soft/50"
          : "text-text-muted hover:text-text hover:bg-surface-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          isActive ? DOT_TONE[tab.tone ?? "accent"] : "bg-border-strong/40",
        )}
      />
      <span>{tab.label}</span>
      {typeof tab.count === "number" && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded-full tabular-nums",
            isActive
              ? "bg-accent text-accent-ink"
              : "bg-surface-muted text-text-subtle",
          )}
        >
          {tab.count}
        </span>
      )}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute -bottom-[1px] left-2 right-2 h-[2px] bg-accent rounded-full"
        />
      )}
    </Link>
  );
}

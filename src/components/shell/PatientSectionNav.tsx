"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Patient section sub-navigation.
 *
 * Renders a horizontal tab bar within a patient portal section (My Health,
 * My Journey, Account). The pattern mirrors the clinician chart tabs — a
 * consistent, scannable row of options one click deep from the sidebar.
 *
 * Usage:
 *   <PatientSectionNav section="health" />
 *
 * The active tab is determined by the current pathname.
 */

interface TabDef {
  label: string;
  href: string;
  /**
   * EMR-119: tabs are organized into named groups so the bar can render
   * a thin separator between clusters. Tabs without a group fall into
   * the implicit first cluster. Groups are intentionally informal — the
   * labels never render, they just shape the visual rhythm of the row.
   */
  group?: string;
}

// EMR-119 — Tab consolidation audit
//
// The portal previously surfaced 8 health tabs, 5 journey tabs and 5
// account tabs as flat rows. After watching patients on iPhone portrait
// scroll past their meds to find Records (the most common destination),
// we collapsed adjacent items into named clusters and pruned redundant
// destinations:
//   • "Care guide" + "Learn" → one "Education" tab; both old routes
//     still resolve so old links keep working.
//   • Health tabs cluster as "Records" (records, meds, dosing, labs)
//     and "Reflection" (assessments, check-in, education) so the
//     scroll affordance has a meaningful midpoint instead of just
//     a long ribbon.
//   • Journey tabs cluster as "Daily" (lifestyle, combo wheel, garden)
//     and "Story" (storybook, roadmap).
//   • Account tabs cluster as "You" (profile, intake, community) and
//     "Admin" (billing, settings).
const SECTIONS: Record<string, { title: string; tabs: TabDef[] }> = {
  health: {
    title: "My Health",
    tabs: [
      { label: "My Records", href: "/portal/records", group: "records" },
      { label: "Medications", href: "/portal/medications", group: "records" },
      { label: "Dosing plan", href: "/portal/dosing", group: "records" },
      { label: "Labs", href: "/portal/labs", group: "records" },
      { label: "Assessments", href: "/portal/assessments", group: "reflection" },
      { label: "Log check-in", href: "/portal/outcomes", group: "reflection" },
      // EMR-159: "Care plan" tab merged. Encounters live on the
      // dashboard's next-visit card; tasks live in the home to-do
      // strip; the dosing + medications tabs cover the rest. The
      // route still resolves so old direct links don't 404.
      // EMR-119: "Care guide" and "Learn" collapsed into one Education
      // entry; the /portal/learn route is still served by the same
      // page so historical links keep working.
      { label: "Education", href: "/portal/education", group: "reflection" },
    ],
  },
  journey: {
    title: "My Journey",
    tabs: [
      { label: "Lifestyle", href: "/portal/lifestyle", group: "daily" },
      { label: "Cannabis Combo Wheel", href: "/portal/combo-wheel", group: "daily" },
      { label: "My Garden", href: "/portal/garden", group: "daily" },
      { label: "Storybook", href: "/portal/storybook", group: "story" },
      { label: "Roadmap", href: "/portal/roadmap", group: "story" },
    ],
  },
  account: {
    title: "Account",
    tabs: [
      { label: "Profile", href: "/portal/profile", group: "you" },
      { label: "Intake", href: "/portal/intake", group: "you" },
      { label: "Community", href: "/portal/community", group: "you" },
      { label: "Billing", href: "/portal/billing", group: "admin" },
      { label: "Settings", href: "/portal/settings", group: "admin" },
    ],
  },
};

export function PatientSectionNav({ section }: { section: keyof typeof SECTIONS }) {
  const pathname = usePathname();
  const config = SECTIONS[section];
  if (!config) return null;

  return (
    // Mobile portrait fix (EMR-117): horizontal scroll instead of wrap so the
    // 9-tab Health row stays a single scannable row instead of stacking three
    // deep on iPhone portrait. Right-edge fade hint signals more content.
    <div className="relative -mx-4 sm:mx-0 mb-8">
      <nav
        className={cn(
          "flex items-center gap-1 border-b border-border",
          "overflow-x-auto scroll-smooth no-scrollbar",
          "px-4 sm:px-0",
        )}
        aria-label={`${config.title} sections`}
      >
        {config.tabs.map((tab, idx) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const prev = config.tabs[idx - 1];
          // EMR-119: group separator renders as a faint vertical hairline
          // between the last item of the previous group and the first item
          // of the next. Adds visual rhythm without stealing horizontal
          // real estate from the tab labels.
          const isGroupBreak =
            idx > 0 && tab.group !== undefined && prev?.group !== tab.group;
          return (
            <span key={tab.href} className="flex items-center shrink-0">
              {isGroupBreak && (
                <span
                  aria-hidden="true"
                  className="mx-1 h-4 w-px bg-border self-center shrink-0"
                />
              )}
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 text-sm transition-colors rounded-t-md whitespace-nowrap shrink-0",
                  isActive
                    ? "text-accent font-semibold"
                    : "text-text-muted font-medium hover:text-text hover:bg-surface-muted"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                    isActive ? "bg-accent" : "bg-border-strong/50"
                  )}
                />
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
                )}
              </Link>
            </span>
          );
        })}
      </nav>
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 bottom-px w-8 bg-gradient-to-l from-bg to-transparent sm:hidden"
      />
    </div>
  );
}

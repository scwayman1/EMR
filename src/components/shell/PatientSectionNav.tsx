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
}

const SECTIONS: Record<string, { title: string; tabs: TabDef[] }> = {
  health: {
    title: "My Health",
    tabs: [
      { label: "My Records", href: "/portal/records" },
      { label: "Medications", href: "/portal/medications" },
      { label: "Dosing plan", href: "/portal/dosing" },
      { label: "Labs", href: "/portal/labs" },
      { label: "Assessments", href: "/portal/assessments" },
      { label: "Log check-in", href: "/portal/outcomes" },
      // EMR-159: "Care plan" tab merged. Encounters live on the
      // dashboard's next-visit card; tasks live in the home to-do
      // strip; the dosing + medications tabs cover the rest. The
      // route still resolves so old direct links don't 404.
      { label: "Care guide", href: "/portal/education" },
      { label: "Learn", href: "/portal/learn" },
    ],
  },
  journey: {
    title: "My Journey",
    tabs: [
      { label: "Lifestyle", href: "/portal/lifestyle" },
      { label: "Cannabis Combo Wheel", href: "/portal/combo-wheel" },
      { label: "My Garden", href: "/portal/garden" },
      { label: "Storybook", href: "/portal/storybook" },
      { label: "Roadmap", href: "/portal/roadmap" },
    ],
  },
  account: {
    title: "Account",
    tabs: [
      { label: "Profile", href: "/portal/profile" },
      { label: "Billing", href: "/portal/billing" },
      { label: "Intake", href: "/portal/intake" },
      { label: "Community", href: "/portal/community" },
      { label: "Settings", href: "/portal/settings" },
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
        {config.tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
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

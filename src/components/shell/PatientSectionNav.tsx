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
      { label: "Records", href: "/portal/records" },
      { label: "Medications", href: "/portal/medications" },
      { label: "Assessments", href: "/portal/assessments" },
      { label: "Outcomes", href: "/portal/outcomes" },
      { label: "Care plan", href: "/portal/care-plan" },
    ],
  },
  journey: {
    title: "My Journey",
    tabs: [
      { label: "Lifestyle", href: "/portal/lifestyle" },
      { label: "My Garden", href: "/portal/garden" },
      { label: "Storybook", href: "/portal/storybook" },
      { label: "Achievements", href: "/portal/achievements" },
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
    ],
  },
};

export function PatientSectionNav({ section }: { section: keyof typeof SECTIONS }) {
  const pathname = usePathname();
  const config = SECTIONS[section];
  if (!config) return null;

  return (
    <nav
      className="flex flex-wrap items-center gap-1 border-b border-border mb-8"
      aria-label={`${config.title} sections`}
    >
      {config.tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-t-md whitespace-nowrap",
              isActive
                ? "text-accent"
                : "text-text-muted hover:text-text hover:bg-surface-muted"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                isActive ? "bg-accent" : "bg-border-strong/50"
              )}
            />
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Patient section sub-navigation.
 *
 * Renders a horizontal tab bar within a patient portal section (My Records,
 * My Garden, Account, Chat & Learn). The pattern mirrors the clinician
 * chart tabs — a consistent, scannable row of options one click deep from
 * the sidebar.
 *
 * `health` (My Records) renders as a two-row collapsible ribbon — a primary
 * row with the most-used links and a secondary "More" row that expands on
 * demand.
 */

interface TabDef {
  label: string;
  href: string;
}

interface SectionDef {
  title: string;
  primary: TabDef[];
  secondary?: TabDef[];
}

const SECTIONS: Record<string, SectionDef> = {
  health: {
    title: "My Records",
    // EMR-195: split into a primary row + collapsible "More" row so the
    // 8-tab ribbon doesn't overwhelm on first paint.
    // EMR-119/124: "Learn" was duplicated here and in chatLearn — both
    // pointed to /portal/learn. Drop the duplicate so health stays
    // record-focused and the educational library lives in Chat & Learn.
    primary: [
      { label: "My Records", href: "/portal/records" },
      { label: "Medications", href: "/portal/medications" },
      { label: "Dosing plan", href: "/portal/dosing" },
      { label: "Labs", href: "/portal/labs" },
    ],
    secondary: [
      { label: "Assessments", href: "/portal/assessments" },
      { label: "Log check-in", href: "/portal/outcomes" },
      { label: "Care guide", href: "/portal/education" },
    ],
  },
  // EMR-196: renamed "My Journey" → "My Garden". Ribbon is Lifestyle /
  // My Garden / Storybook / Roadmap. The Cannabis Combo Wheel moved to
  // the Chat & Learn section.
  garden: {
    title: "My Garden",
    primary: [
      { label: "Lifestyle", href: "/portal/lifestyle" },
      { label: "My Garden", href: "/portal/garden" },
      { label: "Storybook", href: "/portal/storybook" },
      { label: "Roadmap", href: "/portal/roadmap" },
    ],
  },
  // EMR-199: account ribbon trimmed to Profile / Billing / Intake / Settings.
  // Community moved to the Chat & Learn ribbon.
  account: {
    title: "Account",
    primary: [
      { label: "Profile", href: "/portal/profile" },
      { label: "Billing", href: "/portal/billing" },
      { label: "Intake", href: "/portal/intake" },
      { label: "Settings", href: "/portal/settings" },
    ],
  },
  // EMR-200: Chat & Learn ribbon — community plus the public-style
  // education surfaces.
  // EMR-124: prior "Research" label was misleading — /portal/learn is
  // the educational library (cannabinoids/terpenes/conditions). Renamed
  // to "Learn" so the label matches the destination.
  chatLearn: {
    title: "Chat & Learn",
    primary: [
      { label: "Community", href: "/portal/community" },
      { label: "Cannabis Wheel", href: "/portal/combo-wheel" },
      { label: "ChatCB", href: "/portal/chatcb" },
      { label: "Learn", href: "/portal/learn" },
    ],
  },
};

// Backwards-compat: callers used to pass `journey`. Map it to `garden`.
const SECTION_ALIAS: Record<string, keyof typeof SECTIONS> = {
  journey: "garden",
};

function Tab({
  tab,
  pathname,
}: {
  tab: TabDef;
  pathname: string;
}) {
  const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
  return (
    <Link
      href={tab.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2.5 text-sm transition-colors rounded-t-md whitespace-nowrap shrink-0",
        isActive
          ? "text-accent font-semibold"
          : "text-text-muted font-medium hover:text-text hover:bg-surface-muted",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
          isActive ? "bg-accent" : "bg-border-strong/50",
        )}
      />
      {tab.label}
      {isActive && (
        <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
      )}
    </Link>
  );
}

export function PatientSectionNav({ section }: { section: string }) {
  const pathname = usePathname();
  const resolved = (SECTION_ALIAS[section] as keyof typeof SECTIONS) ?? (section as keyof typeof SECTIONS);
  const config = SECTIONS[resolved];
  // The "More" row needs to start expanded if any of the secondary tabs
  // is the current page — otherwise the user sees an empty primary row
  // with no indication of where they actually are.
  const secondary = config?.secondary ?? [];
  const secondaryActive = secondary.some(
    (t) => pathname === t.href || pathname.startsWith(t.href + "/"),
  );
  const [moreOpen, setMoreOpen] = useState(secondaryActive);

  if (!config) return null;

  const hasSecondary = secondary.length > 0;

  return (
    <div className="relative -mx-4 sm:mx-0 mb-8">
      <nav
        className={cn(
          "flex items-center gap-1 border-b border-border",
          "overflow-x-auto scroll-smooth no-scrollbar",
          "px-4 sm:px-0",
        )}
        aria-label={`${config.title} sections`}
      >
        {config.primary.map((tab) => (
          <Tab key={tab.href} tab={tab} pathname={pathname} />
        ))}
        {hasSecondary && (
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-controls="patient-section-nav-more"
            className={cn(
              "relative ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0",
              "text-text-muted hover:text-text hover:bg-surface-muted",
            )}
          >
            {moreOpen ? "Less" : "More"}
            <span
              className={cn(
                "inline-block transition-transform",
                moreOpen ? "rotate-180" : "rotate-0",
              )}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
        )}
      </nav>

      {hasSecondary && moreOpen && (
        <nav
          id="patient-section-nav-more"
          className={cn(
            "flex items-center gap-1 border-b border-border/60 bg-surface-muted/30",
            "overflow-x-auto scroll-smooth no-scrollbar",
            "px-4 sm:px-2",
          )}
          aria-label={`${config.title} more sections`}
        >
          {secondary.map((tab) => (
            <Tab key={tab.href} tab={tab} pathname={pathname} />
          ))}
        </nav>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 bottom-px w-8 bg-gradient-to-l from-bg to-transparent sm:hidden"
      />
    </div>
  );
}

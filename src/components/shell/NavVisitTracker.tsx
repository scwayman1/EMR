"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { flattenSectionItems, itemMatchesPath, type NavSection } from "./nav-sections";
import { useNavPrefs } from "./NavPrefsContext";

/**
 * Invisible side-effect component that records every distinct route change
 * into NavPrefsContext recents. Sits inside the provider tree in AppShell.
 *
 * Label resolution walks the flattened section list looking for the
 * longest-prefix match. If no section item matches (e.g. the user is on a
 * dynamic route not in the nav), we skip the visit — recents would otherwise
 * fill with raw pathnames which read poorly.
 */

export interface NavVisitTrackerProps {
  sections: NavSection[];
}

function resolveLabel(sections: NavSection[], pathname: string): { href: string; label: string } | null {
  const items = flattenSectionItems(sections);
  // Prefer an exact match, else the longest-prefix match.
  let exact: { href: string; label: string } | null = null;
  let prefix: { href: string; label: string; len: number } | null = null;
  for (const item of items) {
    if (item.href === pathname) {
      exact = { href: item.href, label: item.label };
      break;
    }
    if (itemMatchesPath(item.href, pathname)) {
      if (!prefix || item.href.length > prefix.len) {
        prefix = { href: item.href, label: item.label, len: item.href.length };
      }
    }
  }
  if (exact) return exact;
  if (prefix) return { href: prefix.href, label: prefix.label };
  return null;
}

export function NavVisitTracker({ sections }: NavVisitTrackerProps) {
  const prefs = useNavPrefs();
  const pathname = usePathname() ?? "";

  React.useEffect(() => {
    if (!prefs || !prefs.hydrated) return;
    if (!pathname) return;
    const resolved = resolveLabel(sections, pathname);
    if (!resolved) return;
    prefs.visit(resolved);
    // `visit` is stable via useCallback; pathname + sections drive this.
  }, [pathname, sections, prefs]);

  return null;
}

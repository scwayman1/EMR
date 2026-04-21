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
 *
 * IMPORTANT: the effect deps intentionally exclude the full `prefs` object.
 * `prefs` is a `useMemo` that re-creates on every state change in
 * NavPrefsProvider — including the very `recents` list this component writes
 * to. Depending on it creates an infinite render loop:
 *   visit() → setRecents → prefs memo rebuilds → new prefs reference →
 *   effect re-fires → visit() …
 * Instead we pluck the two stable bits we actually need — `visit` (wrapped
 * in useCallback([]) in the provider, so its identity never changes) and
 * `hydrated` (a primitive bool). Both only change in ways that make the
 * effect *want* to re-run.
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
  const visit = prefs?.visit;
  const hydrated = prefs?.hydrated ?? false;

  React.useEffect(() => {
    if (!visit || !hydrated) return;
    if (!pathname) return;
    const resolved = resolveLabel(sections, pathname);
    if (!resolved) return;
    visit(resolved);
    // Deps: pathname + sections drive which route is recorded; visit + hydrated
    // are stable references from the provider. Excluding `prefs` is load-bearing
    // — see the comment at the top of the file.
  }, [pathname, sections, visit, hydrated]);

  return null;
}

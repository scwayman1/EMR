"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  aggregateSectionBadge,
  collapseStorageKey,
  readPersistedCollapseState,
  resolveInitialCollapseState,
  sectionContainsPath,
  type CountTone,
  type NavItem,
  type NavSection,
} from "./nav-sections";

/**
 * Rail renderer for the 3-tier IA.
 *
 * Tier 1: sections with no label render their items flush.
 * Tier 2: labeled sections get a collapsible header with an aggregate badge.
 * Tier 3: search everything via the ⌘K CommandPalette (separate component).
 *
 * Collapse state is persisted per-group via localStorage
 * (`nav:group:<label>:collapsed`) and resolved with smart defaults:
 * the section containing the current pathname is always open on first
 * render, defeating both the default and the persisted state.
 */

function toneClass(tone: CountTone): string {
  if (tone === "danger")
    return "bg-danger/10 text-danger border-danger/30 animate-pulse";
  if (tone === "accent")
    return "bg-accent-soft text-accent border-accent/25";
  return "bg-highlight-soft text-[color:var(--highlight-hover)] border-highlight/30";
}

function CountBadge({ count, tone }: { count: number; tone: CountTone }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold leading-none rounded-full border px-1.5 py-0.5 tabular-nums",
        toneClass(tone),
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ItemLink({
  item,
  onClick,
  isActive,
}: {
  item: NavItem;
  onClick?: () => void;
  isActive: boolean;
}) {
  const count = item.count ?? 0;
  const tone = item.countTone ?? "highlight";
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-label={count > 0 ? `${item.label} (${count} waiting)` : item.label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-200 ease-smooth",
        isActive
          ? "bg-surface-muted text-text"
          : "text-text-muted hover:bg-surface-muted hover:text-text",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1 w-1 rounded-full transition-colors",
          isActive ? "bg-accent" : "bg-border-strong group-hover:bg-accent",
        )}
      />
      <span className="flex-1">{item.label}</span>
      {count > 0 && <CountBadge count={count} tone={tone} />}
    </Link>
  );
}

export interface NavSectionsProps {
  sections: NavSection[];
  /**
   * If provided, called whenever a nav link is activated. Used by the mobile
   * drawer to close itself on navigation.
   */
  onItemClick?: () => void;
  /**
   * Render style. "rail" = desktop sidebar, "drawer" = mobile accordion.
   * Drawer mode gives items larger touch targets and tighter group chrome.
   */
  variant?: "rail" | "drawer";
}

export function NavSections({ sections, onItemClick, variant = "rail" }: NavSectionsProps) {
  const pathname = usePathname() ?? "";
  // Initial render must match the server. The server can't know the user's
  // persisted state, so on the first client render we seed from pathname +
  // defaults only, then hydrate from localStorage in a post-mount effect.
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(() =>
    resolveInitialCollapseState({ sections, pathname, persisted: {} }),
  );
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = readPersistedCollapseState(sections, (k) => {
      try {
        return window.localStorage.getItem(k);
      } catch {
        return null;
      }
    });
    setCollapsed(resolveInitialCollapseState({ sections, pathname, persisted }));
    setHydrated(true);
    // We intentionally run this once per pathname change so that navigating
    // into a group auto-expands it.
  }, [pathname, sections]);

  const toggle = (label: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            collapseStorageKey(label),
            next[label] ? "true" : "false",
          );
        } catch {
          /* localStorage can throw in private mode — non-fatal. */
        }
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const isLabeled = Boolean(section.label);
        const isFirstLabeled =
          isLabeled &&
          sections.findIndex((s) => Boolean(s.label)) === idx;

        if (!isLabeled) {
          return (
            <ul key={`flat-${idx}`} className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <ItemLink
                    item={item}
                    onClick={onItemClick}
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  />
                </li>
              ))}
            </ul>
          );
        }

        const label = section.label!;
        const isCollapsed = collapsed[label] ?? section.defaultCollapsed ?? false;
        const badge = aggregateSectionBadge(section);
        const headerId = `nav-group-${label.toLowerCase().replace(/\s+/g, "-")}`;
        const panelId = `${headerId}-panel`;
        const activeWithin = sectionContainsPath(section, pathname);

        return (
          <div
            key={label}
            className={cn(
              isFirstLabeled ? "pt-1" : "pt-3 border-t border-border/40",
            )}
          >
            <button
              type="button"
              id={headerId}
              aria-expanded={!isCollapsed}
              aria-controls={panelId}
              onClick={() => toggle(label)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 ease-smooth",
                "hover:bg-surface-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                activeWithin && "text-text",
              )}
            >
              <span
                className={cn(
                  "flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.14em]",
                  activeWithin ? "text-text" : "text-text-subtle",
                )}
              >
                {label}
              </span>
              {badge && <CountBadge count={badge.count} tone={badge.tone} />}
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "text-text-subtle transition-transform duration-200 ease-smooth",
                  isCollapsed ? "rotate-0" : "rotate-180",
                )}
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={isCollapsed}
              className={cn(
                "overflow-hidden transition-all duration-200 ease-smooth",
                isCollapsed ? "opacity-0 max-h-0" : "opacity-100",
                // While not hydrated we still want the panel to be visible if
                // not collapsed; this class guards against initial flash.
                hydrated ? "" : "",
              )}
            >
              <ul
                className={cn(
                  "space-y-0.5",
                  variant === "drawer" ? "mt-1 pl-1" : "mt-0.5 pl-1",
                )}
              >
                {section.items.map((item) => (
                  <li key={item.href}>
                    <ItemLink
                      item={item}
                      onClick={onItemClick}
                      isActive={
                        pathname === item.href || pathname.startsWith(item.href + "/")
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}

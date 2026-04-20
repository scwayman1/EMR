"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { NavSections, NavItemBadge, navItemAriaLabel } from "./NavSections";
import {
  getSectionBadge,
  hasPillarIcons,
  itemMatchesPath,
  pillarId,
  sectionContainsPath,
  type NavItem,
  type NavSection,
} from "./nav-sections";

interface MobileNavProps {
  /**
   * Preferred grouped sections. When both `sections` and the legacy `nav`
   * prop are provided, `sections` wins.
   */
  sections?: NavSection[];
  /** Legacy flat nav list, wrapped in a single unlabeled section. */
  nav?: NavItem[];
}

export function MobileNav({ sections, nav }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);

  const resolved: NavSection[] = React.useMemo(() => {
    if (sections && sections.length > 0) return sections;
    if (nav && nav.length > 0) return [{ items: nav }];
    return [];
  }, [sections, nav]);

  // Close drawer on route change (link click)
  const closeDrawer = () => setOpen(false);

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const usePillarLayout = hasPillarIcons(resolved);

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-10 h-10 rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-smooth",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal={open ? "true" : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border flex flex-col",
          "transition-transform duration-300 ease-smooth",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border/80">
          <span className="text-sm font-medium text-text">Menu</span>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeDrawer}
            className="flex items-center justify-center w-10 h-10 rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {usePillarLayout ? (
          <MobilePillarStrip sections={resolved} onItemClick={closeDrawer} />
        ) : (
          <nav
            aria-label="Mobile navigation"
            className="flex-1 overflow-y-auto px-3 py-3"
          >
            <NavSections
              sections={resolved}
              onItemClick={closeDrawer}
              variant="drawer"
            />
          </nav>
        )}
      </div>
    </>
  );
}

/**
 * Mobile equivalent of the desktop `PillarNav` (`IconRail` + `ContextDrawer`).
 *
 * On mobile the vertical 64px rail is too low-density, so we lay the pillar
 * buttons out horizontally in a scroll strip at the top of the sheet and
 * render the active pillar's items below, stacked and tap-sized. Tapping the
 * already-active pillar collapses the sub-region; tapping another pillar
 * switches to it. Sections that lack an `icon` (legacy flat groups) are
 * appended below the strip as a vanilla accordion so nothing gets orphaned.
 */
function MobilePillarStrip({
  sections,
  onItemClick,
}: {
  sections: NavSection[];
  onItemClick: () => void;
}) {
  const pathname = usePathname() ?? "";

  const pillarSections = React.useMemo(
    () => sections.filter((s) => s.icon),
    [sections],
  );
  const legacySections = React.useMemo(
    () => sections.filter((s) => !s.icon),
    [sections],
  );

  const pathPillar = React.useMemo(() => {
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.icon) continue;
      if (sectionContainsPath(s, pathname)) return pillarId(s, i);
    }
    return null;
  }, [sections, pathname]);

  const [activePillar, setActivePillar] = React.useState<string | null>(
    pathPillar,
  );

  // When the route changes into a different pillar, follow it. Users can
  // still manually collapse the active pillar after that — `pathPillar` only
  // "grabs" focus on an actual pathname change.
  const lastPathPillarRef = React.useRef<string | null>(pathPillar);
  React.useEffect(() => {
    if (pathPillar && pathPillar !== lastPathPillarRef.current) {
      setActivePillar(pathPillar);
    }
    lastPathPillarRef.current = pathPillar;
  }, [pathPillar]);

  const activeSection = React.useMemo(() => {
    if (!activePillar) return null;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.icon) continue;
      if (pillarId(s, i) === activePillar) return s;
    }
    return null;
  }, [sections, activePillar]);

  const onSelect = (id: string) => {
    setActivePillar((prev) => (prev === id ? null : id));
  };

  const subRegionId = "mobile-pillar-sub";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        role="tablist"
        aria-label="Sections"
        className="flex gap-1 overflow-x-auto border-b border-border/80 px-2 py-2"
      >
        {pillarSections.map((section) => {
          const idx = sections.indexOf(section);
          const Icon = section.icon!;
          const id = pillarId(section, idx);
          const label = section.label ?? id;
          const badge = getSectionBadge(section);
          const isFocused = activePillar === id;
          const isOnPath =
            pathPillar === id || sectionContainsPath(section, pathname);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-label={label}
              aria-selected={isFocused}
              aria-expanded={isFocused}
              aria-controls={subRegionId}
              onClick={() => onSelect(id)}
              className={cn(
                "relative flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2",
                "min-w-[64px] text-text-muted transition-colors duration-200 ease-smooth",
                "hover:bg-surface-muted hover:text-text",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                isFocused && "bg-surface-muted text-text",
                !isFocused && isOnPath && "text-text",
              )}
            >
              <span className="relative flex h-7 w-7 items-center justify-center">
                <Icon width={22} height={22} />
                {badge && badge.severity !== "ok" && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -right-1 -top-1 h-2 w-2 rounded-full ring-2 ring-surface",
                      badge.severity === "critical" && "bg-red-600",
                      badge.severity === "warn" && "bg-amber-500",
                      badge.severity === "info" && "bg-accent",
                    )}
                  />
                )}
              </span>
              <span className="max-w-[72px] truncate text-[11px] font-medium leading-tight">
                {label}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-accent",
                  "transition-opacity duration-200",
                  isOnPath || isFocused ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>

      <nav
        aria-label="Mobile navigation"
        className="flex-1 overflow-y-auto px-3 py-3"
      >
        {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props -- spec requires aria-expanded on the sub-region to mirror disclosure semantics */}
        <div
          id={subRegionId}
          role="region"
          aria-label={activeSection?.label ?? "Pillar items"}
          aria-expanded={activeSection !== null}
          hidden={activeSection === null}
        >
          {activeSection && (
            <>
              {activeSection.label && (
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
                  {activeSection.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {activeSection.items.map((item) => {
                  const isActive = itemMatchesPath(item.href, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onItemClick}
                        aria-label={navItemAriaLabel(item)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-md px-3 py-3 text-sm",
                          "transition-colors duration-200 ease-smooth",
                          isActive
                            ? "bg-surface-muted text-text"
                            : "text-text-muted hover:bg-surface-muted hover:text-text",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "h-1 w-1 rounded-full transition-colors",
                            isActive
                              ? "bg-accent"
                              : "bg-border-strong group-hover:bg-accent",
                          )}
                        />
                        <span className="flex-1">{item.label}</span>
                        <NavItemBadge item={item} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        {legacySections.length > 0 && (
          <div
            className={cn(
              activeSection !== null && "mt-4 border-t border-border/40 pt-3",
            )}
          >
            <NavSections
              sections={legacySections}
              onItemClick={onItemClick}
              variant="drawer"
            />
          </div>
        )}
      </nav>
    </div>
  );
}

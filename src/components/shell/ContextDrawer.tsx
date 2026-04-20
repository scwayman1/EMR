"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { NavItemBadge, navItemAriaLabel } from "./NavSections";
import { itemMatchesPath, type NavSection } from "./nav-sections";

export interface ContextDrawerProps {
  section: NavSection | null;
  pathname: string;
  onClose: () => void;
}

export function ContextDrawer({ section, pathname, onClose }: ContextDrawerProps) {
  const open = section !== null;
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ref.current && ref.current.contains(target)) return;
      const el = target as HTMLElement;
      if (el.closest?.("[data-nav-rail]")) return;
      onClose();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={section?.label ?? "Navigation"}
      aria-hidden={!open}
      className={cn(
        "hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-surface",
        "transition-all duration-200 ease-smooth",
        open ? "opacity-100" : "pointer-events-none w-0 border-r-0 opacity-0",
      )}
    >
      {section && (
        <>
          <div className="px-4 pt-6 pb-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
              {section.label ?? "Menu"}
            </p>
          </div>
          <nav
            aria-label={`${section.label ?? "Pillar"} navigation`}
            className="flex-1 overflow-y-auto px-2 pb-4"
          >
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = itemMatchesPath(item.href, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-label={navItemAriaLabel(item)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm",
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
          </nav>
        </>
      )}
    </div>
  );
}

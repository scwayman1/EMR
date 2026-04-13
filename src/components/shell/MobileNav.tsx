"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "./AppShell";

interface MobileNavProps {
  nav: NavItem[];
}

export function MobileNav({ nav }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);

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

        {/* Nav items */}
        <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const count = item.count ?? 0;
              const tone = item.countTone ?? "highlight";
              const toneClass =
                tone === "danger"
                  ? "bg-danger/10 text-danger border-danger/30 animate-pulse"
                  : tone === "accent"
                    ? "bg-accent-soft text-accent border-accent/25"
                    : "bg-highlight-soft text-[color:var(--highlight-hover)] border-highlight/30";
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeDrawer}
                    aria-label={
                      count > 0
                        ? `${item.label} (${count} waiting)`
                        : item.label
                    }
                    className={cn(
                      "group flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-md text-sm text-text-muted",
                      "hover:bg-surface-muted hover:text-text transition-colors duration-200 ease-smooth"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 rounded-full bg-border-strong group-hover:bg-accent transition-colors"
                    />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "text-[10px] font-semibold leading-none rounded-full border px-1.5 py-0.5 tabular-nums",
                          toneClass
                        )}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}

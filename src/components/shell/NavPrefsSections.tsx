"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useNavPrefs } from "./NavPrefsContext";
import { PinButton } from "./PinButton";

/**
 * Renders the two personalization strips at the top of the sidebar:
 *
 *   PINNED — routes the user starred. Empty state shows a subtle hint.
 *   RECENT — last 5 distinct visited routes. Empty → render nothing.
 *
 * Styling deliberately mirrors a labeled NavSection header so the rail
 * reads as one continuous IA. Items are NOT collapsible (these strips are
 * always short). A "Manage" action clears both lists.
 */

function SectionHeader({
  label,
  action,
}: {
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
        {label}
      </span>
      {action}
    </div>
  );
}

function Row({
  href,
  label,
  isActive,
  showPin,
}: {
  href: string;
  label: string;
  isActive: boolean;
  showPin: boolean;
}) {
  return (
    <Link
      href={href}
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
      <span className="flex-1 truncate">{label}</span>
      {showPin && <PinButton href={href} label={label} visibility="hover" />}
    </Link>
  );
}

export function NavPrefsSections() {
  const prefs = useNavPrefs();
  const pathname = usePathname() ?? "";
  if (!prefs) return null;

  const { pins, recents, hydrated, clearAll } = prefs;

  const hasAny = pins.length > 0 || recents.length > 0;

  // Pre-hydration render must match the server (empty). The provider flips
  // `hydrated` in its mount effect; until then render a silent placeholder
  // so the rail layout doesn't jump.
  if (!hydrated) {
    return <div aria-hidden="true" className="space-y-3" />;
  }

  const manageAction = hasAny ? (
    <button
      type="button"
      onClick={clearAll}
      className="text-[10px] uppercase tracking-wider text-text-subtle hover:text-text transition-colors"
      aria-label="Clear pinned and recent"
      title="Clear pinned and recent"
    >
      Manage
    </button>
  ) : null;

  return (
    <div className="space-y-3 mb-3">
      {/* PINNED */}
      <div>
        <SectionHeader label="Pinned" action={manageAction} />
        {pins.length === 0 ? (
          <p className="px-3 pb-1 text-[11px] leading-snug text-text-subtle italic">
            ⌘K + star any page to pin it
          </p>
        ) : (
          <ul className="space-y-0.5 pl-1">
            {pins.map((p) => (
              <li key={p.href}>
                <Row
                  href={p.href}
                  label={p.label}
                  isActive={
                    pathname === p.href || pathname.startsWith(p.href + "/")
                  }
                  showPin
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* RECENT — silent when empty. */}
      {recents.length > 0 && (
        <div className="pt-3 border-t border-border/40">
          <SectionHeader label="Recent" />
          <ul className="space-y-0.5 pl-1">
            {recents.map((r) => (
              <li key={r.href}>
                <Row
                  href={r.href}
                  label={r.label}
                  isActive={
                    pathname === r.href || pathname.startsWith(r.href + "/")
                  }
                  showPin
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
 *            Each pinned row exposes up/down arrows on hover so the user
 *            can rank them; arrows are hidden when only one pin exists.
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

function ReorderButton({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: "up" | "down";
  disabled: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md text-text-subtle",
        "transition-all duration-150 ease-smooth",
        "hover:bg-surface-muted hover:text-text",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-subtle",
        // Hidden by default, revealed on row hover/focus. The pin button uses
        // the same pattern so the controls appear as a single hover cluster.
        "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
      )}
    >
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
      >
        {direction === "up" ? (
          <polyline points="18 15 12 9 6 15" />
        ) : (
          <polyline points="6 9 12 15 18 9" />
        )}
      </svg>
    </button>
  );
}

function PinnedRow({
  href,
  label,
  isActive,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  href: string;
  label: string;
  isActive: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const stopAndRun = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-1 px-3 py-2 rounded-md text-sm transition-colors duration-200 ease-smooth",
        isActive
          ? "bg-surface-muted text-text"
          : "text-text-muted hover:bg-surface-muted hover:text-text",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1 w-1 rounded-full transition-colors mr-1.5",
          isActive ? "bg-accent" : "bg-border-strong group-hover:bg-accent",
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {(canMoveUp || canMoveDown) && (
        <>
          <ReorderButton
            direction="up"
            disabled={!canMoveUp}
            onClick={stopAndRun(onMoveUp)}
            label={`Move ${label} up`}
          />
          <ReorderButton
            direction="down"
            disabled={!canMoveDown}
            onClick={stopAndRun(onMoveDown)}
            label={`Move ${label} down`}
          />
        </>
      )}
      <PinButton href={href} label={label} visibility="hover" />
    </Link>
  );
}

function RecentRow({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
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
      <PinButton href={href} label={label} visibility="hover" />
    </Link>
  );
}

export function NavPrefsSections() {
  const prefs = useNavPrefs();
  const pathname = usePathname() ?? "";
  if (!prefs) return null;

  const { pins, recents, hydrated, clearAll, movePin } = prefs;

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
            {pins.map((p, idx) => (
              <li key={p.href}>
                <PinnedRow
                  href={p.href}
                  label={p.label}
                  isActive={
                    pathname === p.href || pathname.startsWith(p.href + "/")
                  }
                  canMoveUp={idx > 0}
                  canMoveDown={idx < pins.length - 1}
                  onMoveUp={() => movePin(p.href, "up")}
                  onMoveDown={() => movePin(p.href, "down")}
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
                <RecentRow
                  href={r.href}
                  label={r.label}
                  isActive={
                    pathname === r.href || pathname.startsWith(r.href + "/")
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

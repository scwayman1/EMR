"use client";

/**
 * Recently-viewed patients strip — Linear's recent-pages strip × Notion's
 * quick-find affordance, mounted under the main nav inside the clinician
 * layout. Pairs with `<QuickJump />` (this same folder) for the search
 * picker; the two share `src/lib/patient/recent-patients-store.ts`.
 *
 * Design notes:
 *   • Horizontal scroll, hairline border, sticky in the clinician top bar.
 *   • Per-user localStorage key — versioned + scoped to userId so a shared
 *     workstation never bleeds chips across providers.
 *   • Pinned chips stick to the left (max 3); pin/unpin via the chip X.
 *   • Empty state with a soft prompt to open the picker.
 *   • Apple-iOS feel: subtle hover lift, hairline borders, snug spacing.
 *   • Reduced-motion: instant chip animations (no Y-translate, no spring).
 */

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import {
  MAX_PINS,
  STRIP_VISIBLE,
  formatChipTimestamp,
  readRecents,
  removeRecent,
  subscribeToRecents,
  togglePin,
  type RecentPatient,
} from "@/lib/patient/recent-patients-store";
import { QuickJump, QUICK_JUMP_OPEN_EVENT } from "./quick-jump";

export interface RecentPatientsStripProps {
  userId: string;
  className?: string;
}

function splitName(name: string): { first: string; last: string } {
  const [first, ...rest] = name.split(" ");
  return { first: first ?? "", last: rest.join(" ") };
}

function openQuickJump() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(QUICK_JUMP_OPEN_EVENT));
}

export function RecentPatientsStrip({
  userId,
  className,
}: RecentPatientsStripProps) {
  const [items, setItems] = React.useState<RecentPatient[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  // Re-render every 60s so timestamps stay fresh without a heavy event bus.
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    setItems(readRecents(userId));
    setHydrated(true);
    const unsub = subscribeToRecents(userId, () =>
      setItems(readRecents(userId)),
    );
    const tick = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => {
      unsub();
      window.clearInterval(tick);
    };
  }, [userId]);

  // Avoid SSR/CSR hydration mismatch — strip is purely client-side.
  if (!hydrated) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "h-12 border-b border-border/60 bg-surface/60 backdrop-blur",
          className,
        )}
      />
    );
  }

  const visible = items.slice(0, STRIP_VISIBLE);
  const pinnedCount = items.filter((it) => it.pinnedAt !== null).length;
  const isEmpty = visible.length === 0;

  return (
    <>
      <div
        data-testid="recent-patients-strip"
        className={cn(
          // hairline border + iOS-style frosted surface
          "border-b border-border/60 bg-surface/70 backdrop-blur supports-[backdrop-filter]:bg-surface/55",
          className,
        )}
      >
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-thin">
          <span className="text-[10px] uppercase tracking-[0.14em] text-text-subtle shrink-0 mr-1">
            Recent
          </span>

          {isEmpty ? (
            <button
              type="button"
              onClick={openQuickJump}
              className={cn(
                "shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5",
                "text-xs text-text-muted bg-surface-muted/60 border border-dashed border-border",
                "hover:text-text hover:bg-surface-muted transition-colors",
              )}
            >
              <span aria-hidden="true">＋</span>
              <span>Jump to a patient to start your history</span>
            </button>
          ) : (
            <ul
              className="flex items-center gap-1.5 shrink-0"
              role="list"
              aria-label="Recently viewed patients"
            >
              {visible.map((p) => (
                <li key={p.id}>
                  <RecentChip
                    patient={p}
                    canPinMore={pinnedCount < MAX_PINS}
                    userId={userId}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="flex-1 min-w-2" aria-hidden="true" />

          <button
            type="button"
            onClick={openQuickJump}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
              "text-[11px] font-medium text-text-muted",
              "hover:text-text hover:bg-surface-muted/70 transition-colors",
            )}
            aria-label="Open patient quick-jump (g j)"
            title="Quick-jump (g j)"
          >
            <SearchIcon className="h-3.5 w-3.5" />
            <span>Find</span>
            <kbd className="hidden md:inline font-mono text-[10px] text-text-subtle bg-surface-muted px-1 py-0.5 rounded ml-0.5">
              g j
            </kbd>
          </button>

          <Link
            href="/clinic/patients"
            className="shrink-0 text-[11px] font-medium text-accent hover:underline px-2 py-1"
          >
            View all →
          </Link>
        </div>
      </div>

      <QuickJump />
    </>
  );
}

/* ───────────────────────────────────────── chip */

function RecentChip({
  patient,
  canPinMore,
  userId,
}: {
  patient: RecentPatient;
  canPinMore: boolean;
  userId: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const { first, last } = splitName(patient.name);
  const isPinned = patient.pinnedAt !== null;

  const handleSecondary = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPinned) {
      togglePin(userId, patient.id);
      return;
    }
    // Unpinned: try to pin (until cap); if cap reached, dismiss instead.
    if (canPinMore) {
      togglePin(userId, patient.id);
    } else {
      removeRecent(userId, patient.id);
    }
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
      whileHover={reduce ? undefined : { y: -1 }}
      className="relative group"
    >
      <Link
        href={`/clinic/patients/${patient.id}`}
        className={cn(
          "inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full",
          "bg-surface border border-border",
          "hover:border-border-strong hover:shadow-sm transition-all",
          isPinned && "ring-1 ring-accent/30 border-accent/40",
        )}
      >
        <Avatar
          firstName={first}
          lastName={last}
          size="sm"
          src={patient.avatarUrl ?? undefined}
        />
        <span className="flex flex-col leading-tight">
          <span className="text-xs font-medium text-text truncate max-w-[140px]">
            {patient.name}
          </span>
          <span className="text-[10px] text-text-subtle">
            {isPinned ? "Pinned" : formatChipTimestamp(patient.viewedAt)}
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={handleSecondary}
        title={
          isPinned
            ? "Unpin"
            : canPinMore
            ? `Pin (max ${MAX_PINS})`
            : "Dismiss"
        }
        aria-label={
          isPinned
            ? `Unpin ${patient.name}`
            : canPinMore
            ? `Pin ${patient.name} (max ${MAX_PINS} pins)`
            : `Dismiss ${patient.name}`
        }
        className={cn(
          "absolute -top-1 -right-1 h-4 w-4 rounded-full",
          "bg-surface border border-border text-[9px] leading-none",
          "text-text-muted hover:text-text hover:border-border-strong",
          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
          "flex items-center justify-center",
        )}
      >
        {isPinned ? "📌" : canPinMore ? "+" : "×"}
      </button>
    </motion.div>
  );
}

/* ───────────────────────────────────────── tiny inline icon */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M13.5 13.5L10.5 10.5" />
    </svg>
  );
}

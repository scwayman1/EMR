"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A 6px pulsing dot rendered on nav rows where an AI agent is currently
 * working. Additive-only — lives next to the existing count/semantic badge
 * without replacing either.
 *
 *   "active" — emerald-400 — an agent is producing something that will want
 *              human attention when it lands (e.g. a draft message for sign-off).
 *   "info"   — sky-400     — a passive observer is scanning in the background;
 *              no action pending.
 *
 * Tailwind's `animate-pulse` keeps the visual language consistent with the
 * existing danger-count pill (which also pulses via the same utility).
 */
export type NavActivityTone = "info" | "active";

const TONE_CLASS: Record<NavActivityTone, string> = {
  active: "bg-emerald-400",
  info: "bg-sky-400",
};

export function NavActivityDot({ tone }: { tone: NavActivityTone }) {
  return (
    <span
      role="status"
      aria-label="AI agent working here"
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full animate-pulse",
        TONE_CLASS[tone],
      )}
    />
  );
}

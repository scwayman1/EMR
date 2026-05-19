import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * EMR-638 — Leaf status indicator primitive.
 *
 * Three-stop traffic-light using leaf emojis so the system feels native to the
 * Leafjourney brand rather than a generic red/yellow/green dot. Renders an
 * inline-block span with `title` (desktop hover tooltip) and `aria-label`
 * (screen-reader text) so the meaning of the colour is never lost.
 *
 *  🍃 green  — within safe range
 *  🍂 yellow — caution, review recommended
 *  🍁 red    — out of safe range / urgent
 *
 * Future feature PRs will swap in this primitive everywhere a status dot is
 * currently emitted ad-hoc (lab tooltip, dosing range badges, vitals strips).
 */

export type LeafStatusLevel = "green" | "yellow" | "red";
export type LeafStatusSize = "sm" | "md" | "lg";

export interface LeafStatusProps {
  status: LeafStatusLevel;
  /** Optional tooltip + aria-label override. Defaults below per level. */
  label?: string;
  size?: LeafStatusSize;
  className?: string;
}

export const LEAF_STATUS_EMOJI: Record<LeafStatusLevel, string> = {
  green: "🍃",
  yellow: "🍂",
  red: "🍁",
};

export const LEAF_STATUS_DEFAULT_LABEL: Record<LeafStatusLevel, string> = {
  green: "Green — within safe range",
  yellow: "Yellow — caution, review recommended",
  red: "Red — out of safe range / urgent",
};

const SIZE_CLASSES: Record<LeafStatusSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

export function LeafStatus({
  status,
  label,
  size = "md",
  className,
}: LeafStatusProps): React.ReactElement {
  const tooltip = label ?? LEAF_STATUS_DEFAULT_LABEL[status];
  const emoji = LEAF_STATUS_EMOJI[status];
  return (
    <span
      role="img"
      aria-label={tooltip}
      title={tooltip}
      data-leaf-status={status}
      className={cn("inline-block leading-none select-none", SIZE_CLASSES[size], className)}
    >
      {emoji}
    </span>
  );
}

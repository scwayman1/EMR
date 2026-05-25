"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { TAG_COLOR_CLASSES, type PatientTag } from "@/lib/domain/patient-tags";

// ---------------------------------------------------------------------------
// TagPill — small rounded pill for a colored label.
//
// Shares its color tokens with the existing PatientTagBadge so a tag rendered
// in the roster, the smart inbox, and a chart task all read as the same color.
// Light + dark mode safe because `TAG_COLOR_CLASSES` uses Tailwind's
// `bg-{color}-100 / text-{color}-700` shades that flip via Tailwind dark
// variants where applied.
// ---------------------------------------------------------------------------

export type TagColor = PatientTag["color"];

export interface TagPillProps {
  /** Visible label. */
  label: string;
  /** Color name from the `PatientTag` palette. Defaults to neutral gray. */
  color?: TagColor;
  /** Pill size — `sm` for inline lists, `md` for headers / detail surfaces. */
  size?: "sm" | "md";
  /** Optional remove handler — renders a × button when provided. */
  onRemove?: () => void;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<TagPillProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-[10.5px]",
  md: "px-2.5 py-1 text-xs",
};

/**
 * Small colored pill. Use anywhere a tag is rendered (patient roster,
 * inbox thread headers, chart tasks, broadcast cards).
 */
export function TagPill({
  label,
  color = "gray",
  size = "sm",
  onRemove,
  className,
}: TagPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium tracking-wide",
        "max-w-[160px] whitespace-nowrap",
        SIZE_CLASSES[size],
        TAG_COLOR_CLASSES[color],
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-current opacity-60 hover:opacity-100 hover:bg-black/10"
        >
          ×
        </button>
      )}
    </span>
  );
}

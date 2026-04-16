"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { TAG_COLOR_CLASSES, type PatientTag } from "@/lib/domain/patient-tags";

interface PatientTagBadgeProps {
  tag: PatientTag;
  onRemove?: () => void;
  className?: string;
}

/**
 * Small colored chip for a patient tag/label.
 * Colors come from TAG_COLOR_CLASSES in `@/lib/domain/patient-tags`.
 */
export function PatientTagBadge({ tag, onRemove, className }: PatientTagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 pl-2.5 pr-2 py-0.5 text-[11px] font-medium rounded-full border tracking-wide",
        TAG_COLOR_CLASSES[tag.color],
        className,
      )}
      title={tag.description}
    >
      <span>{tag.label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full opacity-70 hover:opacity-100 hover:bg-black/5"
          aria-label={`Remove ${tag.label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/**
 * Tile — the fundamental unit of the Clinical Command Center.
 *
 * Apple-ish aesthetic: generous radius, soft shadow, warm surface, quiet
 * hover lift. A Tile knows how big it is in the grid (via `span`), carries
 * its own title + optional eyebrow + optional action, and otherwise gets
 * out of the way so feature content can breathe.
 *
 * When `href` is set the whole tile is clickable; otherwise it's static.
 */

type TileSpan = "1x1" | "2x1" | "1x2" | "2x2" | "3x1" | "3x2";

type TileTone = "default" | "accent" | "calm" | "warm";

const SPAN_CLASSES: Record<TileSpan, string> = {
  "1x1": "md:col-span-1 md:row-span-1",
  "2x1": "md:col-span-2 md:row-span-1",
  "1x2": "md:col-span-1 md:row-span-2",
  "2x2": "md:col-span-2 md:row-span-2",
  "3x1": "md:col-span-3 md:row-span-1",
  "3x2": "md:col-span-3 md:row-span-2",
};

const TONE_CLASSES: Record<TileTone, string> = {
  default: "bg-surface border-border/80",
  accent: "bg-accent-soft/40 border-accent/20",
  calm: "bg-[var(--highlight-soft)]/40 border-highlight/20",
  warm: "bg-surface-raised border-border",
};

export interface TileProps {
  title: string;
  eyebrow?: string;
  description?: string;
  href?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  span?: TileSpan;
  tone?: TileTone;
  children?: React.ReactNode;
  className?: string;
}

export function Tile({
  title,
  eyebrow,
  description,
  href,
  action,
  icon,
  span = "1x1",
  tone = "default",
  children,
  className,
}: TileProps) {
  const body = (
    <div
      className={cn(
        "group relative h-full rounded-2xl border shadow-sm",
        "transition-all duration-200 ease-smooth",
        "flex flex-col overflow-hidden",
        TONE_CLASSES[tone],
        href && "hover:shadow-md hover:-translate-y-0.5 hover:border-border-strong cursor-pointer",
        SPAN_CLASSES[span],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-subtle">
              {eyebrow}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {icon && (
              <span className="text-xl leading-none" aria-hidden="true">
                {icon}
              </span>
            )}
            <h3 className="font-display text-base font-medium text-text tracking-tight truncate">
              {title}
            </h3>
          </div>
          {description && (
            <p className="text-xs text-text-muted mt-1.5 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {children && <div className="flex-1 min-h-0 px-5 pb-5">{children}</div>}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn("block h-full", SPAN_CLASSES[span])}
        aria-label={title}
      >
        {body}
      </Link>
    );
  }

  return body;
}

/**
 * Empty-state body for a Tile that hasn't been built yet. Keeps the
 * placeholder honest — the tile shows up, has the right shape, but
 * clearly signals that the feature is coming.
 */
export function TilePlaceholder({ note }: { note?: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center py-10 text-center gap-2">
      <div
        aria-hidden="true"
        className="h-8 w-8 rounded-full border-2 border-dashed border-border-strong/50"
      />
      <p className="text-xs text-text-subtle italic">
        {note ?? "Coming in the next slice"}
      </p>
    </div>
  );
}

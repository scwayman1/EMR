import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Small decorative flourishes — used as section dividers, empty state
 * garnishes, and eyebrow ornaments. All pure SVG, scale-independent.
 */

export function LeafSprig({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      <path
        d="M12 4.5 C 15 8, 15 13.5, 12 19.5 C 9 13.5, 9 8, 12 4.5 Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.5 L12 18"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M12 10 L10.3 9 M12 10 L13.7 9 M12 13 L10 12 M12 13 L14 12"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  );
}

/** Horizontal editorial divider: thin line – dot – tiny leaf – dot – line. */
export function EditorialRule({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-accent/60 select-none",
        className
      )}
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border-strong/60 to-border-strong/60" />
      <span className="h-1 w-1 rounded-full bg-current" />
      <LeafSprig size={14} className="text-current" />
      <span className="h-1 w-1 rounded-full bg-current" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-border-strong/60 to-border-strong/60" />
    </div>
  );
}

/** Compact tab-style "Eyebrow" label with a leaf leading glyph. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-accent",
        className
      )}
    >
      <LeafSprig size={12} className="text-current opacity-80" />
      {children}
    </p>
  );
}

/**
 * Small abstract composition used for empty states — a soft mist circle
 * with a single botanical stem rising out of it.
 */
export function EmptyIllustration({
  size = 120,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="empty-mist" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="var(--accent-soft)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent-soft)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="70" r="48" fill="url(#empty-mist)" />
      <path
        d="M60 92 Q 62 64, 68 44"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M68 44 C 74 40, 78 44, 78 50 C 74 52, 70 50, 68 44 Z"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M64 58 C 58 54, 54 56, 54 62 C 58 64, 62 62, 64 58 Z"
        fill="currentColor"
        opacity="0.45"
      />
      <circle cx="44" cy="36" r="2" fill="var(--highlight)" opacity="0.7" />
      <circle cx="92" cy="52" r="1.5" fill="var(--highlight)" opacity="0.55" />
      <circle cx="24" cy="74" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

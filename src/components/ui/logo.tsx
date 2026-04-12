import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The brand mark. A rounded forest square with a carved-out botanical
 * leaf silhouette and a subtle central vein. Intentionally abstract —
 * "botanical apothecary" more than "literal cannabis".
 */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-strong)" />
        </linearGradient>
      </defs>
      {/* rounded-square seal */}
      <rect width="32" height="32" rx="9" fill="url(#logo-fill)" />
      {/* leaf silhouette, carved out */}
      <path
        d="M16 6.5
           C 19.8 10.5, 20.4 16.8, 16 25.5
           C 11.6 16.8, 12.2 10.5, 16 6.5 Z"
        fill="#FEFCF6"
      />
      {/* central vein */}
      <path
        d="M16 8.5 L16 23.2"
        stroke="var(--accent)"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      {/* small side veins */}
      <path
        d="M16 13 L13.6 11.8 M16 13 L18.4 11.8 M16 17 L13.2 15.6 M16 17 L18.8 15.6"
        stroke="var(--accent)"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

/**
 * Full wordmark — mark + display-serif wordmark beside it.
 * Used in the top of each shell and on marketing/auth surfaces.
 */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const markSize = size === "sm" ? 26 : size === "lg" ? 40 : 32;
  const textClass =
    size === "sm"
      ? "text-[15px] leading-none"
      : size === "lg"
        ? "text-[22px] leading-none"
        : "text-[17px] leading-none";
  const subClass =
    size === "sm" ? "text-[9px]" : size === "lg" ? "text-[11px]" : "text-[10px]";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={markSize} />
      <div className="flex flex-col gap-[3px]">
        <span className={cn("font-display text-text tracking-tight", textClass)}>
          Leafjourney
        </span>
        <span
          className={cn(
            "uppercase tracking-[0.18em] text-text-subtle font-medium",
            subClass
          )}
        >
          Health
        </span>
      </div>
    </div>
  );
}

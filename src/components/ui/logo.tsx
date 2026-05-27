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
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      <path d="M 32 50 L 32 20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
      <path d="M 32 30 Q 22 28 18 18 Q 28 18 32 28 Z" fill="currentColor"/>
      <path d="M 32 26 Q 42 22 46 12 Q 36 12 32 22 Z" fill="currentColor"/>
      <circle cx="32" cy="50" r="2.4" fill="currentColor"/>
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
        : "text-[18px] leading-none";
  const subClass =
    size === "sm" ? "text-[8px]" : size === "lg" ? "text-[10px]" : "text-[9px]";

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark size={markSize} />
      <div className="flex flex-col items-start">
        <span className={cn("font-display text-text tracking-[-0.02em] font-medium", textClass)}>
          Leafjourney
        </span>
        <span
          className={cn(
            "uppercase tracking-[0.22em] text-text-subtle/70 font-medium mt-[1px]",
            subClass
          )}
        >
          health
        </span>
      </div>
    </div>
  );
}

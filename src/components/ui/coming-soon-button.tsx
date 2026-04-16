import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium border bg-surface text-text-subtle border-border " +
  "cursor-not-allowed select-none transition-none";

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

/**
 * A visibly-disabled button used for affordances that aren't built
 * yet. Renders the action label, a small "Soon" tag, and a native
 * tooltip explaining why it's inert. Use this instead of a real
 * disabled <Button> so users get an honest reaction on hover and
 * the visual signal is distinct from a stateful disable.
 */
export function ComingSoonButton({
  children,
  size = "md",
  className,
  title = "Coming in a future release",
  ...props
}: {
  children: React.ReactNode;
  size?: Size;
  className?: string;
  title?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "size">) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={title}
      className={cn(BASE, SIZES[size], className)}
      {...props}
    >
      {children}
      <span className="ml-1 inline-flex items-center rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
        Soon
      </span>
    </button>
  );
}

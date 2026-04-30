"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Omit `title` from the underlying HTMLDivElement attributes so our
// ReactNode-shaped title prop isn't intersected with the native
// string-only `title` tooltip attribute (which would narrow the type
// down to `string` and reject ReactElement children at the call site).
type CollapsibleProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  title: React.ReactNode;
  /** Optional subtitle/meta line shown beside the title (right-aligned). */
  meta?: React.ReactNode;
  /** Initial open state when uncontrolled. Defaults to closed. */
  defaultOpen?: boolean;
  /** Controlled open state — pair with onOpenChange. */
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  /** Surface tone — uses card-equivalent surface tokens. */
  tone?: "default" | "muted" | "raised";
};

/**
 * Disclosure / collapsible primitive used across the clinician chart for
 * outcome timelines, sign-off queues, and per-product check-in stacks.
 * Keyboard-accessible (button toggle + aria-expanded), animation via
 * grid-template-rows so content height is auto without measuring.
 */
export function Collapsible({
  title,
  meta,
  defaultOpen = false,
  open: controlled,
  onOpenChange,
  tone = "default",
  children,
  className,
  ...rest
}: CollapsibleProps) {
  const [internal, setInternal] = React.useState(defaultOpen);
  const open = controlled ?? internal;

  const toggle = () => {
    const next = !open;
    if (controlled === undefined) setInternal(next);
    onOpenChange?.(next);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border overflow-hidden",
        tone === "muted" && "bg-surface-muted/40",
        tone === "raised" && "bg-surface-raised",
        tone === "default" && "bg-surface",
        className
      )}
      {...rest}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted/40 transition-colors"
      >
        <Caret open={open} />
        <div className="flex-1 min-w-0 text-sm font-medium text-text">{title}</div>
        {meta && <div className="text-[11px] text-text-subtle shrink-0">{meta}</div>}
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 border-t border-border/40">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "shrink-0 text-text-subtle transition-transform",
        open && "rotate-90"
      )}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

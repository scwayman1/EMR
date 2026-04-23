import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "highlight";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-text-muted border-border-strong/50",
  accent: "bg-accent-soft text-accent border-accent/20",
  success: "bg-[color:var(--accent-soft)] text-success border-[color:var(--success)]/20",
  warning: "bg-highlight-soft text-[color:var(--highlight-hover)] border-highlight/25",
  danger: "bg-red-50 text-danger border-red-200",
  info: "bg-blue-50 text-info border-blue-200",
  highlight: "bg-highlight-soft text-[color:var(--highlight-hover)] border-highlight/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border tracking-wide",
        TONES[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

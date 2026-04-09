import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-text-muted border-border",
  accent: "bg-accent-soft text-accent border-accent/20",
  success: "bg-emerald-50 text-success border-emerald-200",
  warning: "bg-amber-50 text-warning border-amber-200",
  danger: "bg-red-50 text-danger border-red-200",
  info: "bg-blue-50 text-info border-blue-200",
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
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border",
        TONES[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

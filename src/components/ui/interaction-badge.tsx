import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Severity = "red" | "yellow" | "green";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; dot: string; badge: string }
> = {
  red: {
    label: "Contraindicated",
    dot: "bg-[color:var(--danger)]",
    badge: "bg-red-50 text-danger border-red-200",
  },
  yellow: {
    label: "Caution",
    dot: "bg-[color:var(--highlight)]",
    badge:
      "bg-highlight-soft text-[color:var(--highlight-hover)] border-highlight/30",
  },
  green: {
    label: "Safe",
    dot: "bg-[color:var(--success)]",
    badge: "bg-accent-soft text-success border-[color:var(--success)]/20",
  },
};

export function InteractionBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full border tracking-wide",
        config.badge,
        className
      )}
    >
      <span
        className={cn("h-2 w-2 rounded-full shrink-0", config.dot)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

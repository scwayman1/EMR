import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function MetricTile({
  label,
  value,
  delta,
  hint,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  hint?: string;
  accent?: "forest" | "amber" | "none";
  className?: string;
}) {
  const accentClass =
    accent === "forest"
      ? "before:bg-accent"
      : accent === "amber"
        ? "before:bg-highlight"
        : "before:bg-border-strong/50";

  return (
    <div
      className={cn(
        "relative bg-surface-raised border border-border rounded-xl p-5 shadow-sm overflow-hidden",
        "before:content-[''] before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[3px] before:rounded-r-full",
        accentClass,
        className
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-3xl font-medium text-text tabular-nums leading-none">
          {value}
        </span>
        {delta && (
          <span className="text-xs text-text-muted tabular-nums">{delta}</span>
        )}
      </div>
      {hint && <p className="text-xs text-text-subtle mt-2">{hint}</p>}
    </div>
  );
}

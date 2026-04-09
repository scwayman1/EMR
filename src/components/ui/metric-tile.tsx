import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function MetricTile({
  label,
  value,
  delta,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg p-5 shadow-sm",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-text tabular-nums">
          {value}
        </span>
        {delta && (
          <span className="text-xs text-text-muted tabular-nums">{delta}</span>
        )}
      </div>
      {hint && <p className="text-xs text-text-subtle mt-1.5">{hint}</p>}
    </div>
  );
}

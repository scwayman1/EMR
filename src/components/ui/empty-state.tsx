import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { EmptyIllustration } from "./ornament";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-12 rounded-xl border border-dashed border-border-strong/60 bg-surface/60",
        className
      )}
    >
      <div className="mb-1">{icon ?? <EmptyIllustration size={96} />}</div>
      <h3 className="font-display text-lg text-text">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted mt-2 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

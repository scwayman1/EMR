import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8",
        className
      )}
    >
      <div>
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold text-text tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-text-muted mt-1.5 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageShell({
  children,
  maxWidth = "max-w-[1200px]",
  className,
}: {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("px-6 lg:px-10 py-8", className)}>
      <div className={cn("mx-auto w-full", maxWidth)}>{children}</div>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Eyebrow } from "@/components/ui/ornament";

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
        "flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10",
        className
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
          {title}
        </h1>
        {description && (
          <p className="text-[15px] text-text-muted mt-3 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
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
    <div className={cn("px-6 lg:px-12 py-10", className)}>
      <div className={cn("mx-auto w-full", maxWidth)}>{children}</div>
    </div>
  );
}

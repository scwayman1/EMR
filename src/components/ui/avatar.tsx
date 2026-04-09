import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({
  firstName,
  lastName,
  size = "md",
  className,
}: {
  firstName: string;
  lastName: string;
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-accent-soft text-accent font-medium select-none",
        SIZES[size],
        className
      )}
      aria-hidden="true"
    >
      {initials(firstName, lastName)}
    </div>
  );
}

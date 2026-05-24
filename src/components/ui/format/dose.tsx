// <Dose> — render medication dose amounts (`100 mg`, `5 mL`, `1 tab`).
//
// Wraps `dose()` from src/lib/ui/format. Tabular numerals so dose columns
// align in med lists.

import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { dose, type DoseUnit } from "@/lib/ui/format";

export interface DoseProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number | null | undefined;
  unit: DoseUnit | null | undefined;
}

export function Dose({ value, unit, className, ...rest }: DoseProps) {
  return (
    <span
      data-component="dose"
      className={cn("tabular-nums", className)}
      {...rest}
    >
      {dose(value, unit)}
    </span>
  );
}

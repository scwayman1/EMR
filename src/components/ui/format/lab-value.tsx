// <LabValue> — render a lab result with an optional out-of-range flag chip.
//
// Wraps `lab()` from src/lib/ui/format. The chip is:
//   - ▲ red when above the reference range
//   - ▼ blue when below
//   - nothing when in-range or no range provided
//
// The flag chip exposes an `aria-label` ("Above reference range" / "Below
// reference range") so screen-reader users get the same signal as sighted
// ones. Numbers render tabular for column alignment.

import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { lab, labFlagAriaLabel, type LabFlag } from "@/lib/ui/format";

export interface LabValueProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number | null | undefined;
  unit?: string | null;
  refLow?: number | null;
  refHigh?: number | null;
  /** Hide the chip even if out-of-range (e.g. inside a table that flags rows). */
  hideFlag?: boolean;
  /** Override the resolved flag (rare — useful when upstream has done the math). */
  flag?: LabFlag;
}

function FlagChip({ flag }: { flag: Exclude<LabFlag, null | "normal"> }) {
  const label = labFlagAriaLabel(flag);
  if (flag === "high") {
    return (
      <span
        role="img"
        aria-label={label}
        className="inline-flex items-center justify-center text-[10px] leading-none px-1 py-0.5 ml-1 rounded bg-red-50 text-danger font-medium"
      >
        ▲
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      className="inline-flex items-center justify-center text-[10px] leading-none px-1 py-0.5 ml-1 rounded bg-blue-50 text-blue-700 font-medium"
    >
      ▼
    </span>
  );
}

export function LabValue({
  value,
  unit,
  refLow,
  refHigh,
  hideFlag,
  flag: flagOverride,
  className,
  ...rest
}: LabValueProps) {
  const result = lab(value, unit ?? undefined, refLow, refHigh);
  const flag = flagOverride ?? result.flag;

  return (
    <span
      data-component="lab-value"
      data-flag={flag ?? "none"}
      className={cn("tabular-nums inline-flex items-baseline", className)}
      {...rest}
    >
      <span
        className={cn(
          flag === "high" && "text-danger font-medium",
          flag === "low" && "text-blue-700 font-medium",
        )}
      >
        {result.display}
      </span>
      {!hideFlag && (flag === "high" || flag === "low") && <FlagChip flag={flag} />}
    </span>
  );
}

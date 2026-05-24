// <Money> — render integer cents as USD with consistent formatting.
//
// Wraps `money()` from src/lib/ui/format. Applies `tabular-nums` so columns
// of numbers line up. Negative values render with a red tint by default;
// callers can override with `tone="neutral"` if the sign is conveyed elsewhere.

import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { money, moneyTone, type MoneyOpts } from "@/lib/ui/format";

export interface MoneyProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Integer cents. `null`/`undefined`/`NaN` renders as `—`. */
  cents: number | null | undefined;
  /** Format options forwarded to `money()`. */
  options?: MoneyOpts;
  /**
   * Visual tone. Defaults to `"auto"` — negative values get a red tint and
   * everything else renders in the surrounding text color.
   */
  tone?: "auto" | "neutral" | "negative" | "positive";
}

export function Money({
  cents,
  options,
  tone = "auto",
  className,
  ...rest
}: MoneyProps) {
  const display = money(cents, options);
  const resolvedTone =
    tone === "auto" ? (moneyTone(cents) === "negative" ? "negative" : "neutral") : tone;

  return (
    <span
      data-component="money"
      className={cn(
        "tabular-nums",
        resolvedTone === "negative" && "text-danger",
        resolvedTone === "positive" && "text-success",
        className,
      )}
      {...rest}
    >
      {display}
    </span>
  );
}

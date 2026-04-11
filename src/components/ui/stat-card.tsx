import * as React from "react";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils/cn";

/**
 * Shared StatCard component used across the operator dashboards.
 *
 * Replaces 6 inline copies in /ops/schedule, /ops/billing, /ops/revenue,
 * /ops/scrub, /ops/denials, /ops/aging. Single source of truth for the
 * stat card visual language.
 */

export type StatCardTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "primary"
  | "info"
  | "highlight";

const TONE_COLORS: Record<StatCardTone, string> = {
  neutral: "text-text",
  accent: "text-accent",
  success: "text-success",
  warning: "text-[color:var(--warning)]",
  danger: "text-danger",
  primary: "text-text",
  info: "text-[color:var(--info)]",
  highlight: "text-[color:var(--highlight)]",
};

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatCardTone;
  /** Override the value font size — defaults to 3xl */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  size = "lg",
  className,
}: StatCardProps) {
  return (
    <Card tone="raised" className={className}>
      <CardContent className="pt-5 pb-5">
        <p className="text-xs text-text-subtle uppercase tracking-wider">
          {label}
        </p>
        <p
          className={cn(
            "font-display tabular-nums mt-1",
            SIZE_CLASSES[size],
            TONE_COLORS[tone],
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="text-[10px] text-text-subtle mt-1.5">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

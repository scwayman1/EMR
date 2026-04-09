import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Base card. Warm surface with a hairline border. Supports a `tone`
 * variant for subtle ambient / raised visual treatments.
 */
type Tone = "default" | "raised" | "ambient" | "outlined";

const TONES: Record<Tone, string> = {
  default: "bg-surface border border-border/80 shadow-sm",
  raised: "bg-surface-raised border border-border shadow-md",
  ambient: "relative overflow-hidden ambient border border-border shadow-md",
  outlined: "bg-transparent border border-dashed border-border-strong/60",
};

export function Card({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  return (
    <div
      className={cn("rounded-xl", TONES[tone], className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pt-6 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-display text-lg font-medium text-text tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-text-muted mt-1.5", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-border/60 flex items-center justify-between",
        className
      )}
      {...props}
    />
  );
}

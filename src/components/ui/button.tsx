import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "highlight";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium select-none " +
  "transition-[transform,box-shadow,background-color,border-color,color,filter] duration-200 ease-smooth " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-accent/40 focus-visible:ring-offset-surface " +
  "active:scale-[0.98] active:translate-y-[0.5px] active:shadow-sm " +
  "motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-accent to-accent-strong text-accent-ink shadow-seal " +
    "hover:from-accent/95 hover:to-accent hover:shadow-lg hover:-translate-y-[1px] hover:scale-[1.015]",
  secondary:
    "bg-surface-raised text-text border border-border-strong/70 shadow-sm " +
    "hover:bg-surface-muted hover:border-border-strong hover:shadow-md hover:-translate-y-[1px]",
  ghost:
    "bg-transparent text-text-muted hover:bg-surface-muted hover:text-text",
  danger:
    "bg-danger text-white shadow-sm " +
    "hover:brightness-110 hover:shadow-md hover:-translate-y-[1px] hover:scale-[1.015]",
  highlight:
    "bg-gradient-to-b from-highlight to-highlight-hover text-white shadow-seal " +
    "hover:from-highlight/95 hover:to-highlight hover:shadow-lg hover:-translate-y-[1px] hover:scale-[1.015]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", leadingIcon, trailingIcon, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
        {...props}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </button>
    );
  }
);
Button.displayName = "Button";

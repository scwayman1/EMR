import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-200 ease-smooth disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent/40";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent/90 shadow-sm",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-muted",
  ghost:
    "bg-transparent text-text-muted hover:bg-surface-muted hover:text-text",
  danger:
    "bg-danger text-white hover:bg-danger/90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", leadingIcon, trailingIcon, children, ...props }, ref) => {
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

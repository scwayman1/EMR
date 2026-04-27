import * as React from "react";
import { cn } from "@/lib/utils/cn";

const BASE =
  "flex w-full rounded-md border border-border-strong bg-surface px-3 text-text placeholder:text-text-subtle " +
  "transition-[border-color,box-shadow,background-color] duration-200 ease-smooth " +
  "hover:border-border-strong/100 hover:bg-surface-raised " +
  "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-surface " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(BASE, "h-10 text-sm", className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(BASE, "py-2 text-sm leading-6 resize-y", className)}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn("text-sm font-medium text-text mb-1.5 inline-block", className)}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";

export function FieldGroup({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="w-full">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-text-subtle mt-1.5">{hint}</p>
      )}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}

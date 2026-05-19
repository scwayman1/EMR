import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * EMR-586 — Reusable required-field validation primitives.
 *
 * Goal: one consistent way to surface "this field is missing" feedback across
 * patient, clinician, and owner portals. The ticket asks for:
 *   1. A small-font helper that reads exactly "please complete each field"
 *      (lowercase, per the ticket copy).
 *   2. A class utility that paints a red border + ring when invalid.
 *   3. A wrapper component that bundles helper + invalid styling so callers
 *      can opt-in with `<RequiredField error={…}>…</RequiredField>`.
 *
 * Apple-iOS aesthetic: tight spacing, no shouting; the helper is text-xs and
 * sits under the field rather than over it. Red is a tasteful 500 with a thin
 * 1px ring so it reads as "needs attention" not "system error".
 */

export const REQUIRED_FIELD_MESSAGE = "please complete each field";

/**
 * Returns the Tailwind classes that should be merged onto an `<Input>` (or any
 * field control) when it is currently invalid. Returns an empty string when
 * valid so the caller can pass the result straight to `cn(...)` without an
 * extra ternary.
 */
export function requiredFieldClasses(isInvalid: boolean): string {
  return isInvalid ? "border-red-500 ring-1 ring-red-500" : "";
}

interface RequiredFieldHelperProps {
  visible: boolean;
  /** Optional override copy. Defaults to the EMR-586 ticket message. */
  message?: string;
  className?: string;
}

/**
 * Tiny helper line rendered beneath an invalid field. Returns `null` when
 * hidden so it can be sprinkled liberally without extra wrapper divs.
 */
export function RequiredFieldHelper({
  visible,
  message = REQUIRED_FIELD_MESSAGE,
  className,
}: RequiredFieldHelperProps): React.ReactElement | null {
  if (!visible) return null;
  return (
    <p
      role="alert"
      data-required-helper
      className={cn("text-xs text-red-500 mt-1.5", className)}
    >
      {message}
    </p>
  );
}

interface RequiredFieldProps {
  /** Error message — when truthy, the field is treated as invalid. */
  error?: string;
  /** Override helper copy. Defaults to "please complete each field". */
  helperMessage?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper that pairs a field with the standard helper + invalid styling.
 *
 * It sets `data-invalid` on the surrounding div so global CSS (or descendant
 * selectors like `[data-invalid] input { ... }`) can target the red treatment
 * without each call site having to thread `requiredFieldClasses` into every
 * input. Call sites that want explicit control can still apply
 * `requiredFieldClasses` directly to the control.
 */
export function RequiredField({
  error,
  helperMessage,
  children,
  className,
}: RequiredFieldProps): React.ReactElement {
  const isInvalid = Boolean(error);
  return (
    <div
      data-invalid={isInvalid ? "true" : undefined}
      className={cn("w-full", className)}
    >
      {children}
      <RequiredFieldHelper visible={isInvalid} message={helperMessage} />
    </div>
  );
}

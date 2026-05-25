"use client";

// Stepper / Wizard primitive — pure-React, no external deps.
//
// Two pieces:
//   1. <Stepper /> — visual step indicator (horizontal default; vertical variant
//      for sidebar layouts). Mobile viewports condense to a compact
//      "Step X of Y" + dot row. Apple-iOS aesthetic: hairline connectors, the
//      active step uses the accent color, completed steps show a checkmark.
//   2. useStepper(stepCount) — headless navigation hook. The optional
//      useStepperWithValidation variant gates `next()` on a per-step validator.
//
// The primitive is intentionally form-agnostic: callers own their own form
// state (FormField from PR #462, useReducer, react-hook-form, etc). The
// stepper only tracks which step is current and exposes navigation handlers.
//
// Apple-iOS feel:
//   - Hairline (1px) connectors between pills
//   - Active pill uses accent color with a soft ring
//   - Completed pills show a Check glyph on accent fill
//   - Reduced-motion users get instant state transitions

import * as React from "react";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepperOrientation = "horizontal" | "vertical";

export type StepInput =
  | string
  | {
      label: string;
      description?: string;
      /** Force this step into the `error` state (overrides computed state). */
      hasError?: boolean;
    };

export interface StepperProps {
  /** Step labels (string) or { label, description, hasError } objects. */
  steps: ReadonlyArray<StepInput>;
  /** Index of the currently active step (0-based). */
  current: number;
  /** Layout. Defaults to "horizontal". */
  orientation?: StepperOrientation;
  /**
   * When true, completed steps become clickable and jumping back is allowed.
   * Defaults to false (read-only indicator).
   */
  allowJumpBack?: boolean;
  /**
   * Called when the user clicks a navigable step. Only fired for completed
   * steps when `allowJumpBack` is true.
   */
  onChange?: (next: number) => void;
  /**
   * Force the compact mobile-style layout (single line "Step X of Y" + dots).
   * Auto-enabled on viewports < 640px via Tailwind responsive classes.
   */
  forceCompact?: boolean;
  className?: string;
  /** Accessible label for the step nav element. */
  "aria-label"?: string;
}

type StepState = "complete" | "active" | "pending" | "error";

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

type NormalizedStep = {
  label: string;
  description?: string;
  hasError: boolean;
};

function normalizeStep(input: StepInput): NormalizedStep {
  if (typeof input === "string") {
    return { label: input, hasError: false };
  }
  return {
    label: input.label,
    description: input.description,
    hasError: Boolean(input.hasError),
  };
}

function stateFor(
  index: number,
  current: number,
  step: NormalizedStep,
): StepState {
  if (step.hasError) return "error";
  if (index < current) return "complete";
  if (index === current) return "active";
  return "pending";
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

export function Stepper({
  steps,
  current,
  orientation = "horizontal",
  allowJumpBack = false,
  onChange,
  forceCompact = false,
  className,
  "aria-label": ariaLabel = "Progress",
}: StepperProps) {
  const normalized = React.useMemo(() => steps.map(normalizeStep), [steps]);
  const total = normalized.length;
  const safeCurrent = Math.min(Math.max(current, 0), Math.max(total - 1, 0));

  const handleJump = React.useCallback(
    (index: number) => {
      if (!allowJumpBack || !onChange) return;
      // Only allow going to earlier (completed) steps.
      if (index >= safeCurrent) return;
      onChange(index);
    },
    [allowJumpBack, onChange, safeCurrent],
  );

  if (total === 0) return null;

  if (orientation === "vertical") {
    return (
      <VerticalStepper
        steps={normalized}
        current={safeCurrent}
        onJump={handleJump}
        allowJumpBack={allowJumpBack}
        className={className}
        ariaLabel={ariaLabel}
      />
    );
  }

  // Horizontal: render two trees — compact (mobile) and full (>= sm). The
  // compact tree is hidden on sm+; the full tree is hidden below sm. `forceCompact`
  // pins everything to compact regardless of viewport.
  return (
    <nav aria-label={ariaLabel} className={cn("w-full", className)}>
      {/* Compact / mobile view */}
      <div className={cn(forceCompact ? "block" : "block sm:hidden")}>
        <CompactRow
          steps={normalized}
          current={safeCurrent}
          total={total}
        />
      </div>
      {/* Full horizontal view */}
      {!forceCompact && (
        <ol className="hidden sm:flex items-center gap-0 w-full">
          {normalized.map((step, index) => {
            const state = stateFor(index, safeCurrent, step);
            const isLast = index === total - 1;
            const isNavigable =
              allowJumpBack && state === "complete" && Boolean(onChange);
            return (
              <li
                key={`${step.label}-${index}`}
                className="flex items-center flex-1 last:flex-initial min-w-0"
                aria-current={state === "active" ? "step" : undefined}
              >
                <StepPill
                  state={state}
                  index={index}
                  label={step.label}
                  description={step.description}
                  navigable={isNavigable}
                  onClick={isNavigable ? () => handleJump(index) : undefined}
                />
                {!isLast && <Connector state={state} />}
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Vertical layout (for sidebar wizard rails)
// ---------------------------------------------------------------------------

function VerticalStepper({
  steps,
  current,
  onJump,
  allowJumpBack,
  className,
  ariaLabel,
}: {
  steps: NormalizedStep[];
  current: number;
  onJump: (index: number) => void;
  allowJumpBack: boolean;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("w-full", className)}>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const state = stateFor(index, current, step);
          const isLast = index === steps.length - 1;
          const isNavigable =
            allowJumpBack && state === "complete";
          return (
            <li
              key={`${step.label}-${index}`}
              className="flex gap-3"
              aria-current={state === "active" ? "step" : undefined}
            >
              <div className="flex flex-col items-center">
                <StepDot
                  state={state}
                  index={index}
                  navigable={isNavigable}
                  onClick={isNavigable ? () => onJump(index) : undefined}
                />
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "w-px flex-1 min-h-[24px] my-1 motion-safe:transition-colors",
                      state === "complete"
                        ? "bg-accent/60"
                        : "bg-border",
                    )}
                  />
                )}
              </div>
              <div className={cn("pb-3 min-w-0", isLast && "pb-0")}>
                <p
                  className={cn(
                    "text-sm leading-tight truncate",
                    state === "active" && "font-medium text-text",
                    state === "complete" && "text-text",
                    state === "pending" && "text-text-muted",
                    state === "error" && "font-medium text-danger",
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-text-muted leading-tight mt-0.5 truncate">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Compact (mobile) layout
// ---------------------------------------------------------------------------

function CompactRow({
  steps,
  current,
  total,
}: {
  steps: NormalizedStep[];
  current: number;
  total: number;
}) {
  const activeStep = steps[current];
  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="min-w-0">
        <p className="text-xs text-text-muted font-medium uppercase tracking-wider">
          Step {current + 1} of {total}
        </p>
        <p className="text-sm font-medium text-text truncate">
          {activeStep?.label}
        </p>
      </div>
      <div
        className="flex items-center gap-1.5 shrink-0"
        aria-hidden="true"
      >
        {steps.map((step, index) => {
          const state = stateFor(index, current, step);
          return (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full motion-safe:transition-all",
                state === "active" && "w-4 bg-accent",
                state === "complete" && "w-1.5 bg-accent/70",
                state === "pending" && "w-1.5 bg-border",
                state === "error" && "w-1.5 bg-danger",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step pill (horizontal full view)
// ---------------------------------------------------------------------------

function StepPill({
  state,
  index,
  label,
  description,
  navigable,
  onClick,
}: {
  state: StepState;
  index: number;
  label: string;
  description?: string;
  navigable: boolean;
  onClick?: () => void;
}) {
  const content = (
    <span className="flex items-center gap-2.5 min-w-0">
      <StepDot state={state} index={index} navigable={navigable} />
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm leading-tight truncate",
            state === "active" && "font-medium text-text",
            state === "complete" && "text-text",
            state === "pending" && "text-text-muted",
            state === "error" && "font-medium text-danger",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="block text-xs text-text-muted leading-tight mt-0.5 truncate">
            {description}
          </span>
        )}
      </span>
    </span>
  );

  if (navigable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "min-w-0 text-left rounded-md px-1 py-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          "hover:bg-surface-muted/50 motion-safe:transition-colors",
        )}
      >
        {content}
      </button>
    );
  }

  return <span className="min-w-0">{content}</span>;
}

// ---------------------------------------------------------------------------
// Step dot (numbered circle / check / error)
// ---------------------------------------------------------------------------

function StepDot({
  state,
  index,
  navigable,
  onClick,
}: {
  state: StepState;
  index: number;
  navigable: boolean;
  onClick?: () => void;
}) {
  const dotClass = cn(
    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold border",
    "motion-safe:transition-colors",
    state === "active" &&
      "bg-surface text-accent border-accent ring-2 ring-accent/20",
    state === "complete" && "bg-accent text-accent-ink border-accent",
    state === "pending" && "bg-surface text-text-muted border-border",
    state === "error" && "bg-danger text-white border-danger",
  );

  const inner =
    state === "complete" ? (
      <Check size={12} aria-hidden="true" />
    ) : state === "error" ? (
      <AlertCircle size={12} aria-hidden="true" />
    ) : (
      <span>{index + 1}</span>
    );

  // Used inside a button wrapper in horizontal mode; in vertical mode the dot
  // itself becomes the button when navigable.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Go to step ${index + 1}`}
        className={cn(
          dotClass,
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 hover:opacity-80",
        )}
      >
        {inner}
      </button>
    );
  }

  return <span className={dotClass} aria-hidden={state !== "active"}>{inner}</span>;
}

// ---------------------------------------------------------------------------
// Connector (hairline between pills)
// ---------------------------------------------------------------------------

function Connector({ state }: { state: StepState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-px flex-1 mx-2 min-w-[16px] motion-safe:transition-colors",
        state === "complete" ? "bg-accent/60" : "bg-border",
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// useStepper — headless navigation hook
// ---------------------------------------------------------------------------

export interface UseStepperResult {
  current: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
  total: number;
  reset: () => void;
}

export function useStepper(
  stepCount: number,
  initial: number = 0,
): UseStepperResult {
  const [current, setCurrent] = React.useState<number>(() => clamp(initial, 0, stepCount - 1));

  const next = React.useCallback(() => {
    setCurrent((c) => Math.min(c + 1, stepCount - 1));
  }, [stepCount]);

  const prev = React.useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  const goTo = React.useCallback(
    (index: number) => {
      setCurrent(clamp(index, 0, stepCount - 1));
    },
    [stepCount],
  );

  const reset = React.useCallback(() => {
    setCurrent(clamp(initial, 0, stepCount - 1));
  }, [initial, stepCount]);

  return {
    current,
    next,
    prev,
    goTo,
    isFirst: current === 0,
    isLast: current === Math.max(stepCount - 1, 0),
    total: stepCount,
    reset,
  };
}

// ---------------------------------------------------------------------------
// useStepperWithValidation — async validation gates next()
// ---------------------------------------------------------------------------

export interface ValidatedStep {
  /**
   * Return `true` to allow advancing, `false` to block. May be async.
   * Throw or reject to be treated as `false`.
   */
  validate?: () => boolean | Promise<boolean>;
}

export interface UseStepperWithValidationOptions {
  steps: ReadonlyArray<ValidatedStep>;
  initial?: number;
}

export interface UseStepperWithValidationResult extends UseStepperResult {
  /** True while a validation call is in-flight. */
  isValidating: boolean;
  /**
   * Async next() — resolves to `true` when the step advanced, `false`
   * when validation blocked it.
   */
  tryNext: () => Promise<boolean>;
}

export function useStepperWithValidation({
  steps,
  initial = 0,
}: UseStepperWithValidationOptions): UseStepperWithValidationResult {
  const base = useStepper(steps.length, initial);
  const [isValidating, setIsValidating] = React.useState(false);

  // Keep a ref to the steps array so a stale closure in tryNext never reads
  // an outdated validate fn.
  const stepsRef = React.useRef(steps);
  React.useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  const tryNext = React.useCallback(async (): Promise<boolean> => {
    const currentStep = stepsRef.current[base.current];
    if (!currentStep?.validate) {
      base.next();
      return true;
    }
    setIsValidating(true);
    try {
      const ok = await Promise.resolve().then(() => currentStep.validate!());
      if (ok) {
        base.next();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [base]);

  // Wrap `next` so callers using the synchronous handle still get gating.
  const guardedNext = React.useCallback(() => {
    void tryNext();
  }, [tryNext]);

  return {
    ...base,
    next: guardedNext,
    tryNext,
    isValidating,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(n, min), max);
}

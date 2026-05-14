"use client";

// Wizard chrome (frame) for the Practice Onboarding Controller.
//
// This component is intentionally agnostic to step content — it only knows
// about the registry in `wizard-steps.ts` and the shared `WizardStepProps`
// contract. Steps register themselves; the shell renders them.
//
// Responsibilities:
//   - Two-column layout: progress rail (left) + step pane (right)
//   - Local draft state via `useReducer`, with debounced PATCH autosave
//   - Save indicator (Saved / Saving... / Save failed)
//   - Resume banner when a returning admin lands mid-flow
//   - Keyboard shortcuts (Enter to advance, Esc to dashboard)

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import { cn } from "@/lib/utils/cn";
import {
  WIZARD_STEPS,
  WIZARD_STEP_COUNT,
} from "@/lib/onboarding/wizard-steps";
import type {
  PracticeConfiguration,
  RailItem,
  RailItemStatus,
  SaveStatus,
  WizardStepId,
} from "@/lib/onboarding/wizard-types";

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type DraftState = Partial<PracticeConfiguration>;

type DraftAction =
  | { type: "patch"; changes: Partial<PracticeConfiguration> }
  | { type: "reset"; draft: Partial<PracticeConfiguration> };

function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.changes };
    case "reset":
      return { ...action.draft };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type WizardShellProps = {
  draftId: string;
  initialDraft: Partial<PracticeConfiguration>;
  /** Path to redirect to when the user presses Esc / Cancel. */
  dashboardHref?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WizardShell({
  draftId,
  initialDraft,
  dashboardHref = "/onboarding",
}: WizardShellProps) {
  const router = useRouter();

  const [draft, dispatch] = useReducer(draftReducer, initialDraft);
  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    pickInitialIndex(initialDraft),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [resumeDismissed, setResumeDismissed] = useState(false);

  // Compute completed steps from the draft. Recomputed on every patch.
  const completedSteps = useMemo<Set<WizardStepId>>(() => {
    const next = new Set<WizardStepId>();
    for (const step of WIZARD_STEPS) {
      if (step.isComplete(draft)) next.add(step.id);
    }
    return next;
  }, [draft]);

  const currentStep = WIZARD_STEPS[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === WIZARD_STEP_COUNT - 1;
  const isCurrentComplete = currentStep.isComplete(draft);
  const canAdvance = isCurrentComplete || currentStep.canSkip === true;

  // -------------------------------------------------------------------------
  // Autosave: debounce + abort previous in-flight request
  // -------------------------------------------------------------------------
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const pendingPatchRef = useRef<Partial<PracticeConfiguration>>({});

  const flushSave = useCallback(async () => {
    const changes = pendingPatchRef.current;
    pendingPatchRef.current = {};
    if (Object.keys(changes).length === 0) return;

    if (inFlightRef.current) {
      inFlightRef.current.abort();
    }
    const controller = new AbortController();
    inFlightRef.current = controller;

    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/configs/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`PATCH failed (${res.status})`);
      // Only mark saved if this controller is still the latest.
      if (inFlightRef.current === controller) {
        setSaveStatus("saved");
      }
    } catch (err) {
      // Aborted requests are expected when typing quickly — ignore them.
      if ((err as Error).name === "AbortError") return;
      if (inFlightRef.current === controller) {
        setSaveStatus("error");
      }
    }
  }, [draftId]);

  const scheduleSave = useCallback(
    (changes: Partial<PracticeConfiguration>) => {
      pendingPatchRef.current = {
        ...pendingPatchRef.current,
        ...changes,
      };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void flushSave();
      }, 500);
    },
    [flushSave],
  );

  const patch = useCallback(
    (changes: Partial<PracticeConfiguration>) => {
      dispatch({ type: "patch", changes });
      scheduleSave(changes);
    },
    [scheduleSave],
  );

  const retrySave = useCallback(() => {
    void flushSave();
  }, [flushSave]);

  // Cleanup pending timer + in-flight request on unmount.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (inFlightRef.current) inFlightRef.current.abort();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const goNext = useCallback(() => {
    if (isLast) return;
    if (!canAdvance) return;
    setCurrentIndex((i) => Math.min(i + 1, WIZARD_STEP_COUNT - 1));
  }, [isLast, canAdvance]);

  const goBack = useCallback(() => {
    if (isFirst) return;
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, [isFirst]);

  const goToStep = useCallback(
    (index: number) => {
      const target = WIZARD_STEPS[index];
      if (!target) return;
      if (!target.isReachable(draft, completedSteps)) return;
      setCurrentIndex(index);
    },
    [draft, completedSteps],
  );

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        router.push(dashboardHref);
        return;
      }
      // Enter advances — but only if focus isn't on a textarea/contentEditable
      // where Enter has its own meaning.
      if (e.key === "Enter") {
        const t = e.target as HTMLElement | null;
        if (!t) return;
        const tag = t.tagName;
        const isEditable =
          tag === "TEXTAREA" ||
          (tag === "INPUT" && (t as HTMLInputElement).type === "text") ||
          t.isContentEditable;
        // Only auto-advance from non-editable focus targets (e.g. step body
        // background, buttons that have already handled their own click).
        if (isEditable) return;
        if (canAdvance && !isLast) {
          e.preventDefault();
          goNext();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, dashboardHref, canAdvance, isLast, goNext]);

  // -------------------------------------------------------------------------
  // Rail items
  // -------------------------------------------------------------------------

  const railItems = useMemo<RailItem[]>(() => {
    return WIZARD_STEPS.map((step, index) => {
      let status: RailItemStatus;
      if (index === currentIndex) status = "current";
      else if (completedSteps.has(step.id)) status = "completed";
      else if (step.isReachable(draft, completedSteps)) status = "available";
      else status = "disabled";
      return {
        id: step.id,
        index,
        title: step.shortTitle ?? step.title,
        status,
      };
    });
  }, [currentIndex, completedSteps, draft]);

  const completedCount = completedSteps.size;
  const showResume =
    !resumeDismissed && completedCount > 0 && currentIndex > 0;

  return (
    <div className="px-6 lg:px-12 py-8">
      <div className="mx-auto w-full max-w-[1280px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow className="mb-2">Practice configuration</Eyebrow>
            <h1 className="font-display text-2xl md:text-3xl text-text tracking-tight">
              Onboarding wizard
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Step {currentIndex + 1} of {WIZARD_STEP_COUNT} &middot;{" "}
              {completedCount} complete
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">Draft</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(dashboardHref)}
            >
              Exit
            </Button>
          </div>
        </div>

        {/* Resume banner */}
        {showResume && (
          <Card tone="ambient" className="mb-6">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text">
                  Welcome back &mdash; picking up at step {currentIndex + 1}{" "}
                  of {WIZARD_STEP_COUNT}.
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Your previous progress has been restored.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResumeDismissed(true)}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Progress rail */}
          <Card tone="default" className="self-start lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-1">
                {railItems.map((item) => (
                  <RailRow
                    key={item.id}
                    item={item}
                    onSelect={() => goToStep(item.index)}
                  />
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Step pane */}
          <Card tone="raised">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-text-muted tracking-wide uppercase mb-1">
                    Step {currentIndex + 1} of {WIZARD_STEP_COUNT}
                  </p>
                  <CardTitle>{currentStep.title}</CardTitle>
                  {currentStep.description && (
                    <p className="text-sm text-text-muted mt-1.5 max-w-2xl">
                      {currentStep.description}
                    </p>
                  )}
                </div>
                {isCurrentComplete && (
                  <Badge tone="success">
                    <Check size={12} aria-hidden /> Complete
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <currentStep.Component
                draft={draft}
                patch={patch}
                goNext={goNext}
                goBack={goBack}
                isFirst={isFirst}
                isLast={isLast}
              />
            </CardContent>

            <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between gap-4">
              <SaveIndicator status={saveStatus} onRetry={retrySave} />
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goBack}
                  disabled={isFirst}
                  leadingIcon={<ChevronLeft size={16} aria-hidden />}
                >
                  Back
                </Button>
                {!isLast && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={goNext}
                    disabled={!canAdvance}
                    trailingIcon={<ChevronRight size={16} aria-hidden />}
                  >
                    {currentStep.canSkip && !isCurrentComplete
                      ? "Skip"
                      : "Next"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function RailRow({
  item,
  onSelect,
}: {
  item: RailItem;
  onSelect: () => void;
}) {
  const disabled = item.status === "disabled";
  const isCurrent = item.status === "current";
  const isCompleted = item.status === "completed";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-current={isCurrent ? "step" : undefined}
        className={cn(
          "w-full text-left flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          isCurrent && "bg-accent-soft text-text border border-accent/30",
          !isCurrent &&
            !disabled &&
            "text-text-muted hover:bg-surface-muted hover:text-text",
          disabled && "text-text-muted/60 cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
            isCompleted &&
              "bg-accent text-accent-ink border-accent",
            isCurrent &&
              !isCompleted &&
              "bg-surface text-accent border-accent",
            !isCompleted &&
              !isCurrent &&
              !disabled &&
              "bg-surface text-text-muted border-border-strong/60",
            disabled &&
              "bg-surface-muted text-text-muted/70 border-border",
          )}
        >
          {isCompleted ? <Check size={12} aria-hidden /> : item.index + 1}
        </span>
        <span
          className={cn(
            "truncate",
            isCurrent && "font-medium",
            isCompleted && !isCurrent && "text-text",
          )}
        >
          {item.title}
        </span>
      </button>
    </li>
  );
}

function SaveIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  if (status === "idle") {
    return <span className="text-xs text-text-muted">Autosave on</span>;
  }
  if (status === "saving") {
    return (
      <span className="text-xs text-text-muted inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        Saving&hellip;
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="text-xs text-success inline-flex items-center gap-1.5">
        <Check size={12} aria-hidden /> Saved
      </span>
    );
  }
  return (
    <span className="text-xs text-danger inline-flex items-center gap-2">
      Save failed
      <button
        type="button"
        onClick={onRetry}
        className="underline underline-offset-2 hover:text-danger/80"
      >
        Retry
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick the initial step index when the shell mounts.
 *
 * Strategy: walk the registry in order; resume on the first step that is
 * reachable but not complete. Falls back to step 0.
 */
function pickInitialIndex(draft: Partial<PracticeConfiguration>): number {
  const completed = new Set<WizardStepId>();
  for (const step of WIZARD_STEPS) {
    if (step.isComplete(draft)) completed.add(step.id);
  }
  for (let i = 0; i < WIZARD_STEPS.length; i++) {
    const step = WIZARD_STEPS[i];
    const reachable = step.isReachable(draft, completed);
    const done = completed.has(step.id);
    if (reachable && !done) return i;
  }
  return 0;
}

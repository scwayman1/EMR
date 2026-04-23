"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ONBOARDING_STEPS,
  calculateProgress,
  CATEGORY_LABELS,
  type OnboardingStep,
  type OnboardingStepStatus,
} from "@/lib/domain/onboarding";

/* ── Category colors ─────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, { bar: string; bg: string; text: string; border: string }> = {
  basics:   { bar: "bg-emerald-500",  bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200" },
  clinical: { bar: "bg-blue-500",     bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200" },
  billing:  { bar: "bg-amber-500",    bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200" },
  ai:       { bar: "bg-purple-500",   bg: "bg-purple-50",   text: "text-purple-700",   border: "border-purple-200" },
  launch:   { bar: "bg-rose-500",     bg: "bg-rose-50",     text: "text-rose-700",     border: "border-rose-200" },
};

const STATUS_BADGE: Record<OnboardingStepStatus, { label: string; tone: "success" | "warning" | "neutral" | "accent" }> = {
  complete:    { label: "Complete",     tone: "success" },
  in_progress: { label: "In progress",  tone: "accent" },
  not_started: { label: "Not started",  tone: "neutral" },
  skipped:     { label: "Skipped",      tone: "warning" },
};

/* ── Main component ──────────────────────────────────────── */

export function OnboardingWizard() {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const steps: OnboardingStep[] = useMemo(
    () =>
      ONBOARDING_STEPS.map((s) => ({
        ...s,
        status: completedIds.has(s.id) ? ("complete" as const) : ("not_started" as const),
        checks: [],
      })),
    [completedIds],
  );

  const progress = useMemo(() => calculateProgress(steps), [steps]);

  const toggleStep = useCallback((id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Group steps by category
  const grouped = useMemo(() => {
    const groups: Record<string, OnboardingStep[]> = {};
    for (const step of steps) {
      if (!groups[step.category]) groups[step.category] = [];
      groups[step.category].push(step);
    }
    return groups;
  }, [steps]);

  const allRequiredDone = progress.requiredRemaining === 0;

  return (
    <div>
      {/* Progress header */}
      <Card tone="raised" className="mb-8">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-display text-text tracking-tight">
                {progress.percentComplete}% complete
              </h2>
              <p className="text-sm text-text-muted mt-1">
                {progress.completedSteps} of {progress.totalSteps} steps complete
                {progress.estimatedMinutesRemaining > 0 && (
                  <span className="ml-2 text-text-subtle">
                    &middot; ~{progress.estimatedMinutesRemaining} min remaining
                  </span>
                )}
              </p>
            </div>
            {progress.nextStep && !allRequiredDone && (
              <Link href={progress.nextStep.href}>
                <Button size="sm">
                  Continue: {progress.nextStep.title}
                </Button>
              </Link>
            )}
          </div>

          {/* Segmented progress bar */}
          <div className="flex h-3 rounded-full overflow-hidden bg-surface-muted gap-0.5">
            {Object.entries(grouped).map(([cat, catSteps]) => {
              const catCompleted = catSteps.filter((s) => s.status === "complete").length;
              const widthPercent = (catSteps.length / steps.length) * 100;
              const fillPercent = catSteps.length > 0 ? (catCompleted / catSteps.length) * 100 : 0;
              const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.basics;

              return (
                <div
                  key={cat}
                  className="relative h-full rounded-full overflow-hidden bg-surface-muted"
                  style={{ width: `${widthPercent}%` }}
                  title={`${CATEGORY_LABELS[cat]?.label ?? cat}: ${catCompleted}/${catSteps.length}`}
                >
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Category legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(CATEGORY_LABELS).map(([key, val]) => {
              const colors = CATEGORY_COLORS[key] ?? CATEGORY_COLORS.basics;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-full", colors.bar)} />
                  <span className="text-[11px] text-text-muted">{val.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Celebration state */}
      {allRequiredDone && (
        <Card tone="raised" className="mb-8 border-emerald-300 bg-emerald-50/50">
          <CardContent className="py-8 text-center">
            <p className="text-4xl mb-3">&#127881;</p>
            <h3 className="font-display text-xl text-emerald-800 tracking-tight mb-2">
              All required steps complete!
            </h3>
            <p className="text-sm text-emerald-700">
              Your practice is ready to go live. You can still complete optional steps below.
            </p>
            <Link href="/ops/launch">
              <Button className="mt-4">Go to launch</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Steps grouped by category */}
      <div className="space-y-8">
        {Object.entries(grouped).map(([cat, catSteps]) => {
          const catLabel = CATEGORY_LABELS[cat] ?? { label: cat, icon: "?" };
          const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.basics;

          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded",
                    colors.bg,
                    colors.text,
                  )}
                >
                  {catLabel.icon}
                </span>
                <h3 className="font-display text-lg text-text tracking-tight">
                  {catLabel.label}
                </h3>
                <span className="text-xs text-text-subtle ml-auto">
                  {catSteps.filter((s) => s.status === "complete").length}/{catSteps.length}
                </span>
              </div>

              <div className="space-y-3">
                {catSteps.map((step) => {
                  const isComplete = step.status === "complete";
                  const isNext = progress.nextStep?.id === step.id && !allRequiredDone;
                  const statusInfo = STATUS_BADGE[step.status];

                  return (
                    <Card
                      key={step.id}
                      className={cn(
                        "rounded-xl transition-all duration-200",
                        isNext && "ring-2 ring-[#047857] border-[#047857]/30",
                        isComplete && "bg-surface-muted/50",
                      )}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <label className="mt-0.5 shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isComplete}
                              onChange={() => toggleStep(step.id)}
                              className="h-5 w-5 rounded border-border-strong text-[#047857] focus:ring-[#047857]/20"
                            />
                          </label>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  isComplete ? "text-text-muted line-through" : "text-text",
                                )}
                              >
                                {step.title}
                              </span>
                              {step.required && (
                                <span className="text-[9px] text-danger font-medium">Required</span>
                              )}
                              <Badge tone={statusInfo.tone} className="text-[9px]">
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p
                              className={cn(
                                "text-xs mt-1 leading-relaxed",
                                isComplete ? "text-text-subtle" : "text-text-muted",
                              )}
                            >
                              {step.description}
                            </p>
                            <p className="text-[10px] text-text-subtle mt-1">
                              ~{step.estimatedMinutes} min
                            </p>
                          </div>

                          {/* Start link */}
                          {!isComplete && (
                            <Link href={step.href}>
                              <Button
                                variant={isNext ? "primary" : "ghost"}
                                size="sm"
                                className="shrink-0"
                              >
                                {isNext ? "Start" : "Open"}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

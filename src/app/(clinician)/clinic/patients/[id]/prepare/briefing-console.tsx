"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { generateBriefing, startVisitWithBriefing, type BriefingResult, type BriefingStep } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeafSprig, EditorialRule, Eyebrow } from "@/components/ui/ornament";

// ---------------------------------------------------------------------------
// Step icons
// ---------------------------------------------------------------------------

const STEP_ICONS: Record<string, string> = {
  "1": "👤",
  "2": "📋",
  "3": "📈",
  "4": "💊",
  "5": "💬",
  "6": "🧠",
};

// ---------------------------------------------------------------------------
// Animated step row
// ---------------------------------------------------------------------------

function StepRow({
  step,
  isAnimating,
}: {
  step: BriefingStep;
  isAnimating: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        step.status === "running"
          ? "bg-accent/10 border border-accent/20"
          : step.status === "done"
            ? "bg-surface-muted/50"
            : step.status === "error"
              ? "bg-danger/10 border border-danger/20"
              : "opacity-50"
      }`}
    >
      {/* Status indicator */}
      <div className="mt-0.5 shrink-0">
        {step.status === "running" ? (
          <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        ) : step.status === "done" ? (
          <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5L4.5 7.5L8 2.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : step.status === "error" ? (
          <div className="h-5 w-5 rounded-full bg-danger flex items-center justify-center text-white text-xs font-bold">
            !
          </div>
        ) : (
          <div className="h-5 w-5 rounded-full border border-border-strong/40" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {STEP_ICONS[String(step.step)] ?? ""}
          </span>
          <p
            className={`text-sm font-medium ${
              step.status === "running"
                ? "text-accent"
                : step.status === "done"
                  ? "text-text"
                  : step.status === "error"
                    ? "text-danger"
                    : "text-text-muted"
            }`}
          >
            {step.label}
          </p>
        </div>
        {step.status === "running" && isAnimating && (
          <p className="text-xs text-accent/70 mt-1 animate-pulse">
            Processing...
          </p>
        )}
        {step.status === "error" && step.detail && (
          <p className="text-xs text-danger mt-1">{step.detail}</p>
        )}
      </div>

      {/* Duration */}
      {step.status === "done" && step.durationMs != null && (
        <span className="text-[10px] text-text-subtle tabular-nums shrink-0">
          {(step.durationMs / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section card with icon
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, string> = {
  alert: "🚨",
  trend: "📊",
  medication: "💊",
  research: "🔬",
  note: "📝",
  task: "✅",
  message: "💬",
};

function BriefingSection({
  section,
}: {
  section: {
    title: string;
    content: string;
    priority: string;
    icon: string;
  };
}) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${
        section.priority === "high"
          ? "bg-danger/5 border-danger/15"
          : section.priority === "medium"
            ? "bg-highlight-soft border-highlight/15"
            : "bg-surface-muted/50 border-border/60"
      }`}
    >
      <span className="text-lg shrink-0 mt-0.5">
        {ICON_MAP[section.icon] ?? "📋"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text">{section.title}</p>
          {section.priority === "high" && (
            <Badge tone="danger" className="text-[9px]">
              Priority
            </Badge>
          )}
        </div>
        <p className="text-sm text-text-muted mt-1 leading-relaxed">
          {section.content}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main console component
// ---------------------------------------------------------------------------

export function BriefingConsole({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [simulatedSteps, setSimulatedSteps] = useState<BriefingStep[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulated step progression for UX
  useEffect(() => {
    if (phase === "running" && simulatedSteps.length === 0) {
      const steps: BriefingStep[] = [
        { step: 1, label: "Loading patient profile and chart summary", status: "pending" },
        { step: 2, label: "Reviewing recent encounters and notes", status: "pending" },
        { step: 3, label: "Analyzing outcome trends (last 30 days)", status: "pending" },
        { step: 4, label: "Checking medications and dosing adherence", status: "pending" },
        { step: 5, label: "Scanning recent messages and assessments", status: "pending" },
        { step: 6, label: "Generating intelligence briefing via LLM", status: "pending" },
      ];
      setSimulatedSteps(steps);

      let current = 0;
      intervalRef.current = setInterval(() => {
        current++;
        setSimulatedSteps((prev) =>
          prev.map((s, i) => ({
            ...s,
            status:
              i < current
                ? "done"
                : i === current
                  ? "running"
                  : "pending",
            durationMs: i < current ? (i + 1) * 400 + Math.random() * 300 : undefined,
          })),
        );
        if (current >= steps.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 600);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, simulatedSteps.length]);

  function handleGenerate() {
    setPhase("running");
    setSimulatedSteps([]);
    startTransition(async () => {
      const res = await generateBriefing(patientId);
      setResult(res);
      // Replace simulated steps with real ones
      if (res.steps.length > 0) {
        setSimulatedSteps(res.steps);
      }
      setPhase("done");
      if (intervalRef.current) clearInterval(intervalRef.current);
    });
  }

  const displaySteps =
    phase === "done" && result?.steps?.length
      ? result.steps
      : simulatedSteps;

  return (
    <div className="space-y-6">
      {/* ── Agent console header ───────────────────────────── */}
      <Card
        tone="raised"
        className="border-l-4 border-l-accent overflow-hidden"
      >
        <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shadow-sm">
                <span className="text-lg">🧠</span>
              </div>
              <div>
                <CardTitle className="text-base">
                  Pre-Visit Intelligence Agent
                </CardTitle>
                <CardDescription className="text-xs">
                  v1.0.0 &middot; 6 analysis steps &middot; LLM-powered synthesis
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {phase === "done" && result?.ok && (
                <Badge tone="success">Briefing ready</Badge>
              )}
              {phase === "running" && (
                <Badge tone="accent">Running...</Badge>
              )}
              {phase === "done" && result && !result.ok && (
                <Badge tone="danger">Error</Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {/* ── Step-by-step console ──────────────────────────── */}
        {phase !== "idle" && (
          <CardContent className="bg-[#0D1117] rounded-b-xl">
            <div className="font-mono text-xs text-[#8B949E] mb-3 flex items-center gap-2">
              <span className="text-accent">$</span>
              <span>
                agent run preVisitIntelligence --patient {patientId.slice(0, 8)}...
              </span>
            </div>
            <div className="space-y-1.5">
              {displaySteps.map((step) => (
                <StepRow
                  key={step.step}
                  step={step}
                  isAnimating={isPending}
                />
              ))}
            </div>
            {phase === "done" && result && (
              <div className="mt-4 pt-3 border-t border-[#21262D] flex items-center justify-between">
                <span className="text-xs text-[#8B949E]">
                  Completed in {(result.totalDurationMs / 1000).toFixed(2)}s
                  {result.briefing && (
                    <span className="ml-2">
                      &middot; Confidence:{" "}
                      <span
                        className={
                          result.briefing.confidence >= 0.8
                            ? "text-[#3FB950]"
                            : result.briefing.confidence >= 0.6
                              ? "text-[#D29922]"
                              : "text-[#F85149]"
                        }
                      >
                        {Math.round(result.briefing.confidence * 100)}%
                      </span>
                    </span>
                  )}
                </span>
                <Badge
                  tone={result.ok ? "success" : "danger"}
                  className="text-[9px]"
                >
                  {result.ok ? "EXIT 0" : "EXIT 1"}
                </Badge>
              </div>
            )}
          </CardContent>
        )}

        {/* ── Launch button ────────────────────────────────── */}
        {phase === "idle" && (
          <CardContent>
            <p className="text-sm text-text-muted leading-relaxed mb-4">
              The agent will pull {patientName}&apos;s chart data, analyze
              outcome trends, check medication adherence, scan recent messages,
              and generate a structured briefing with talking points and risk
              flags.
            </p>
            <Button size="lg" onClick={handleGenerate}>
              Prepare for visit
            </Button>
          </CardContent>
        )}

        {phase === "done" && !result?.ok && (
          <CardFooter>
            <p className="text-sm text-danger">{result?.error}</p>
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto"
              onClick={handleGenerate}
            >
              Retry
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* ── Briefing results ───────────────────────────────── */}
      {phase === "done" && result?.ok && result.briefing && (
        <>
          <EditorialRule />

          {/* Risk flags */}
          {result.briefing.riskFlags.length > 0 && (
            <Card className="border-l-4 border-l-danger bg-danger/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>🚨</span>
                  Risk Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.briefing.riskFlags.map((flag, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-text"
                    >
                      <span className="text-danger shrink-0 mt-0.5 font-bold">
                        !
                      </span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Patient summary */}
          <Card tone="ambient">
            <CardContent className="py-6">
              <Eyebrow className="mb-3">Patient briefing</Eyebrow>
              <p className="font-display text-xl text-text leading-relaxed">
                {result.briefing.patientSummary}
              </p>
              {result.briefing.lastVisitSummary && (
                <p className="text-sm text-text-muted mt-3 leading-relaxed">
                  <strong className="text-text">Last visit:</strong>{" "}
                  {result.briefing.lastVisitSummary}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Talking points */}
          <Card tone="raised">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LeafSprig size={16} className="text-accent" />
                Talking Points for Today
              </CardTitle>
              <CardDescription>
                AI-generated conversation starters based on patient data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {result.briefing.talkingPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink text-xs font-medium">
                      {i + 1}
                    </span>
                    <p className="text-sm text-text leading-relaxed pt-0.5">
                      {point}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Detail sections */}
          {result.briefing.sections.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-lg text-text tracking-tight">
                Intelligence details
              </h3>
              {result.briefing.sections.map((section, i) => (
                <BriefingSection key={i} section={section} />
              ))}
            </div>
          )}

          {/* Actions */}
          <Card tone="raised">
            <CardContent className="py-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone="accent">AI briefing</Badge>
                <p className="text-xs text-text-subtle">
                  Review complete. Ready for visit.
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/clinic/patients/${patientId}/prescribe`}>
                  <Button variant="secondary" size="sm">
                    Prescribe
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => {
                    startVisitWithBriefing(patientId, result?.briefing ?? undefined);
                  }}
                >
                  Start visit with briefing
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

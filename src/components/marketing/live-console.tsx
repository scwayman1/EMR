"use client";

import { useEffect, useState } from "react";

/**
 * Liquid glass pre-visit intelligence preview for the landing page hero.
 *
 * Design language: frosted translucent surfaces, soft luminous gradients,
 * refined monospace numerals, layered depth. Think Apple visionOS meets
 * clinical instrumentation.
 */

const STEPS = [
  { label: "Patient profile", detail: "synthesizing" },
  { label: "Recent encounters", detail: "3 visits" },
  { label: "Outcome trends", detail: "30 days" },
  { label: "Medication adherence", detail: "92%" },
  { label: "Messages & assessments", detail: "5 items" },
  { label: "Intelligence synthesis", detail: "Claude 4.5" },
];

const INSIGHTS = [
  { label: "Pain trend", value: "↓ 40%", tone: "positive" as const },
  { label: "Sleep quality", value: "improving", tone: "positive" as const },
  { label: "Adherence", value: "92%", tone: "positive" as const },
  { label: "Risk flags", value: "1", tone: "warning" as const },
];

export function LiveConsole() {
  const [currentStep, setCurrentStep] = useState(0);
  const [phase, setPhase] = useState<"running" | "done" | "resetting">("running");

  useEffect(() => {
    if (phase === "running") {
      if (currentStep < STEPS.length - 1) {
        const t = setTimeout(() => setCurrentStep((s) => s + 1), 750);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("done"), 800);
        return () => clearTimeout(t);
      }
    }

    if (phase === "done") {
      const t = setTimeout(() => setPhase("resetting"), 4500);
      return () => clearTimeout(t);
    }

    if (phase === "resetting") {
      const t = setTimeout(() => {
        setCurrentStep(0);
        setPhase("running");
      }, 800);
      return () => clearTimeout(t);
    }
  }, [currentStep, phase]);

  return (
    <div className="relative">
      {/* Ambient light behind the glass card */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 30% 20%, rgba(95, 165, 120, 0.25), transparent 70%)," +
            "radial-gradient(ellipse 60% 60% at 80% 80%, rgba(222, 184, 135, 0.18), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Main glass card — STABLE HEIGHT prevents layout shift when
          the insights panel appears/disappears during the animation cycle.
          The insights panel is always rendered but visibility-toggled. */}
      <div
        className="relative rounded-[28px] overflow-hidden border border-white/30 shadow-[0_20px_80px_-20px_rgba(30,60,45,0.25),0_0_0_1px_rgba(255,255,255,0.1)_inset] flex flex-col"
        style={{
          minHeight: 520,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }}
      >
        {/* Inner highlight ring */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[28px] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.1) 100%)",
            mixBlendMode: "overlay",
          }}
        />

        {/* Top status bar */}
        <div className="relative px-7 pt-6 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-7 w-7 rounded-xl overflow-hidden bg-gradient-to-br from-accent/80 to-accent-strong/90 shadow-sm flex items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-xl"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)",
                }}
              />
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="relative">
                <path
                  d="M7 1C9 3 9.5 6 7 11C4.5 6 5 3 7 1Z"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-medium text-text tracking-wide">
                Pre-Visit Intelligence
              </p>
              <p className="text-[10px] text-text-subtle font-mono tracking-wide">
                agent · v1.0
              </p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/50 border border-white/60">
            <div className="relative">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-accent animate-ping opacity-60" />
            </div>
            <span className="text-[9px] font-medium text-accent uppercase tracking-[0.14em]">
              {phase === "done" ? "Ready" : "Processing"}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mx-7 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        {/* Steps — scrollable on mobile, static on desktop */}
        <div className="relative px-7 py-5 space-y-1.5 min-h-[240px] md:min-h-[300px] flex-1 overflow-y-auto">
          {STEPS.map((step, i) => {
            const isDone = phase === "done" || i < currentStep;
            const isRunning = phase === "running" && i === currentStep;
            const isPending = phase === "running" && i > currentStep;

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-500 ${
                  isRunning
                    ? "bg-white/60 border border-white/70 shadow-sm scale-[1.01]"
                    : isDone
                      ? "bg-white/20 border border-white/30"
                      : "border border-transparent"
                }`}
                style={{
                  opacity: isPending ? 0.35 : 1,
                  backdropFilter: isRunning || isDone ? "blur(8px)" : "none",
                  WebkitBackdropFilter: isRunning || isDone ? "blur(8px)" : "none",
                }}
              >
                {/* Status dot */}
                <div className="shrink-0 relative w-4 h-4">
                  {isRunning ? (
                    <>
                      <div className="absolute inset-0 rounded-full border border-accent/30" />
                      <div
                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin"
                        style={{ animationDuration: "0.9s" }}
                      />
                    </>
                  ) : isDone ? (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-accent-strong flex items-center justify-center shadow-sm">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path
                          d="M1.5 4L3 5.5L6.5 2"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="absolute inset-0 rounded-full border border-text-subtle/25" />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span
                    className={`text-[13px] font-medium transition-colors ${
                      isRunning
                        ? "text-text"
                        : isDone
                          ? "text-text"
                          : "text-text-subtle"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`text-[10px] font-mono tabular-nums transition-colors ${
                      isRunning
                        ? "text-accent"
                        : isDone
                          ? "text-text-subtle"
                          : "text-text-subtle/50"
                    }`}
                  >
                    {isRunning ? step.detail : isDone ? "✓" : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Result insights — always rendered to avoid layout shift;
            visibility is controlled via opacity + pointer-events */}
        <div
          className="relative mx-7 mb-7 p-4 rounded-2xl border overflow-hidden transition-all duration-500"
          style={{
            background:
              phase === "done"
                ? "linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))"
                : "transparent",
            borderColor:
              phase === "done" ? "rgba(255,255,255,0.5)" : "transparent",
            backdropFilter: phase === "done" ? "blur(12px)" : "none",
            WebkitBackdropFilter: phase === "done" ? "blur(12px)" : "none",
            opacity: phase === "done" ? 1 : 0,
            transform: phase === "done" ? "translateY(0)" : "translateY(8px)",
            pointerEvents: phase === "done" ? "auto" : "none",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
              Briefing ready
            </span>
            <span className="text-[10px] font-mono text-text-subtle tabular-nums">
              2.3s · 94% confidence
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {INSIGHTS.map((insight, i) => (
              <div
                key={insight.label}
                className="flex items-baseline justify-between px-3 py-2 rounded-lg bg-white/40 border border-white/40"
                style={{
                  opacity: phase === "done" ? 1 : 0,
                  transform:
                    phase === "done"
                      ? "translateY(0)"
                      : "translateY(8px)",
                  transition: `opacity 0.5s ease-out ${i * 0.08}s, transform 0.5s ease-out ${i * 0.08}s`,
                }}
              >
                <span className="text-[10px] text-text-subtle">
                  {insight.label}
                </span>
                <span
                  className={`text-[11px] font-medium tabular-nums ${
                    insight.tone === "warning"
                      ? "text-[color:var(--warning)]"
                      : "text-accent"
                  }`}
                >
                  {insight.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating glass callouts */}
      <div
        className="absolute -left-3 top-16 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-lg animate-float"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
      >
        <span className="font-display text-accent">2.3s</span>
        <span className="text-text-muted">briefing</span>
      </div>
      <div
        className="absolute -right-4 bottom-24 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-lg animate-float-delayed"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        <span className="text-text-muted">Claude 4.5</span>
      </div>

      <style jsx>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 5s ease-in-out 2.5s infinite;
        }
      `}</style>
    </div>
  );
}

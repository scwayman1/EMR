"use client";

import { useEffect, useState } from "react";

/**
 * A visually "live" agent console mockup for the landing page hero.
 * It cycles through the pre-visit intelligence agent steps on a loop
 * to give the impression of the agent running in real time.
 */

const STEPS = [
  { icon: "👤", label: "Loading patient profile..." },
  { icon: "📋", label: "Reviewing recent encounters..." },
  { icon: "📈", label: "Analyzing outcome trends..." },
  { icon: "💊", label: "Checking medication adherence..." },
  { icon: "💬", label: "Scanning messages & assessments..." },
  { icon: "🧠", label: "Generating briefing via LLM..." },
];

const OUTPUTS = [
  "pain trending ↓ 40%",
  "sleep improving",
  "adherence 92%",
  "1 risk flag",
  "3 talking points",
];

export function LiveConsole() {
  const [currentStep, setCurrentStep] = useState(0);
  const [phase, setPhase] = useState<"running" | "done" | "resetting">("running");

  useEffect(() => {
    if (phase === "running") {
      if (currentStep < STEPS.length - 1) {
        const t = setTimeout(() => setCurrentStep((s) => s + 1), 900);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("done"), 900);
        return () => clearTimeout(t);
      }
    }

    if (phase === "done") {
      const t = setTimeout(() => setPhase("resetting"), 3500);
      return () => clearTimeout(t);
    }

    if (phase === "resetting") {
      const t = setTimeout(() => {
        setCurrentStep(0);
        setPhase("running");
      }, 600);
      return () => clearTimeout(t);
    }
  }, [currentStep, phase]);

  return (
    <div className="relative">
      {/* Terminal window chrome */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-[#0D1117]">
        {/* Window header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#161B22] border-b border-[#21262D]">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-[#8B949E] font-mono">
              pre-visit-intelligence — agent console
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#3FB950] animate-pulse" />
            <span className="text-[10px] text-[#3FB950] font-mono">LIVE</span>
          </div>
        </div>

        {/* Terminal body */}
        <div className="p-6 min-h-[360px]">
          {/* Command line */}
          <div className="font-mono text-xs text-[#8B949E] mb-4 flex items-center gap-2">
            <span className="text-accent">$</span>
            <span>agent run preVisitIntelligence --patient maya-r</span>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {STEPS.map((step, i) => {
              const isDone = phase === "done" || i < currentStep;
              const isRunning = phase === "running" && i === currentStep;
              const isPending = phase === "running" && i > currentStep;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                    isRunning
                      ? "bg-accent/10 border border-accent/30"
                      : isDone
                        ? "bg-[#161B22]"
                        : "opacity-40"
                  }`}
                >
                  {/* Status indicator */}
                  <div className="shrink-0 w-5 flex items-center justify-center">
                    {isRunning ? (
                      <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    ) : isDone ? (
                      <div className="h-4 w-4 rounded-full bg-accent flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M2 5L4.5 7.5L8 2.5"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-[#30363D]" />
                    )}
                  </div>

                  <span className="text-base shrink-0">{step.icon}</span>
                  <span
                    className={`text-sm font-mono ${
                      isRunning
                        ? "text-accent"
                        : isDone
                          ? "text-[#C9D1D9]"
                          : "text-[#6E7681]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Result */}
          {phase === "done" && (
            <div className="mt-5 pt-4 border-t border-[#21262D] animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1.5 w-1.5 rounded-full bg-[#3FB950]" />
                <span className="text-[10px] text-[#3FB950] font-mono uppercase tracking-wider">
                  briefing ready · 2.3s · 94% confidence
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {OUTPUTS.map((o, i) => (
                  <span
                    key={o}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 border border-accent/20 text-[10px] text-accent font-mono"
                    style={{
                      animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both`,
                    }}
                  >
                    {o}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating pill callouts outside the terminal */}
      <div className="absolute -left-4 top-16 hidden md:block bg-surface-raised border border-border rounded-full shadow-xl px-3 py-1.5 text-[11px] font-medium text-text animate-float">
        <span className="font-display text-sm text-accent mr-1">2.3s</span>
        <span className="text-text-muted">briefing time</span>
      </div>
      <div className="absolute -right-6 bottom-24 hidden md:flex items-center gap-2 bg-surface-raised border border-border rounded-full shadow-xl px-3 py-1.5 text-[11px] font-medium text-text animate-float-delayed">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        Claude Sonnet 4.5
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(4px);
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
            transform: translateY(-4px);
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 4s ease-in-out 2s infinite;
        }
      `}</style>
    </div>
  );
}

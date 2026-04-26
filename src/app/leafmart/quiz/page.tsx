"use client";

import { useState } from "react";
import Link from "next/link";
import { LeafmartProductCard } from "@/components/leafmart/LeafmartProductCard";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";
import { topMatches, type QuizAnswers } from "@/lib/leafmart/recommender";

interface Step {
  key: keyof QuizAnswers;
  q: string;
  opts: string[];
}

const STEPS: Step[] = [
  { key: "goal", q: "What would you like to feel?", opts: ["Calmer in the evening", "Less pain after a long day", "Better sleep", "Clearer skin", "More focused"] },
  { key: "experience", q: "Have you used cannabis for wellness before?", opts: ["Yes, regularly", "Curious, not regular", "First time exploring", "I used to, took a break"] },
  { key: "restriction", q: "Any restrictions we should know about?", opts: ["I prefer non-intoxicating", "Open to THC (where legal)", "Topical only", "No preference"] },
];

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const done = step >= STEPS.length;

  function pick(opt: string) {
    const next = [...answers, opt];
    setAnswers(next);
    setStep(step + 1);
  }

  if (done) {
    const quizAnswers: QuizAnswers = {
      goal: answers[0] ?? "",
      experience: answers[1] ?? "",
      restriction: answers[2] ?? "",
    };
    const matches = topMatches(quizAnswers, DEMO_PRODUCTS, 3);

    return (
      <div className="min-h-[80vh] px-4 sm:px-6 lg:px-14 py-12 sm:py-16 max-w-[1440px] mx-auto lm-fade-in">
        <div className="text-center mb-10 sm:mb-12">
          <p className="eyebrow text-[var(--leaf)] mb-3">Your matches</p>
          <h1 className="font-display text-[34px] sm:text-[48px] lg:text-[56px] font-normal tracking-[-1.2px] sm:tracking-[-1.4px] leading-[1.05] sm:leading-[1.0] text-[var(--ink)]">
            {matches.length > 0 ? (
              <>Three products to <em className="font-accent not-italic text-[var(--leaf)]">consider</em>.</>
            ) : (
              <>Nothing matched <em className="font-accent not-italic text-[var(--leaf)]">exactly</em>.</>
            )}
          </h1>
          <p className="mt-4 text-[15px] sm:text-[17px] text-[var(--text-soft)] max-w-[520px] mx-auto leading-relaxed">
            {matches.length > 0
              ? "Based on your answers, our clinical team would point you toward these. No signup required to browse."
              : "Try retaking the quiz with broader options, or browse the full shelf."}
          </p>
        </div>

        {matches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-[18px] max-w-[960px] mx-auto lm-stagger">
            {matches.map(({ product, reasons }) => (
              <div key={product.slug} className="flex flex-col">
                <LeafmartProductCard product={product} />
                {reasons.length > 0 && (
                  <p className="text-[12px] text-[var(--leaf)] mt-2 px-1 font-medium">
                    Matched for: {reasons.join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-3 sm:gap-3.5">
          <button
            onClick={() => { setStep(0); setAnswers([]); }}
            className="rounded-full border-[1.5px] border-[var(--ink)] text-[var(--ink)] px-6 py-3.5 sm:py-3 text-[14.5px] sm:text-[15px] font-medium hover:bg-[var(--ink)] hover:text-[#FFF8E8] transition-colors w-full sm:w-auto"
          >
            Retake the quiz
          </button>
          <Link
            href="/leafmart/products"
            className="rounded-full bg-[var(--ink)] text-[#FFF8E8] px-6 py-3.5 sm:py-3 text-[14.5px] sm:text-[15px] font-medium hover:bg-[var(--leaf)] transition-colors w-full sm:w-auto inline-flex items-center justify-center"
          >
            Browse all products →
          </Link>
        </div>
      </div>
    );
  }

  const current = STEPS[step];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12" style={{ background: "var(--leaf)" }}>
      <div className="max-w-[640px] w-full text-center">
        {/* Progress */}
        <div className="flex gap-2 justify-center mb-8 sm:mb-10">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300 w-10 sm:w-12"
              style={{
                background: i <= step ? "#FFF8E8" : "rgba(255,248,232,0.25)",
              }}
            />
          ))}
        </div>

        <p className="text-[11px] sm:text-[11.5px] font-semibold tracking-[1.6px] uppercase text-[rgba(255,248,232,0.6)] mb-3 sm:mb-4">
          Question {step + 1} of {STEPS.length}
        </p>
        <h2
          key={step}
          className="font-display text-[28px] sm:text-[40px] lg:text-[48px] font-normal tracking-[-1.0px] sm:tracking-[-1.2px] leading-[1.1] sm:leading-[1.05] text-[#FFF8E8] mb-8 sm:mb-10 lm-fade-in-soft"
        >
          {current.q}
        </h2>

        <div className="flex flex-col gap-2.5 sm:gap-3 lm-stagger">
          {current.opts.map((opt) => (
            <button
              key={opt}
              onClick={() => pick(opt)}
              className="w-full rounded-2xl px-5 py-4 sm:p-5 text-left text-[15.5px] sm:text-[17px] font-medium text-[#FFF8E8] border border-[rgba(255,248,232,0.25)] hover:bg-[rgba(255,248,232,0.12)] hover:border-[rgba(255,248,232,0.5)] active:bg-[rgba(255,248,232,0.18)] transition-all"
            >
              {opt}
            </button>
          ))}
        </div>

        {step > 0 && (
          <button
            onClick={() => { setStep(step - 1); setAnswers(answers.slice(0, -1)); }}
            className="mt-5 sm:mt-6 text-sm text-[rgba(255,248,232,0.6)] hover:text-[#FFF8E8] transition-colors"
          >
            ← Go back
          </button>
        )}
      </div>
    </div>
  );
}

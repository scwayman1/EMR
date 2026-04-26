"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Cannabinoid = {
  name: string;
  color: string;
  border: string;
  text: string;
  bgLight: string;
  ring: string;
  ringOffset: string;
  shadow: string;
  effects: string;
  risks: string;
};

const CANNABINOIDS: Cannabinoid[] = [
  {
    name: "THC",
    color: "bg-amber-500",
    border: "border-amber-500",
    text: "text-amber-700",
    bgLight: "bg-amber-50",
    ring: "ring-amber-400",
    ringOffset: "ring-offset-amber-50",
    shadow: "shadow-amber-500/40",
    effects: "Pain relief, appetite, sleep, euphoria",
    risks: "Anxiety at high doses, impaired cognition, dependency risk",
  },
  {
    name: "CBD",
    color: "bg-emerald-500",
    border: "border-emerald-500",
    text: "text-emerald-700",
    bgLight: "bg-emerald-50",
    ring: "ring-emerald-400",
    ringOffset: "ring-offset-emerald-50",
    shadow: "shadow-emerald-500/40",
    effects: "Anxiety reduction, anti-inflammatory, seizure control",
    risks: "Fatigue, diarrhea, liver enzyme changes at high doses",
  },
  {
    name: "CBN",
    color: "bg-purple-500",
    border: "border-purple-500",
    text: "text-purple-700",
    bgLight: "bg-purple-50",
    ring: "ring-purple-400",
    ringOffset: "ring-offset-purple-50",
    shadow: "shadow-purple-500/40",
    effects: "Mild sedation, potential sleep aid",
    risks: "Limited research, may cause drowsiness",
  },
  {
    name: "CBG",
    color: "bg-blue-500",
    border: "border-blue-500",
    text: "text-blue-700",
    bgLight: "bg-blue-50",
    ring: "ring-blue-400",
    ringOffset: "ring-offset-blue-50",
    shadow: "shadow-blue-500/40",
    effects: "Anti-inflammatory, neuroprotective (preclinical)",
    risks: "Very limited clinical data",
  },
  {
    name: "THCV",
    color: "bg-rose-500",
    border: "border-rose-500",
    text: "text-rose-700",
    bgLight: "bg-rose-50",
    ring: "ring-rose-400",
    ringOffset: "ring-offset-rose-50",
    shadow: "shadow-rose-500/40",
    effects: "Appetite suppression, energy, focus",
    risks: "May reduce THC effects, limited studies",
  },
  {
    name: "CBC",
    color: "bg-teal-500",
    border: "border-teal-500",
    text: "text-teal-700",
    bgLight: "bg-teal-50",
    ring: "ring-teal-400",
    ringOffset: "ring-offset-teal-50",
    shadow: "shadow-teal-500/40",
    effects: "Anti-inflammatory, antidepressant (preclinical)",
    risks: "Insufficient human data",
  },
];

export type ComboWheelProps = {
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  variant?: "default" | "compact";
  onSelect?: (name: string | null) => void;
};

export function ComboWheel({
  className,
  showHeader = true,
  showFooter = true,
  variant = "default",
  onSelect,
}: ComboWheelProps = {}) {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = CANNABINOIDS.find((c) => c.name === selected);
  const isCompact = variant === "compact";

  const handleSelect = (name: string) => {
    const next = selected === name ? null : name;
    setSelected(next);
    onSelect?.(next);
  };

  return (
    <div className={cn("max-w-4xl mx-auto w-full", className)}>
      {showHeader && (
        <div className={cn("text-center", isCompact ? "mb-6" : "mb-10")}>
          <h2
            className={cn(
              "font-display text-text tracking-tight mb-3",
              isCompact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
            )}
          >
            Cannabinoid Wheel
          </h2>
          <p className="text-sm sm:text-base text-text-muted max-w-xl mx-auto leading-relaxed px-4">
            Tap a cannabinoid to learn about its effects and considerations.
          </p>
        </div>
      )}

      {/* 3-col grid on mobile (becomes 2 rows of 3), wraps freely on sm+. Prevents layout
          shift across embedding contexts because columns are deterministic. */}
      <div
        className={cn(
          "grid grid-cols-3 gap-3 justify-items-center sm:flex sm:flex-wrap sm:justify-center",
          isCompact ? "sm:gap-4 mb-6" : "sm:gap-6 mb-8 sm:mb-10"
        )}
        role="radiogroup"
        aria-label="Cannabinoids"
      >
        {CANNABINOIDS.map((c) => {
          const isSelected = selected === c.name;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => handleSelect(c.name)}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${c.name} cannabinoid`}
              className={cn(
                "relative rounded-full flex items-center justify-center text-white font-bold shadow-lg",
                "transition-all duration-300 ease-out will-change-transform",
                "hover:scale-110 hover:shadow-2xl active:scale-95",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                isCompact
                  ? "h-20 w-20 text-base sm:h-24 sm:w-24 sm:text-lg"
                  : "h-24 w-24 text-lg sm:h-28 sm:w-28 sm:text-xl md:h-32 md:w-32",
                c.color,
                c.ring,
                isSelected
                  ? cn(
                      "scale-110 ring-4 ring-offset-4 shadow-2xl",
                      c.ringOffset,
                      c.shadow
                    )
                  : "ring-0"
              )}
            >
              {c.name}
              {isSelected && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-0 rounded-full animate-ping opacity-30",
                    c.color
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {sel && (
        <Card
          tone="raised"
          className="rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 border border-border shadow-2xl"
        >
          <CardContent className="pt-6 pb-6 sm:pt-8 sm:pb-8">
            <h3 className="font-display text-2xl sm:text-3xl text-text mb-5 sm:mb-6 flex items-center gap-3">
              <span
                className={cn(
                  "inline-block w-4 h-4 rounded-full shadow-md",
                  sel.color,
                  sel.shadow
                )}
              />
              {sel.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div
                className={cn(
                  "rounded-2xl p-5 sm:p-6 border transition-shadow hover:shadow-md",
                  sel.bgLight,
                  sel.border
                )}
              >
                <p
                  className={cn(
                    "text-xs font-bold uppercase tracking-widest mb-3",
                    sel.text
                  )}
                >
                  Therapeutic effects
                </p>
                <p className="text-sm sm:text-base text-text leading-relaxed font-medium">
                  {sel.effects}
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-200 transition-shadow hover:shadow-md">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-700 mb-3">
                  Risks &amp; considerations
                </p>
                <p className="text-sm sm:text-base text-text leading-relaxed font-medium">
                  {sel.risks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showFooter && (
        <div className={cn("text-center", isCompact ? "mt-6" : "mt-8 sm:mt-10")}>
          <Link href="/portal/combo-wheel">
            <Button
              variant="secondary"
              size="lg"
              className="rounded-xl font-semibold w-full sm:w-auto"
            >
              Open full interactive wheel
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

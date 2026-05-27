"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * EMR-358 — public-facing dosing & concentration calculator.
 *
 * Patients (or anyone curious) plug in product concentration and target
 * total daily dose, and the calculator shows how much volume to take per
 * dose split across N daily doses. Knob-style sliders so it feels like a
 * toy, not a med-school worksheet — Dr. Patel directive: "fun > friction".
 */

type Unit = "mL" | "drops";

const DROPS_PER_ML = 20; // industry-standard tincture dropper.

export function DosingCalculator() {
  const [concentration, setConcentration] = React.useState(20); // mg active per mL
  const [dailyDoseMg, setDailyDoseMg] = React.useState(40);
  const [splits, setSplits] = React.useState(2);
  const [unit, setUnit] = React.useState<Unit>("mL");

  const totalMl = concentration > 0 ? dailyDoseMg / concentration : 0;
  const perDoseMl = splits > 0 ? totalMl / splits : 0;
  const perDoseDrops = perDoseMl * DROPS_PER_ML;

  const display = unit === "mL" ? perDoseMl : perDoseDrops;
  const displayLabel = unit === "mL" ? "mL per dose" : "drops per dose";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Knob
          label="Product concentration"
          value={concentration}
          onChange={setConcentration}
          min={1}
          max={100}
          step={1}
          unit="mg/mL"
          hint="How many milligrams of active cannabinoid per milliliter? Check the label."
        />
        <Knob
          label="Target daily dose"
          value={dailyDoseMg}
          onChange={setDailyDoseMg}
          min={1}
          max={200}
          step={1}
          unit="mg/day"
          hint="Total daily milligrams across all doses combined."
        />
        <Knob
          label="Doses per day"
          value={splits}
          onChange={setSplits}
          min={1}
          max={6}
          step={1}
          unit="× per day"
          hint="Split the daily dose into this many evenly-spaced doses."
        />
      </div>

      <div
        className="rounded-3xl border border-border bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-6 shadow-sm flex flex-col items-center justify-center text-center"
        aria-live="polite"
      >
        <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-semibold">
          Take per dose
        </p>
        <p className="font-display text-5xl tabular-nums text-emerald-900 mt-3">
          {Number.isFinite(display) ? display.toFixed(unit === "mL" ? 2 : 0) : "—"}
        </p>
        <p className="text-sm text-emerald-800/80 mt-1">{displayLabel}</p>

        <div
          role="tablist"
          aria-label="Volume unit"
          className="mt-5 inline-flex rounded-full border border-emerald-200 bg-white p-0.5"
        >
          {(["mL", "drops"] as Unit[]).map((u) => (
            <button
              key={u}
              role="tab"
              aria-selected={unit === u}
              onClick={() => setUnit(u)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                unit === u ? "bg-emerald-700 text-white" : "text-emerald-800",
              )}
            >
              {u}
            </button>
          ))}
        </div>

        <div className="mt-6 text-xs text-text-muted leading-relaxed">
          <p>
            That&apos;s {totalMl.toFixed(2)} mL total per day, split {splits}{" "}
            {splits === 1 ? "way" : "ways"}.
          </p>
          <p className="mt-1.5 text-[11px] text-text-subtle">
            For education only — confirm exact volumes with your clinician
            before changing your dose.
          </p>
        </div>
      </div>
    </div>
  );
}

function Knob({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-semibold text-text">{label}</label>
        <span className="font-display text-2xl tabular-nums text-emerald-700">
          {value}
          <span className="text-xs text-text-muted ml-1.5 font-sans">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-4 w-full appearance-none bg-transparent cursor-pointer focus:outline-none"
        style={{
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`,
          height: 6,
          borderRadius: 999,
        }}
      />
      <p className="mt-2 text-xs text-text-muted">{hint}</p>
    </div>
  );
}

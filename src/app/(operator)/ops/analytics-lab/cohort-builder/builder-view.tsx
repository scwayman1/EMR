"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const CONDITIONS = [
  { icd10: "G89.4", label: "Chronic Pain" },
  { icd10: "G47.00", label: "Insomnia" },
  { icd10: "F41.1", label: "Anxiety" },
  { icd10: "F43.10", label: "PTSD" },
  { icd10: "G43.909", label: "Migraine" },
  { icd10: "M19.90", label: "Arthritis" },
  { icd10: "R11.0", label: "Nausea" },
  { icd10: "G40.909", label: "Epilepsy" },
];

const PRODUCT_TYPES = [
  "Tincture",
  "Edible",
  "Vape",
  "Flower",
  "Topical",
  "Capsule",
  "Transdermal",
];

const CANNABINOIDS = ["THC", "CBD", "CBN", "CBG"];

type Step = 1 | 2 | 3 | 4 | 5;

export function BuilderView({ totalPatients }: { totalPatients: number }) {
  const [step, setStep] = useState<Step>(1);

  // Step 1: condition
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  // Step 2: demographics
  const [ageMin, setAgeMin] = useState<number>(18);
  const [ageMax, setAgeMax] = useState<number>(85);
  const [sex, setSex] = useState<"any" | "M" | "F">("any");
  // Step 3: treatment
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [cannabinoids, setCannabinoids] = useState<string[]>([]);
  const [dailyDoseMin, setDailyDoseMin] = useState<number>(0);
  const [dailyDoseMax, setDailyDoseMax] = useState<number>(100);
  // Step 4: outcomes
  const [metric, setMetric] = useState<
    "pain" | "sleep" | "anxiety" | "mood" | "nausea"
  >("pain");
  const [threshold, setThreshold] = useState<number>(25); // improvement %
  // Step 5: time
  const [windowDays, setWindowDays] = useState<number>(90);

  // Very rough cohort estimator (pure math on criteria — demo only).
  const estimatedCount = useMemo(() => {
    let frac = 1;
    if (selectedConditions.length === 0) frac *= 1;
    else frac *= Math.min(1, selectedConditions.length * 0.18);
    frac *= Math.max(0.2, Math.min(1, (ageMax - ageMin) / 67));
    if (sex !== "any") frac *= 0.52;
    if (productTypes.length > 0)
      frac *= Math.min(1, productTypes.length * 0.24);
    if (cannabinoids.length > 0)
      frac *= Math.min(1, cannabinoids.length * 0.33);
    const doseSpan = dailyDoseMax - dailyDoseMin;
    frac *= Math.max(0.3, Math.min(1, doseSpan / 100));
    frac *= Math.max(0.15, Math.min(1, 1 - threshold / 100));
    frac *= Math.max(0.4, Math.min(1, windowDays / 365));
    return Math.max(0, Math.round(totalPatients * frac));
  }, [
    selectedConditions,
    ageMin,
    ageMax,
    sex,
    productTypes,
    cannabinoids,
    dailyDoseMin,
    dailyDoseMax,
    threshold,
    windowDays,
    totalPatients,
  ]);

  function toggle(arr: string[], v: string, set: (a: string[]) => void) {
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else set([...arr, v]);
  }

  return (
    <>
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex items-center flex-1">
            <button
              onClick={() => setStep(n as Step)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                step === n
                  ? "bg-accent border-accent text-accent-ink"
                  : step > n
                    ? "bg-accent/20 border-accent/40 text-accent"
                    : "bg-surface border-border text-text-muted"
              )}
            >
              {n}
            </button>
            {n < 5 && (
              <div
                className={cn(
                  "flex-1 h-0.5",
                  step > n ? "bg-accent/40" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card tone="raised">
            {step === 1 && (
              <>
                <CardHeader>
                  <CardTitle>Step 1 · Condition</CardTitle>
                  <CardDescription>
                    Select one or more ICD-10 conditions to include.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c.icd10}
                        onClick={() =>
                          toggle(
                            selectedConditions,
                            c.icd10,
                            setSelectedConditions
                          )
                        }
                        className={cn(
                          "px-4 py-2 rounded-full border text-sm transition-all",
                          selectedConditions.includes(c.icd10)
                            ? "bg-accent text-accent-ink border-accent"
                            : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
                        )}
                      >
                        <span className="font-mono text-xs mr-2">
                          {c.icd10}
                        </span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </>
            )}

            {step === 2 && (
              <>
                <CardHeader>
                  <CardTitle>Step 2 · Demographics</CardTitle>
                  <CardDescription>
                    Age range and sex filters.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                        Min age
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={120}
                        value={ageMin}
                        onChange={(e) =>
                          setAgeMin(parseInt(e.target.value) || 0)
                        }
                        className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                        Max age
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={120}
                        value={ageMax}
                        onChange={(e) =>
                          setAgeMax(parseInt(e.target.value) || 0)
                        }
                        className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                      />
                    </label>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                      Sex
                    </span>
                    <div className="mt-1.5 flex gap-2">
                      {(["any", "M", "F"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSex(s)}
                          className={cn(
                            "h-9 px-4 rounded-full text-sm font-medium border transition-all capitalize",
                            sex === s
                              ? "bg-accent text-accent-ink border-accent"
                              : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
                          )}
                        >
                          {s === "any" ? "Any" : s}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {step === 3 && (
              <>
                <CardHeader>
                  <CardTitle>Step 3 · Treatment</CardTitle>
                  <CardDescription>
                    Product types, cannabinoids, and dosing range.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium mb-2">
                      Product types
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PRODUCT_TYPES.map((t) => (
                        <button
                          key={t}
                          onClick={() =>
                            toggle(productTypes, t, setProductTypes)
                          }
                          className={cn(
                            "h-9 px-4 rounded-full text-sm font-medium border transition-all",
                            productTypes.includes(t)
                              ? "bg-accent text-accent-ink border-accent"
                              : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-6">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium mb-2">
                      Cannabinoids
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CANNABINOIDS.map((c) => (
                        <button
                          key={c}
                          onClick={() =>
                            toggle(cannabinoids, c, setCannabinoids)
                          }
                          className={cn(
                            "h-9 px-4 rounded-full text-sm font-medium border transition-all",
                            cannabinoids.includes(c)
                              ? "bg-accent text-accent-ink border-accent"
                              : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                        Daily dose min (mg)
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={dailyDoseMin}
                        onChange={(e) =>
                          setDailyDoseMin(parseFloat(e.target.value) || 0)
                        }
                        className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                        Daily dose max (mg)
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={dailyDoseMax}
                        onChange={(e) =>
                          setDailyDoseMax(parseFloat(e.target.value) || 0)
                        }
                        className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                      />
                    </label>
                  </div>
                </CardContent>
              </>
            )}

            {step === 4 && (
              <>
                <CardHeader>
                  <CardTitle>Step 4 · Outcomes</CardTitle>
                  <CardDescription>
                    Minimum improvement threshold on a specific outcome metric.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium mb-2">
                      Outcome metric
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(["pain", "sleep", "anxiety", "mood", "nausea"] as const).map(
                        (m) => (
                          <button
                            key={m}
                            onClick={() => setMetric(m)}
                            className={cn(
                              "h-9 px-4 rounded-full text-sm font-medium border transition-all capitalize",
                              metric === m
                                ? "bg-accent text-accent-ink border-accent"
                                : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
                            )}
                          >
                            {m}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <label className="block">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                        Minimum improvement %
                      </span>
                      <span className="font-display text-lg text-text tabular-nums">
                        {threshold}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                      className="w-full accent-[color:var(--accent)]"
                    />
                  </label>
                </CardContent>
              </>
            )}

            {step === 5 && (
              <>
                <CardHeader>
                  <CardTitle>Step 5 · Time period</CardTitle>
                  <CardDescription>
                    How far back to look for patient history.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[30, 90, 180, 365, 730].map((d) => (
                      <button
                        key={d}
                        onClick={() => setWindowDays(d)}
                        className={cn(
                          "h-9 px-4 rounded-full text-sm font-medium border transition-all",
                          windowDays === d
                            ? "bg-accent text-accent-ink border-accent"
                            : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
                        )}
                      >
                        {d >= 365
                          ? `${Math.round(d / 365)}y`
                          : `${d}d`}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-border/60">
                    <Button>Save cohort</Button>
                    <Button variant="secondary">Export cohort CSV</Button>
                  </div>
                </CardContent>
              </>
            )}

            <div className="px-6 pb-6 flex justify-between">
              <Button
                variant="ghost"
                disabled={step === 1}
                onClick={() => setStep(Math.max(1, step - 1) as Step)}
              >
                ← Previous
              </Button>
              <Button
                variant="secondary"
                disabled={step === 5}
                onClick={() => setStep(Math.min(5, step + 1) as Step)}
              >
                Next →
              </Button>
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <div>
          <Card tone="raised" className="sticky top-6">
            <CardHeader>
              <CardTitle>Live cohort</CardTitle>
              <CardDescription>
                Estimated count based on current criteria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-display text-5xl text-accent tabular-nums">
                  {estimatedCount.toLocaleString()}
                </span>
                <span className="text-sm text-text-subtle">/ {totalPatients.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-surface-muted rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{
                    width: `${(estimatedCount / totalPatients) * 100}%`,
                  }}
                />
              </div>

              <div className="space-y-3 text-sm">
                <SummaryRow
                  label="Conditions"
                  value={
                    selectedConditions.length > 0
                      ? selectedConditions.join(", ")
                      : "Any"
                  }
                />
                <SummaryRow
                  label="Age"
                  value={`${ageMin}–${ageMax}`}
                />
                <SummaryRow label="Sex" value={sex === "any" ? "Any" : sex} />
                <SummaryRow
                  label="Products"
                  value={
                    productTypes.length > 0 ? productTypes.join(", ") : "Any"
                  }
                />
                <SummaryRow
                  label="Cannabinoids"
                  value={
                    cannabinoids.length > 0 ? cannabinoids.join(", ") : "Any"
                  }
                />
                <SummaryRow
                  label="Dose range"
                  value={`${dailyDoseMin}–${dailyDoseMax} mg/day`}
                />
                <SummaryRow
                  label="Outcome"
                  value={`${metric} · ≥${threshold}%`}
                />
                <SummaryRow
                  label="Window"
                  value={`${windowDays} days`}
                />
              </div>

              {estimatedCount < 30 && estimatedCount > 0 && (
                <div className="mt-4">
                  <Badge tone="warning">
                    Small cohort — consider broadening criteria
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium shrink-0">
        {label}
      </span>
      <span className="text-right text-text-muted text-xs max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

"use client";

import { useState, type KeyboardEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  checkInteractions,
  PUBLIC_CANNABINOID_CHOICES,
  type PublicCannabinoidChoice,
  type DrugMixResult,
} from "@/app/education/drug-mix/actions";
import {
  getSeverityLabel,
  type Severity,
} from "@/lib/domain/drug-interactions";

const CHOICE_LABELS: Record<PublicCannabinoidChoice, string> = {
  CBD: "CBD (non-intoxicating)",
  THC: "THC (intoxicating)",
  BALANCED: "Balanced 1:1 (THC + CBD)",
  CBG: "CBG",
};

const CHOICE_EMOJI: Record<PublicCannabinoidChoice, string> = {
  CBD: "🌿",
  THC: "🔥",
  BALANCED: "⚖️",
  CBG: "🌱",
};

const SEVERITY_TONE: Record<
  Severity,
  { tone: "danger" | "warning" | "success"; dot: string; border: string; bg: string }
> = {
  red: {
    tone: "danger",
    dot: "bg-red-500",
    border: "border-l-red-500",
    bg: "bg-red-50/40",
  },
  yellow: {
    tone: "warning",
    dot: "bg-amber-500",
    border: "border-l-amber-500",
    bg: "bg-amber-50/40",
  },
  green: {
    tone: "success",
    dot: "bg-emerald-500",
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/40",
  },
};

export function DrugMixUI() {
  const [medInput, setMedInput] = useState("");
  const [meds, setMeds] = useState<string[]>([]);
  const [cannabinoid, setCannabinoid] =
    useState<PublicCannabinoidChoice>("CBD");
  const [result, setResult] = useState<DrugMixResult | null>(null);
  const [loading, setLoading] = useState(false);

  function addCurrentMed() {
    const v = medInput.trim();
    if (!v) return;
    // De-dupe case-insensitively but preserve the user's casing.
    const lower = v.toLowerCase();
    if (meds.some((m) => m.toLowerCase() === lower)) {
      setMedInput("");
      return;
    }
    setMeds((prev) => [...prev, v]);
    setMedInput("");
  }

  function removeMed(idx: number) {
    setMeds((prev) => prev.filter((_, i) => i !== idx));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCurrentMed();
    } else if (e.key === "Backspace" && medInput === "" && meds.length > 0) {
      // Quick delete-last behaviour like most chip inputs.
      setMeds((prev) => prev.slice(0, -1));
    }
  }

  async function runCheck() {
    // If the user typed something and didn't press Enter, include it.
    const pending = medInput.trim();
    const medList = pending
      ? [...meds, pending].filter(
          (v, i, arr) =>
            arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i
        )
      : meds;

    if (medList.length === 0) return;

    setLoading(true);
    try {
      const r = await checkInteractions(medList, cannabinoid);
      setResult(r);
      setMeds(medList);
      setMedInput("");
    } finally {
      setLoading(false);
    }
  }

  const hasRun = result !== null;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card className="rounded-2xl">
        <CardContent className="pt-6 pb-6 space-y-6">
          {/* Medications chip input */}
          <div>
            <label
              htmlFor="drugmix-med-input"
              className="block text-sm font-medium text-text mb-2"
            >
              Your medications
            </label>
            <div
              className={cn(
                "rounded-2xl border border-border-strong bg-white px-3 py-2 min-h-14",
                "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20",
                "flex flex-wrap items-center gap-2 transition-colors"
              )}
            >
              {meds.map((m, i) => (
                <span
                  key={`${m}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent px-3 py-1 text-sm font-medium"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => removeMed(i)}
                    aria-label={`Remove ${m}`}
                    className="text-accent/60 hover:text-accent transition-colors -mr-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="drugmix-med-input"
                type="text"
                value={medInput}
                onChange={(e) => setMedInput(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={addCurrentMed}
                placeholder={
                  meds.length === 0
                    ? "Type a medication and press Enter (e.g. warfarin)"
                    : "Add another..."
                }
                className="flex-1 min-w-[160px] bg-transparent outline-none text-base text-text placeholder:text-text-subtle py-1"
              />
            </div>
            <p className="text-xs text-text-subtle mt-1.5">
              Press Enter or comma to add. You can add up to 25.
            </p>
          </div>

          {/* Cannabinoid dropdown */}
          <div>
            <label
              htmlFor="drugmix-cannabinoid"
              className="block text-sm font-medium text-text mb-2"
            >
              Cannabis product
            </label>
            <div className="relative">
              <select
                id="drugmix-cannabinoid"
                value={cannabinoid}
                onChange={(e) =>
                  setCannabinoid(e.target.value as PublicCannabinoidChoice)
                }
                className="w-full h-12 rounded-2xl border border-border-strong bg-white pl-12 pr-4 text-base text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 appearance-none"
              >
                {PUBLIC_CANNABINOID_CHOICES.map((c) => (
                  <option key={c} value={c}>
                    {CHOICE_LABELS[c]}
                  </option>
                ))}
              </select>
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none"
                aria-hidden
              >
                {CHOICE_EMOJI[cannabinoid]}
              </span>
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none"
                aria-hidden
              >
                ▾
              </span>
            </div>
          </div>

          <Button
            onClick={runCheck}
            disabled={
              loading || (meds.length === 0 && medInput.trim().length === 0)
            }
            className="rounded-2xl w-full h-12 text-base"
          >
            {loading ? "Checking..." : "Check interactions"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {hasRun && <ResultsPanel result={result!} />}

      {/* Always-visible disclaimer */}
      <p className="text-center text-xs text-text-subtle leading-relaxed max-w-lg mx-auto">
        This is not medical advice — talk to a clinician. Drug Mix is a free
        educational tool and may not reflect every known interaction. Always
        consult your prescriber or pharmacist before starting or stopping any
        medication.
      </p>
    </div>
  );
}

function ResultsPanel({ result }: { result: DrugMixResult }) {
  const { interactions, checkedCannabinoids, medicationCount } = result;

  // Compute the single worst severity to show a summary banner.
  const summary: Severity =
    interactions.some((i) => i.severity === "red")
      ? "red"
      : interactions.some((i) => i.severity === "yellow")
        ? "yellow"
        : "green";

  const summaryTone = SEVERITY_TONE[summary];
  const nothingToShow = medicationCount === 0;

  if (nothingToShow) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-text-muted">
            Add at least one medication above to run a check.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <Card
        className={cn(
          "rounded-2xl border-l-4",
          summaryTone.border,
          summaryTone.bg
        )}
      >
        <CardContent className="py-5">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "h-3 w-3 rounded-full",
                summaryTone.dot,
                "shadow-[0_0_0_4px_rgba(0,0,0,0.04)]"
              )}
              aria-hidden
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">
                {interactions.length === 0
                  ? "No known interactions found"
                  : `${interactions.length} interaction${
                      interactions.length === 1 ? "" : "s"
                    } found`}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Checked {medicationCount} medication
                {medicationCount === 1 ? "" : "s"} against{" "}
                {checkedCannabinoids.join(" + ")}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-pair rows */}
      {interactions.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-5 text-sm text-text-muted">
            Based on our public database, we did not find any documented
            interactions for the medications and cannabis product you selected.
            This does not guarantee safety — always confirm with a clinician.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {interactions.map((ix, i) => {
            const tone = SEVERITY_TONE[ix.severity];
            return (
              <li key={`${ix.drug}-${ix.cannabinoid}-${i}`}>
                <Card
                  className={cn(
                    "rounded-2xl border-l-4",
                    tone.border,
                    tone.bg
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={cn("h-2.5 w-2.5 rounded-full", tone.dot)}
                        aria-hidden
                      />
                      <span className="text-sm font-semibold text-text capitalize">
                        {ix.drug} + {ix.cannabinoid}
                      </span>
                      <Badge tone={tone.tone} className="ml-auto">
                        {getSeverityLabel(ix.severity)}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {ix.mechanism}
                    </p>
                    <p className="text-xs text-text-subtle mt-2">
                      <span className="font-medium">What to do:</span>{" "}
                      {ix.recommendation}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

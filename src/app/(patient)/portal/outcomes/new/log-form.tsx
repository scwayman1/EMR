"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { logOutcomeAction, type LogResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea, FieldGroup } from "@/components/ui/input";

const METRICS = [
  { value: "pain", label: "Pain" },
  { value: "sleep", label: "Sleep" },
  { value: "anxiety", label: "Anxiety" },
  { value: "mood", label: "Mood" },
  { value: "nausea", label: "Nausea" },
  { value: "appetite", label: "Appetite" },
  { value: "energy", label: "Energy" },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving\u2026" : "Save check-in"}
    </Button>
  );
}

export function LogOutcomeForm() {
  const [state, formAction] = useFormState<LogResult | null, FormData>(
    logOutcomeAction,
    null,
  );
  const [metric, setMetric] = useState<string>("pain");
  const [value, setValue] = useState<number>(5);

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup label="What are you tracking?" htmlFor="metric">
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => {
            const selected = metric === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetric(m.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                  selected
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-surface text-text-muted hover:bg-surface-muted"
                }`}
                aria-pressed={selected}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="metric" value={metric} />
      </FieldGroup>

      <FieldGroup
        label={`How is your ${metric} right now?`}
        htmlFor="value"
        hint="0 is none/best, 10 is worst."
      >
        <div className="flex items-center gap-4">
          <input
            id="value"
            name="value"
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={value}
            onChange={(e) => setValue(parseFloat(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="w-10 text-right text-sm font-semibold text-text tabular-nums">
            {value.toFixed(1)}
          </span>
        </div>
      </FieldGroup>

      <FieldGroup
        label="Anything to add?"
        htmlFor="note"
        hint="Optional. A quick note for your care team."
      >
        <Textarea
          id="note"
          name="note"
          rows={3}
          placeholder="e.g. better than yesterday, slept 6 hours\u2026"
        />
      </FieldGroup>

      {state?.ok === false && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}

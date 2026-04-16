"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { AssessmentDefinition } from "@/lib/domain/assessments";
import { submitAssessmentAction, type SubmitResult } from "./actions";
import { Button } from "@/components/ui/button";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending || disabled}>
      {pending ? "Saving\u2026" : "Submit"}
    </Button>
  );
}

export function AssessmentForm({ def }: { def: AssessmentDefinition }) {
  const action = submitAssessmentAction.bind(null, def.slug);
  const [state, formAction] = useFormState<SubmitResult | null, FormData>(
    action,
    null,
  );

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const allAnswered = def.questions.every((q) => q.id in answers);

  return (
    <form action={formAction} className="space-y-6">
      <ol className="space-y-6">
        {def.questions.map((q, idx) => (
          <li key={q.id}>
            <p className="text-sm font-medium text-text">
              <span className="text-text-subtle font-normal tabular-nums mr-2">
                {idx + 1}.
              </span>
              {q.text}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.choices.map((c) => {
                const selected = answers[q.id] === c.value;
                const fieldId = `${q.id}-${c.value}`;
                return (
                  <label
                    key={fieldId}
                    htmlFor={fieldId}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-surface text-text-muted hover:bg-surface-muted"
                    }`}
                  >
                    <input
                      id={fieldId}
                      type="radio"
                      name={q.id}
                      value={c.value}
                      checked={selected}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: c.value }))
                      }
                      className="sr-only"
                    />
                    {c.label}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {state?.ok === false && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-xs text-text-subtle">
          {Object.keys(answers).length} of {def.questions.length} answered
        </p>
        <SubmitButton disabled={!allAnswered} />
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LeafSprig } from "@/components/ui/ornament";
import { explainBillForPatient } from "./actions";

// ---------------------------------------------------------------------------
// "Explain this bill like I'm in 3rd grade" — EMR-068
// ---------------------------------------------------------------------------
// Loaded under each statement on the patient billing portal. Calls the
// patientExplanation agent via the explainBillForPatient server action and
// renders the warm, plain-language summary inline.
// ---------------------------------------------------------------------------

interface Props {
  statementId: string;
  initialSummary?: string | null;
}

export function ExplainBillButton({ statementId, initialSummary }: Props) {
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function explain() {
    setError(null);
    startTransition(async () => {
      const result = await explainBillForPatient(statementId);
      if (result.ok && result.summary) {
        setSummary(result.summary);
      } else {
        setError(result.error ?? "Couldn't generate an explanation right now.");
      }
    });
  }

  // If we already have a summary inline (auto-populated on issuance), show it.
  if (summary) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-accent/[0.06] border border-accent/20">
        <div className="flex items-start gap-2">
          <LeafSprig size={14} className="text-accent mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-accent mb-1">
              Explained like you&apos;re in 3rd grade
            </p>
            <p className="text-sm text-text leading-relaxed">{summary}</p>
            <button
              type="button"
              onClick={explain}
              disabled={pending}
              className="text-[11px] text-accent hover:underline mt-2 disabled:opacity-50"
            >
              {pending ? "Re-writing…" : "Try a fresh explanation"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={explain}
        disabled={pending}
      >
        <LeafSprig size={12} className="text-current mr-1.5" />
        {pending ? "Asking the AI…" : "Explain this bill like I'm in 3rd grade"}
      </Button>
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </div>
  );
}

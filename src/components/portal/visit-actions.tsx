"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmEncounter } from "@/app/actions/encounterActions";

interface VisitActionsProps {
  encounterId: string;
  isConfirmed?: boolean;
}

/**
 * Client-side Confirm / Change buttons for the "Next visit" card.
 * Calls the `confirmEncounter` server action and shows inline feedback.
 */
export function VisitActions({ encounterId, isConfirmed = false }: VisitActionsProps) {
  const [confirmed, setConfirmed] = useState(isConfirmed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmEncounter(encounterId);
      if (result.success) {
        setConfirmed(true);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  if (confirmed) {
    return (
      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-accent font-medium">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
            <path
              d="M4 8.5L6.5 11L12 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Confirmed
        </div>
        <Button size="sm" variant="ghost">
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={isPending}
        >
          {isPending ? "Confirming…" : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost">
          Change
        </Button>
      </div>
      {error && (
        <p className="text-xs text-danger mt-2">{error}</p>
      )}
    </div>
  );
}

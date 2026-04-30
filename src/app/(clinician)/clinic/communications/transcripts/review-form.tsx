"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { Textarea, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { reviewTranscriptAction, type ReviewResult } from "./actions";

export function TranscriptReviewForm({
  transcriptId,
}: {
  transcriptId: string;
}) {
  const [state, formAction] = useFormState<ReviewResult | null, FormData>(
    reviewTranscriptAction,
    null,
  );
  const [decision, setDecision] = useState<"approve" | "reject">("approve");

  return (
    <form action={formAction} className="space-y-3 border-t border-border pt-3">
      <input type="hidden" name="transcriptId" value={transcriptId} />
      <input type="hidden" name="decision" value={decision} />

      <Textarea
        name="reviewerNote"
        rows={2}
        maxLength={1000}
        placeholder="Optional reviewer note…"
      />
      <Input
        name="attachToEncounterId"
        placeholder="Attach to encounter ID (optional)"
      />

      {state?.ok === false && (
        <p className="text-xs text-danger">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          variant="secondary"
          onClick={() => setDecision("reject")}
        >
          Reject
        </Button>
        <Button
          type="submit"
          variant="primary"
          onClick={() => setDecision("approve")}
        >
          Approve
        </Button>
      </div>
    </form>
  );
}

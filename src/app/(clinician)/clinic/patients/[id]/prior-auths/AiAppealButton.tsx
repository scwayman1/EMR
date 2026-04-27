"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { triggerAiAppealAction } from "./actions";

// ---------------------------------------------------------------------------
// AI Appeal button (EMR-076)
// ---------------------------------------------------------------------------
// Click → server action enqueues a `medication.pa.appeal.requested` event,
// which dispatches an AgentJob to the medicationPaAppeal agent. The agent
// runs in the background and writes the drafted letter back to
// MedicationPriorAuth.appealLetterMd. This component shows the button + the
// queued/drafted state so the clinician can see progress at a glance.
// ---------------------------------------------------------------------------

interface Props {
  patientId: string;
  priorAuthId: string;
  appealStatus?: string | null;
  hasDraft: boolean;
}

export function AiAppealButton({
  patientId,
  priorAuthId,
  appealStatus,
  hasDraft,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

  const status = optimisticStatus ?? appealStatus ?? "none";

  function trigger() {
    setError(null);
    setOptimisticStatus("queued");
    startTransition(async () => {
      const result = await triggerAiAppealAction(patientId, priorAuthId);
      if (!result.ok) {
        setOptimisticStatus(null);
        setError(result.error ?? "Couldn't start appeal");
      }
    });
  }

  if (status === "drafted" || hasDraft) {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="success">Appeal drafted</Badge>
        <span className="text-xs text-text-muted">
          Review the letter below, then sign and submit.
        </span>
      </div>
    );
  }

  if (status === "queued") {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="warning">AI drafting…</Badge>
        <span className="text-xs text-text-muted">
          We&apos;ll have a draft ready in about a minute.
        </span>
      </div>
    );
  }

  return (
    <div>
      <Button type="button" size="sm" onClick={trigger} disabled={pending}>
        {pending ? "Starting…" : "AI Appeal"}
      </Button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

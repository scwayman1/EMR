"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  recordVoicemailAction,
  type RecordVoicemailResult,
} from "./actions";

interface Teammate {
  id: string;
  name: string;
}

export function LogVoicemailForm({ teammates }: { teammates: Teammate[] }) {
  const [state, formAction] = useFormState<
    RecordVoicemailResult | null,
    FormData
  >(recordVoicemailAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="vm-from">From</Label>
        <Input
          id="vm-from"
          name="fromNumber"
          required
          placeholder="+1 555-555-1234"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="vm-duration">Duration (s)</Label>
          <Input
            id="vm-duration"
            name="durationSeconds"
            type="number"
            min={1}
            max={1800}
            placeholder="45"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vm-patient">Patient ID</Label>
          <Input id="vm-patient" name="patientId" placeholder="optional" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="vm-audio">Audio storage key</Label>
        <Input
          id="vm-audio"
          name="audioStorageKey"
          placeholder="s3://voicemails/2026/04/…"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="vm-transcript">Raw transcript</Label>
        <Textarea
          id="vm-transcript"
          name="rawTranscript"
          rows={4}
          maxLength={20000}
          placeholder="Paste the recording transcript — PHI will be redacted before persistence."
        />
        <p className="text-[10px] text-text-subtle">
          Phone numbers, emails, addresses, MRNs, SSNs and credit cards are
          stripped server-side. Only clinical sentences are kept.
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="vm-assign">Assign to (optional)</Label>
        <select
          id="vm-assign"
          name="assignedToUserId"
          className="h-9 px-3 text-sm rounded-md border border-border-strong bg-surface w-full"
        >
          <option value="">Unassigned</option>
          {teammates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {state?.ok === false && (
        <p className="text-xs text-danger">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-xs text-success">Voicemail logged.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit">Log voicemail</Button>
      </div>
    </form>
  );
}

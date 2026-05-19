"use client";

import { useFormState } from "react-dom";
import { useRef, useState, useEffect } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  scheduleBeamMeetingAction,
  type ScheduleBeamResult,
} from "./actions";

interface ProviderOption {
  userId: string;
  name: string;
  title: string | null;
}

export function BeamScheduleForm({
  providerOptions,
}: {
  providerOptions: ProviderOption[];
}) {
  const [state, formAction] = useFormState<ScheduleBeamResult | null, FormData>(
    scheduleBeamMeetingAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [target, setTarget] = useState<"patient" | "provider">("patient");

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="beam-topic">Topic</Label>
        <Input
          id="beam-topic"
          name="topic"
          required
          maxLength={200}
          placeholder="e.g. Maya Reyes — follow-up consult"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="beam-when">Start time</Label>
          <Input
            id="beam-when"
            name="scheduledFor"
            type="datetime-local"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="beam-duration">Duration (minutes)</Label>
          <Input
            id="beam-duration"
            name="durationMinutes"
            type="number"
            min={15}
            max={480}
            defaultValue={30}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Counterparty</Label>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setTarget("patient")}
            className={`flex-1 px-3 py-1.5 rounded-md border ${
              target === "patient"
                ? "bg-accent/10 border-accent/30 text-text"
                : "border-border text-text-muted hover:bg-surface-muted"
            }`}
          >
            Patient
          </button>
          <button
            type="button"
            onClick={() => setTarget("provider")}
            className={`flex-1 px-3 py-1.5 rounded-md border ${
              target === "provider"
                ? "bg-accent/10 border-accent/30 text-text"
                : "border-border text-text-muted hover:bg-surface-muted"
            }`}
          >
            Provider
          </button>
        </div>
      </div>

      {target === "patient" ? (
        <div className="space-y-1">
          <Label htmlFor="beam-patient">Patient ID</Label>
          <Input
            id="beam-patient"
            name="patientId"
            placeholder="Patient ID"
            required
          />
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="beam-provider">Provider</Label>
          <select
            id="beam-provider"
            name="providerUserId"
            required
            className="h-9 px-3 text-sm rounded-md border border-border-strong bg-surface w-full"
          >
            <option value="">Select a provider…</option>
            {providerOptions.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.name}
                {p.title ? ` (${p.title})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {state?.ok === false && (
        <p className="text-xs text-danger">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-xs text-success">
          Meeting scheduled.
          {state.mode === "dev-shim" && " (dev shim — no Beam API call)"}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit">Schedule HIPAA Beam</Button>
      </div>
    </form>
  );
}

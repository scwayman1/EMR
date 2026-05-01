"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendFaxAction, type SendFaxResult } from "./actions";

export function FaxComposeForm() {
  const [state, formAction] = useFormState<SendFaxResult | null, FormData>(
    sendFaxAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="fax-to">To</Label>
          <Input
            id="fax-to"
            name="toNumber"
            placeholder="+1 555-555-1234"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fax-from">From</Label>
          <Input
            id="fax-from"
            name="fromNumber"
            placeholder="+1 555-000-0000"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="fax-pages">Pages</Label>
          <Input
            id="fax-pages"
            name="pageCount"
            type="number"
            min={1}
            max={500}
            placeholder="1"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fax-patient">Patient ID (optional)</Label>
          <Input
            id="fax-patient"
            name="patientId"
            placeholder="Patient ID"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="fax-notes">Cover note (optional)</Label>
        <Textarea
          id="fax-notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="Reason for fax / cover sheet body…"
        />
      </div>

      {state?.ok === false && (
        <p className="text-xs text-danger">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-xs text-success">Fax queued for delivery.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit">Queue fax</Button>
      </div>
    </form>
  );
}

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FieldGroup } from "@/components/ui/input";

export type NewThreadResult = { ok: true } | { ok: false; error: string };

/**
 * New-thread form. Subject + first message. The server action is
 * passed in; the route supplies its own authorization (patient =
 * self-only; clinician = any patient in the org).
 */
export function NewThreadForm({
  action,
  defaultSubject,
  defaultRecipient,
  recipientLabel,
}: {
  action: (
    prev: NewThreadResult | null,
    formData: FormData,
  ) => Promise<NewThreadResult>;
  defaultSubject?: string;
  defaultRecipient?: string;
  recipientLabel?: string;
}) {
  const [state, formAction] = useFormState<NewThreadResult | null, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {recipientLabel && (
        <div className="rounded-md bg-surface-muted border border-border px-3 py-2 text-sm text-text-muted">
          To: <span className="text-text font-medium">{recipientLabel}</span>
        </div>
      )}

      <FieldGroup label="Subject" htmlFor="subject">
        <Input
          id="subject"
          name="subject"
          required
          defaultValue={defaultSubject}
          placeholder="e.g. Question about my next visit"
        />
      </FieldGroup>

      <FieldGroup label="Message" htmlFor="body">
        <Textarea
          id="body"
          name="body"
          rows={5}
          required
          placeholder="Type your message\u2026"
        />
      </FieldGroup>

      {defaultRecipient && (
        <input type="hidden" name="patientId" value={defaultRecipient} />
      )}

      {state?.ok === false && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <div className="flex items-center justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending\u2026" : "Send message"}
    </Button>
  );
}

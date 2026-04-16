"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea, FieldGroup } from "@/components/ui/input";

export type ReplyResult = { ok: true } | { ok: false; error: string };

/**
 * Reply form for an existing thread. The server action is passed in
 * as `action` so patient and clinician routes can supply their own
 * authorization logic. The form is auto-reset on a successful send.
 */
export function ReplyForm({
  action,
}: {
  action: (prev: ReplyResult | null, formData: FormData) => Promise<ReplyResult>;
}) {
  const [state, formAction] = useFormState<ReplyResult | null, FormData>(
    action,
    null,
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await formAction(fd);
        formRef.current?.reset();
      }}
      className="space-y-3"
    >
      <FieldGroup label="Your reply" htmlFor="body">
        <Textarea
          id="body"
          name="body"
          rows={3}
          required
          placeholder="Type your message\u2026"
        />
      </FieldGroup>

      {state?.ok === false && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending\u2026" : "Send"}
    </Button>
  );
}

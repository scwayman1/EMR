"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { sendClinicReplyAction } from "./actions";
import type { ReplyResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

function ClinicReplySubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending..." : "Send"}
    </Button>
  );
}

export function ClinicReplyCompose({ threadId }: { threadId: string }) {
  const [state, formAction] = useFormState<ReplyResult | null, FormData>(
    sendClinicReplyAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-t border-border p-4 bg-surface"
    >
      <input type="hidden" name="threadId" value={threadId} />
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Textarea
            name="body"
            rows={2}
            placeholder="Type your reply..."
            required
            className="resize-none"
          />
        </div>
        <ClinicReplySubmitButton />
      </div>
      {state?.ok === false && (
        <p className="text-xs text-danger mt-2">{state.error}</p>
      )}
    </form>
  );
}

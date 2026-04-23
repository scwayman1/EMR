"use client";

import { useFormState, useFormStatus } from "react-dom";
import { runResearchQuery, type ResearchResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="shrink-0">
      {pending ? "Searching…" : "Search evidence"}
    </Button>
  );
}

export function ResearchSearchForm() {
  const [state, formAction] = useFormState<ResearchResult | null, FormData>(
    runResearchQuery,
    null
  );

  return (
    <form action={formAction}>
      <div className="flex items-center gap-3">
        <Input
          id="query"
          name="query"
          required
          placeholder="symptom, condition, or treatment…"
          className="flex-1"
        />
        <SubmitButton />
      </div>
      {state?.ok === false && (
        <p className="text-sm text-danger mt-3">{state.error}</p>
      )}
      {state?.ok && (
        <div className="flex items-center gap-2 mt-3">
          <Badge tone="success">Done</Badge>
          <p className="text-sm text-success">
            Results ready below.
          </p>
        </div>
      )}
    </form>
  );
}

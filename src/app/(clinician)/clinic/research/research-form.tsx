"use client";

import { useFormState, useFormStatus } from "react-dom";
import { runResearchQuery, type ResearchResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, FieldGroup } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Searching…" : "Search"}
    </Button>
  );
}

export function ResearchSearchForm() {
  const [state, formAction] = useFormState<ResearchResult | null, FormData>(
    runResearchQuery,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup label="Query" htmlFor="query">
        <Input
          id="query"
          name="query"
          required
          placeholder="e.g. neuropathic pain"
        />
      </FieldGroup>
      {state?.ok === false && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-sm text-success">
          Query submitted. Results appear below once the research agent finishes.
        </p>
      )}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

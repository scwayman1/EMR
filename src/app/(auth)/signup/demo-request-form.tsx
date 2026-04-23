"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestDemoAction, type DemoRequestResult } from "./demo-actions";
import { Button } from "@/components/ui/button";
import { Input, FieldGroup } from "@/components/ui/input";
import { LeafSprig } from "@/components/ui/ornament";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Submitting..." : "Request demo"}
    </Button>
  );
}

export function DemoRequestForm() {
  const [state, formAction] = useFormState<DemoRequestResult | null, FormData>(
    requestDemoAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="text-center py-8">
        <LeafSprig size={32} className="text-accent mx-auto mb-4" />
        <h2 className="font-display text-2xl text-text tracking-tight mb-3">
          Thank you!
        </h2>
        <p className="text-sm text-text-muted leading-relaxed max-w-sm mx-auto">
          We received your request. Our team will review it and send you access
          credentials within 24 hours. Keep an eye on your inbox.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="First name" htmlFor="firstName">
          <Input
            id="firstName"
            name="firstName"
            required
            autoComplete="given-name"
          />
        </FieldGroup>
        <FieldGroup label="Last name" htmlFor="lastName">
          <Input
            id="lastName"
            name="lastName"
            required
            autoComplete="family-name"
          />
        </FieldGroup>
      </div>
      <FieldGroup label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </FieldGroup>
      <FieldGroup label="Practice name" htmlFor="practice">
        <Input
          id="practice"
          name="practice"
          placeholder="Optional"
          autoComplete="organization"
        />
      </FieldGroup>
      {state && !state.ok && (
        <p className="text-sm text-danger -mt-2">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}

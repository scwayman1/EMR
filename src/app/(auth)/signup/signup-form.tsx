"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signupAction, type ActionResult } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, FieldGroup } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(signupAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="First name" htmlFor="firstName">
          <Input id="firstName" name="firstName" required autoComplete="given-name" />
        </FieldGroup>
        <FieldGroup label="Last name" htmlFor="lastName">
          <Input id="lastName" name="lastName" required autoComplete="family-name" />
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
      <FieldGroup
        label="Password"
        htmlFor="password"
        hint="At least 8 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </FieldGroup>
      {state && !state.ok && (
        <p className="text-sm text-danger -mt-2">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}

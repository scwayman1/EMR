"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type ActionResult } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, FieldGroup } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
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
      <FieldGroup label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </FieldGroup>
      {state && !state.ok && (
        <p className="text-sm text-danger -mt-2">{state.error}</p>
      )}
      <SubmitButton />
      <p className="text-xs text-text-subtle text-center pt-2">
        Demo credentials: <span className="font-mono">patient@demo.health</span> / <span className="font-mono">password123</span>
      </p>
    </form>
  );
}

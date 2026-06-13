"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormRow, Input } from "@/components/ui/Field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in →"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <FormRow label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
      </FormRow>
      <FormRow label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </FormRow>
      {state.error ? (
        <p className="text-xs text-danger">{state.error}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

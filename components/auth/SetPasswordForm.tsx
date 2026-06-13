"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setPassword, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormRow, Input } from "@/components/ui/Field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Setting up…" : "Enter the portal →"}
    </Button>
  );
}

export function SetPasswordForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    setPassword,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormRow label="Your name" htmlFor="full_name">
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          defaultValue={defaultName}
          placeholder="Jane Smith"
        />
      </FormRow>
      <FormRow label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
        />
      </FormRow>
      <FormRow label="Confirm password" htmlFor="confirm">
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
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

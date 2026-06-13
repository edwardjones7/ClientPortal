"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  inviteTeammate,
  updateName,
  type SettingsState,
} from "@/app/(client)/settings/actions";
import { Button } from "@/components/ui/Button";
import { FormRow, Input } from "@/components/ui/Field";
import { CopyLink } from "@/components/ui/CopyLink";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function NameForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState<SettingsState, FormData>(updateName, {});
  return (
    <form action={action} className="space-y-3">
      <FormRow label="Your name" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={defaultName} />
      </FormRow>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-resolved">{state.message}</p> : null}
      <Submit label="Save →" />
    </form>
  );
}

export function TeammateForm() {
  const [state, action] = useActionState<SettingsState, FormData>(
    inviteTeammate,
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="full_name" placeholder="Name" className="sm:max-w-40" />
        <Input
          name="email"
          type="email"
          required
          placeholder="teammate@company.com"
          className="flex-1"
        />
        <Submit label="Invite →" />
      </div>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      {state.ok ? (
        <div className="space-y-2 rounded-md border border-resolved/30 bg-resolved/5 p-3">
          <p className="text-xs text-resolved">{state.message}</p>
          {state.link ? <CopyLink link={state.link} /> : null}
        </div>
      ) : null}
    </form>
  );
}

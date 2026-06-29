"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createOrgAndInvite, type InviteFormState } from "@/app/(admin)/actions";
import { Button } from "@/components/ui/Button";
import { FormRow, Input } from "@/components/ui/Field";
import { CopyLink } from "@/components/ui/CopyLink";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create client & invite →"}
    </Button>
  );
}

export function CreateOrgForm() {
  const [state, action] = useActionState<InviteFormState, FormData>(
    createOrgAndInvite,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormRow label="Business name" htmlFor="org_name" hint="e.g. Smith Roofing">
        <Input id="org_name" name="org_name" required placeholder="Smith Roofing" />
      </FormRow>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Contact name" htmlFor="full_name">
          <Input id="full_name" name="full_name" placeholder="Jane Smith" />
        </FormRow>
        <FormRow label="Contact email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="jane@smithroofing.com"
          />
        </FormRow>
      </div>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      {state.ok ? (
        <div className="space-y-2 rounded-md border border-resolved/30 bg-resolved/5 p-3">
          <p className="text-xs text-resolved">{state.message}</p>
          {state.link ? <CopyLink link={state.link} /> : null}
          <p className="meta">
            Copy this link and send it to the client. It works for 12 hours and
            can be opened any number of times — it&apos;s used up only once they
            set their password.
          </p>
        </div>
      ) : null}
      <Submit />
    </form>
  );
}

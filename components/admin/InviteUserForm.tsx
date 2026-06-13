"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { inviteToExistingOrg, type InviteFormState } from "@/app/(admin)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { CopyLink } from "@/components/ui/CopyLink";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Inviting…" : "Invite →"}
    </Button>
  );
}

/** Invite an additional teammate into an existing org (admin side). */
export function InviteUserForm({ orgId }: { orgId: string }) {
  const [state, action] = useActionState<InviteFormState, FormData>(
    inviteToExistingOrg,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="org_id" value={orgId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="full_name" placeholder="Name" className="sm:max-w-40" />
        <Input
          name="email"
          type="email"
          required
          placeholder="email@company.com"
          className="flex-1"
        />
        <Submit />
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

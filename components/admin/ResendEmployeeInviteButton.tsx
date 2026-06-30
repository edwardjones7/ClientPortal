"use client";

import { useState, useTransition } from "react";
import { resendEmployeeInvite, type InviteFormState } from "@/app/(admin)/actions";
import { Button } from "@/components/ui/Button";
import { CopyLink } from "@/components/ui/CopyLink";

/** Generates a fresh invite link for an employee whose first link expired. */
export function ResendEmployeeInviteButton({
  email,
  fullName,
}: {
  email: string;
  fullName: string;
}) {
  const [state, setState] = useState<InviteFormState | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setState(await resendEmployeeInvite(email, fullName));
          })
        }
      >
        {pending ? "Generating…" : state?.link ? "New link →" : "Resend invite"}
      </Button>
      {state?.error ? (
        <p className="text-xs text-danger">{state.error}</p>
      ) : null}
      {state?.link ? (
        <div className="w-72 space-y-2 rounded-md border border-resolved/30 bg-resolved/5 p-3">
          <p className="text-xs text-resolved">{state.message}</p>
          <CopyLink link={state.link} />
        </div>
      ) : null}
    </div>
  );
}

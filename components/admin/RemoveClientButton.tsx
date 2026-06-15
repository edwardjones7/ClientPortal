"use client";

import { useState, useTransition } from "react";
import { removeClient } from "@/app/(admin)/actions";
import { Button } from "@/components/ui/Button";

/**
 * Two-step destructive action: click "Remove" → confirm. Permanently deletes
 * the client org, its members' logins, and all their tickets/chat.
 */
export function RemoveClientButton({
  orgId,
  name,
}: {
  orgId: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
        Remove client
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <p className="max-w-xs text-right text-xs text-muted">
        Permanently delete <span className="text-fg">{name}</span> — their
        logins, tickets, and chat. This can&apos;t be undone.
      </p>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const res = await removeClient(orgId);
              if (res?.error) setError(res.error);
              // success redirects to /admin/clients
            });
          }}
        >
          {pending ? "Removing…" : "Yes, remove"}
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

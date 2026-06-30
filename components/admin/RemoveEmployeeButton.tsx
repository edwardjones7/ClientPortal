"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeEmployee } from "@/app/(admin)/actions";
import { Button } from "@/components/ui/Button";

/**
 * Two-step destructive action: click "Remove" → confirm. Permanently deletes
 * the employee's login (and cascades their training progress + assignments).
 */
export function RemoveEmployeeButton({
  profileId,
  name,
}: {
  profileId: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Remove
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <p className="max-w-xs text-right text-xs text-muted">
        Remove <span className="text-fg">{name}</span> — their login and training
        record. This can&apos;t be undone.
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
              const res = await removeEmployee(profileId);
              if (res?.error) setError(res.error);
              else router.refresh();
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

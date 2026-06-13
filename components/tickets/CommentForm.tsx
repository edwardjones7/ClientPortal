"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment } from "@/app/actions/tickets";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

/** Post a reply to a ticket thread, then refresh the server-rendered feed. */
export function CommentForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addComment({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Textarea
        name="body"
        rows={3}
        required
        placeholder="Write a reply…"
        disabled={pending}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send →"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTicket, type TicketFormState } from "@/app/actions/tickets";
import { Button } from "@/components/ui/Button";
import { FormRow, Input, Select, Textarea } from "@/components/ui/Field";
import { TICKET_CATEGORY, TICKET_PRIORITY } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Submitting…" : "Submit request →"}
    </Button>
  );
}

export function NewTicketForm() {
  const [state, action] = useActionState<TicketFormState, FormData>(
    createTicket,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <FormRow label="What do you need?" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          placeholder="Update the hero image on the homepage"
        />
      </FormRow>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Type" htmlFor="category">
          <Select id="category" name="category" defaultValue="website_update">
            {Object.entries(TICKET_CATEGORY).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Priority" htmlFor="priority">
          <Select id="priority" name="priority" defaultValue="normal">
            {Object.entries(TICKET_PRIORITY).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormRow>
      </div>

      <FormRow
        label="Details"
        htmlFor="description"
        hint="Links, copy, context — whatever helps us get it right the first time."
      >
        <Textarea
          id="description"
          name="description"
          rows={6}
          placeholder="Describe the change. Paste any links or copy here."
        />
      </FormRow>

      <FormRow label="Attachments" htmlFor="files" hint="Optional. Images, PDFs, docs.">
        <input
          id="files"
          name="files"
          type="file"
          multiple
          className="block w-full text-sm text-muted file:mr-4 file:rounded-md file:border file:border-border-strong file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-fg hover:file:bg-elevated"
        />
      </FormRow>

      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <Submit />
    </form>
  );
}

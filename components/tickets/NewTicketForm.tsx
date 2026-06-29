"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTicket } from "@/app/actions/tickets";
import { createClient } from "@/lib/supabase/client";
import { uploadTicketAttachments } from "@/lib/attachments";
import { Button } from "@/components/ui/Button";
import { FormRow, Input, Select, Textarea } from "@/components/ui/Field";
import { TICKET_CATEGORY, TICKET_PRIORITY } from "@/lib/types";

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NewTicketForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const picked = Array.from(list).filter((f) => f.size > 0);
    setFiles((prev) => [...prev, ...picked]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSubmit(formData: FormData) {
    // Ticket already created but some files failed → this click just continues.
    if (createdId) {
      router.push(`/tickets/${createdId}`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createTicket(formData);
      if (result.error || !result.ticketId || !result.orgId) {
        setError(result.error ?? "Couldn't create the ticket. Try again.");
        return;
      }

      if (files.length > 0) {
        const supabase = createClient();
        const { failed } = await uploadTicketAttachments(supabase, {
          orgId: result.orgId,
          ticketId: result.ticketId,
          files,
        });
        if (failed.length > 0) {
          // The ticket exists — don't lose it. Let them continue to it.
          setCreatedId(result.ticketId);
          setError(
            `Your ticket was created, but ${failed.length} file${
              failed.length > 1 ? "s" : ""
            } couldn't upload. Continue and re-add them from the ticket.`,
          );
          return;
        }
      }

      router.push(`/tickets/${result.ticketId}`);
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
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

      <FormRow label="Attachments" htmlFor="files" hint="Optional. Photos, PDFs, docs.">
        {/* Hidden native inputs; the buttons below drive them. On mobile the
            library picker offers Photo Library + Files, and the camera input
            opens the camera directly. */}
        <input
          ref={libraryRef}
          id="files"
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => libraryRef.current?.click()}
          >
            Choose files
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => cameraRef.current?.click()}
          >
            Take photo
          </Button>
        </div>

        {files.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-fg">
                  {f.name || `photo-${i + 1}.jpg`}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {fileSize(f.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={pending}
                  className="shrink-0 text-xs text-muted hover:text-danger disabled:pointer-events-none"
                  aria-label={`Remove ${f.name || "file"}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </FormRow>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {createdId
          ? "Continue to your ticket →"
          : pending
            ? "Submitting…"
            : "Submit request →"}
      </Button>
    </form>
  );
}

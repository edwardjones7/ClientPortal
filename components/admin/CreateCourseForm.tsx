"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createCourse,
  type CourseFormState,
} from "@/app/(admin)/admin/courses/actions";
import { Button } from "@/components/ui/Button";
import { FormRow, Input, Textarea } from "@/components/ui/Field";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create course →"}
    </Button>
  );
}

export function CreateCourseForm() {
  const [state, action] = useActionState<CourseFormState, FormData>(
    createCourse,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormRow label="Title" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          placeholder="Getting started with your AI receptionist"
        />
      </FormRow>
      <FormRow label="Description" htmlFor="description" hint="Optional. A sentence or two.">
        <Textarea id="description" name="description" placeholder="What this course covers." />
      </FormRow>
      <FormRow
        label="First video URL"
        htmlFor="video_url"
        hint="Optional. Paste a YouTube or Vimeo link — you can add more lessons after."
      >
        <Input id="video_url" name="video_url" placeholder="https://youtu.be/…" />
      </FormRow>
      <FormRow
        label="Thumbnail"
        htmlFor="thumbnail"
        hint="Optional image. Defaults to the video's own thumbnail."
      >
        <input
          id="thumbnail"
          name="thumbnail"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:text-fg hover:file:bg-elevated"
        />
      </FormRow>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <Submit />
    </form>
  );
}

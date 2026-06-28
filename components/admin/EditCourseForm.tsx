"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateCourse, type CourseFormState } from "@/app/(admin)/admin/courses/actions";
import { Button } from "@/components/ui/Button";
import { FormRow, Input, Textarea } from "@/components/ui/Field";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function EditCourseForm({
  courseId,
  title,
  description,
}: {
  courseId: string;
  title: string;
  description: string | null;
}) {
  const [state, action] = useActionState<CourseFormState, FormData>(updateCourse, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="course_id" value={courseId} />
      <FormRow label="Title" htmlFor="edit_title">
        <Input id="edit_title" name="title" required defaultValue={title} />
      </FormRow>
      <FormRow label="Description" htmlFor="edit_description">
        <Textarea id="edit_description" name="description" defaultValue={description ?? ""} />
      </FormRow>
      <div className="flex items-center gap-3">
        <Submit />
        {state.error ? (
          <p className="text-xs text-danger">{state.error}</p>
        ) : state.ok ? (
          <p className="text-xs text-resolved">Saved.</p>
        ) : null}
      </div>
    </form>
  );
}

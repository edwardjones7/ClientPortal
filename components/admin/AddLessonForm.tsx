"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addLesson, type CourseFormState } from "@/app/(admin)/admin/courses/actions";
import { Button } from "@/components/ui/Button";
import { FormRow, Input } from "@/components/ui/Field";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Adding…" : "Add lesson"}
    </Button>
  );
}

export function AddLessonForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState<CourseFormState, FormData>(addLesson, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the inputs after a lesson is added (the new row arrives via revalidate).
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="course_id" value={courseId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow label="Lesson title" htmlFor="lesson_title">
          <Input id="lesson_title" name="title" required placeholder="Lesson 1 — Overview" />
        </FormRow>
        <FormRow label="Video URL" htmlFor="lesson_url">
          <Input id="lesson_url" name="video_url" required placeholder="https://youtu.be/…" />
        </FormRow>
      </div>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <Submit />
    </form>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseVideoUrl } from "@/lib/courses";

export interface CourseFormState {
  ok?: boolean;
  error?: string;
}

/**
 * Admin: create a course. Optionally seeds it with a first video lesson and/or
 * a thumbnail image, then drops the admin on the course detail page to add more
 * lessons and assign it to clients.
 */
export async function createCourse(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const user = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  if (!title) return { error: "Give the course a title." };

  // Validate the optional first video before creating anything.
  const parsed = videoUrl ? parseVideoUrl(videoUrl) : null;
  if (videoUrl && !parsed) {
    return { error: "That video link isn't a recognized YouTube or Vimeo URL." };
  }

  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      title,
      description: description || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !course) return { error: "Couldn't create the course. Try again." };

  // Optional thumbnail → public course-thumbnails bucket at {course_id}/...
  const thumb = formData.get("thumbnail");
  if (thumb instanceof File && thumb.size > 0) {
    const path = `${course.id}/${Date.now()}-${thumb.name}`;
    const { error: upErr } = await supabase.storage
      .from("course-thumbnails")
      .upload(path, thumb, { upsert: true });
    if (!upErr) {
      await supabase.from("courses").update({ thumbnail_path: path }).eq("id", course.id);
    }
  }

  // Optional first lesson.
  if (parsed) {
    await supabase.from("course_lessons").insert({
      course_id: course.id,
      title,
      provider: parsed.provider,
      video_id: parsed.videoId,
      position: 0,
    });
  }

  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${course.id}`);
}

/** Admin: edit a course's title/description. */
export async function updateCourse(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requireAdmin();
  const courseId = String(formData.get("course_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!courseId) return { error: "Missing course." };
  if (!title) return { error: "Give the course a title." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ title, description: description || null })
    .eq("id", courseId);
  if (error) return { error: "Couldn't save changes. Try again." };

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
  return { ok: true };
}

/** Admin: add a video lesson to a course. */
export async function addLesson(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requireAdmin();
  const courseId = String(formData.get("course_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  if (!courseId) return { error: "Missing course." };
  if (!title) return { error: "Give the lesson a title." };

  const parsed = parseVideoUrl(videoUrl);
  if (!parsed) {
    return { error: "That video link isn't a recognized YouTube or Vimeo URL." };
  }

  const supabase = await createClient();

  // Append after the current last lesson.
  const { data: last } = await supabase
    .from("course_lessons")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? -1) + 1;

  const { error } = await supabase.from("course_lessons").insert({
    course_id: courseId,
    title,
    provider: parsed.provider,
    video_id: parsed.videoId,
    position,
  });
  if (error) return { error: "Couldn't add the lesson. Try again." };

  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

/** Admin: delete a lesson. */
export async function deleteLesson(formData: FormData): Promise<void> {
  await requireAdmin();
  const lessonId = String(formData.get("lesson_id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!lessonId) return;

  const supabase = await createClient();
  await supabase.from("course_lessons").delete().eq("id", lessonId);
  revalidatePath(`/admin/courses/${courseId}`);
}

/** Admin: delete a course (cascades lessons, assignments, progress). */
export async function deleteCourse(formData: FormData): Promise<void> {
  await requireAdmin();
  const courseId = String(formData.get("course_id") ?? "");
  if (!courseId) return;

  const supabase = await createClient();
  await supabase.from("courses").delete().eq("id", courseId);
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

/**
 * Admin: assign or unassign a course to a whole org OR a single person
 * (idempotent). The form carries exactly one of org_id / profile_id. We
 * delete-then-insert rather than upsert because the uniqueness is enforced by
 * partial indexes, which ON CONFLICT can't infer cleanly.
 */
export async function setCourseAssignment(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = String(formData.get("course_id") ?? "");
  const orgId = String(formData.get("org_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  const assigned = String(formData.get("assigned") ?? "") === "true";
  if (!courseId || (!orgId && !profileId)) return;

  const supabase = await createClient();

  // Clear any existing identical target first (idempotent).
  let del = supabase.from("course_assignments").delete().eq("course_id", courseId);
  del = orgId ? del.eq("org_id", orgId) : del.eq("profile_id", profileId);
  await del;

  if (assigned) {
    await supabase.from("course_assignments").insert(
      orgId
        ? { course_id: courseId, org_id: orgId, assigned_by: user.id }
        : { course_id: courseId, profile_id: profileId, assigned_by: user.id },
    );
  }
  revalidatePath(`/admin/courses/${courseId}`);
}

/** Admin: record an uploaded course document (file already in `course-files`). */
export async function recordCourseResource(input: {
  courseId: string;
  title: string | null;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  thumbnailPath?: string | null;
}): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!input.courseId || !input.storagePath || !input.fileName) {
    return { error: "Missing file info." };
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("course_resources")
    .select("position")
    .eq("course_id", input.courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? -1) + 1;

  const { error } = await supabase.from("course_resources").insert({
    course_id: input.courseId,
    title: input.title,
    storage_path: input.storagePath,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    thumbnail_path: input.thumbnailPath ?? null,
    position,
    created_by: user.id,
  });
  if (error) return { error: "Couldn't save the document." };

  revalidatePath(`/admin/courses/${input.courseId}`);
  return {};
}

/** Admin: delete a course document (removes the storage object + the row). */
export async function deleteCourseResource(input: {
  id: string;
  courseId: string;
}): Promise<void> {
  await requireAdmin();
  if (!input.id) return;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("course_resources")
    .select("storage_path, thumbnail_path")
    .eq("id", input.id)
    .maybeSingle();
  // Remove the file and its generated thumbnail (skip if the thumbnail IS the
  // file, as for images, to avoid a redundant delete).
  const paths = new Set<string>();
  if (row?.storage_path) paths.add(row.storage_path);
  if (row?.thumbnail_path) paths.add(row.thumbnail_path);
  if (paths.size > 0) {
    await supabase.storage.from("course-files").remove([...paths]);
  }
  await supabase.from("course_resources").delete().eq("id", input.id);
  revalidatePath(`/admin/courses/${input.courseId}`);
}

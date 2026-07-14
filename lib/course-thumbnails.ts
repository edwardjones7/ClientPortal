/**
 * Server-side thumbnail resolution for course cards. Extends the pure
 * courseThumbnail() chain (uploaded image → YouTube frame) with the two
 * sources that need I/O: Vimeo's oEmbed API and PDF-resource preview images
 * (signed URLs from the private `course-files` bucket). Batched for a whole
 * course list; any failure falls back to null (the letter tile).
 */

import type { createClient } from "@/lib/supabase/server";
import { courseThumbnail } from "@/lib/courses";
import type { Course, CourseLesson } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type LessonRef = Pick<CourseLesson, "provider" | "video_id">;

/** Vimeo has no static thumbnail URL — resolve one via oEmbed (cached a day). */
async function vimeoThumbnail(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
        `https://vimeo.com/${videoId}`,
      )}`,
      { next: { revalidate: 60 * 60 * 24 } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { thumbnail_url?: string };
    return json.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

/**
 * Best available thumbnail per course id: uploaded image → YouTube frame →
 * Vimeo oEmbed → first resource preview (PDF first page) → null.
 */
export async function resolveCourseThumbnails(
  supabase: Supabase,
  courses: Pick<Course, "id" | "thumbnail_path">[],
  firstLesson: (courseId: string) => LessonRef | undefined,
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const vimeoJobs: { courseId: string; videoId: string }[] = [];
  const resourceJobs: string[] = [];

  for (const course of courses) {
    const lesson = firstLesson(course.id);
    const url = courseThumbnail(course, lesson);
    out.set(course.id, url);
    if (url) continue;
    if (lesson?.provider === "vimeo") {
      vimeoJobs.push({ courseId: course.id, videoId: lesson.video_id });
    } else {
      resourceJobs.push(course.id);
    }
  }

  await Promise.all([
    ...vimeoJobs.map(async ({ courseId, videoId }) => {
      out.set(courseId, await vimeoThumbnail(videoId));
    }),
    (async () => {
      if (!resourceJobs.length) return;
      const { data } = await supabase
        .from("course_resources")
        .select("course_id, thumbnail_path")
        .in("course_id", resourceJobs)
        .not("thumbnail_path", "is", null)
        .order("position", { ascending: true })
        .returns<{ course_id: string; thumbnail_path: string }[]>();
      const firstPath = new Map<string, string>();
      for (const r of data ?? []) {
        if (!firstPath.has(r.course_id)) firstPath.set(r.course_id, r.thumbnail_path);
      }
      await Promise.all(
        Array.from(firstPath, async ([courseId, path]) => {
          const { data: signed } = await supabase.storage
            .from("course-files")
            .createSignedUrl(path, 60 * 60);
          if (signed?.signedUrl) out.set(courseId, signed.signedUrl);
        }),
      );
    })(),
  ]);

  return out;
}

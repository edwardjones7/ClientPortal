/**
 * Pure helpers for the Courses / Academy feature — video URL parsing, embed +
 * thumbnail URL building, and progress math. No Supabase/server imports here so
 * these are safe to use from both Server and Client Components. Page-level data
 * queries live in the pages/actions themselves (they already hold a supabase
 * client), mirroring how lib/systems.ts stays dependency-free.
 */

import type { Course, CourseLesson, LessonProgress, VideoProvider } from "@/lib/types";

export const PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
};

/**
 * Parse a pasted YouTube/Vimeo URL into { provider, videoId }, or null if the
 * link isn't a recognized video URL. Used to validate the add-lesson form.
 */
export function parseVideoUrl(
  input: string,
): { provider: VideoProvider; videoId: string } | null {
  const url = input.trim();
  if (!url) return null;

  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/, /live/
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (yt) return { provider: "youtube", videoId: yt[1] };

  // Vimeo: vimeo.com/123, player.vimeo.com/video/123
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { provider: "vimeo", videoId: vm[1] };

  return null;
}

/** Embeddable iframe src for a lesson's video. */
export function embedUrl(provider: VideoProvider, videoId: string): string {
  return provider === "youtube"
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1`
    : `https://player.vimeo.com/video/${videoId}`;
}

/** Provider-hosted thumbnail, or null when none exists (Vimeo has no static URL). */
export function providerThumbnail(
  provider: VideoProvider,
  videoId: string,
): string | null {
  return provider === "youtube"
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;
}

/** Public URL for an uploaded thumbnail in the `course-thumbnails` bucket. */
export function thumbnailPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/course-thumbnails/${path}`;
}

/**
 * Best available thumbnail for a course: the uploaded image if present, else
 * the first lesson's provider thumbnail, else null (caller renders a fallback).
 */
export function courseThumbnail(
  course: Pick<Course, "thumbnail_path">,
  firstLesson?: Pick<CourseLesson, "provider" | "video_id"> | null,
): string | null {
  if (course.thumbnail_path) return thumbnailPublicUrl(course.thumbnail_path);
  if (firstLesson) return providerThumbnail(firstLesson.provider, firstLesson.video_id);
  return null;
}

/** Whole-percent watched (0–100), based on furthest position vs. duration. */
export function progressPercent(
  p: Pick<LessonProgress, "seconds_watched" | "duration_seconds">,
): number {
  if (!p.duration_seconds || p.duration_seconds <= 0) return 0;
  const pct = Math.round((p.seconds_watched / p.duration_seconds) * 100);
  return Math.max(0, Math.min(100, pct));
}

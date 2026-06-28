"use server";

import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Client: record watch progress for a lesson. Called (debounced) by the course
 * player. Tracks the resume point (last_position), the furthest position
 * reached (seconds_watched), the learned duration, and marks the lesson
 * complete past ~95%.
 *
 * No-ops for admins — an admin previewing via "view as client" has no org of
 * their own (current_org_id() is null), so a write would fail RLS anyway and we
 * don't want to pollute a client's progress with the admin's viewing.
 */
export async function recordLessonProgress(input: {
  lessonId: string;
  position: number;
  duration: number | null;
}): Promise<void> {
  const user = await getSessionUser();
  if (!user || user.profile.role === "admin" || !user.profile.org_id) return;

  const lessonId = input.lessonId;
  const position = Number.isFinite(input.position) ? Math.max(0, input.position) : 0;
  const duration =
    input.duration != null && Number.isFinite(input.duration) && input.duration > 0
      ? input.duration
      : null;
  if (!lessonId) return;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("seconds_watched, duration_seconds, completed_at")
    .eq("profile_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const seconds_watched = Math.max(existing?.seconds_watched ?? 0, position);
  const duration_seconds = duration ?? existing?.duration_seconds ?? null;
  const completed_at =
    existing?.completed_at ??
    (duration_seconds && position >= 0.95 * duration_seconds
      ? new Date().toISOString()
      : null);

  await supabase.from("lesson_progress").upsert(
    {
      profile_id: user.id,
      lesson_id: lessonId,
      org_id: user.profile.org_id,
      last_position: position,
      seconds_watched,
      duration_seconds,
      completed_at,
    },
    { onConflict: "profile_id,lesson_id" },
  );
}

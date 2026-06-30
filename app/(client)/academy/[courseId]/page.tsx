import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { CoursePlayer } from "@/components/courses/CoursePlayer";
import { CourseResources } from "@/components/courses/CourseResources";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cx } from "@/lib/utils";
import type {
  Course,
  CourseLesson,
  CourseResource,
  LessonProgress,
} from "@/lib/types";

export const metadata: Metadata = { title: "Course" };

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { courseId } = await params;
  const { lesson: lessonParam } = await searchParams;
  const user = await requireMember();
  const supabase = await createClient();

  // Gate on assignment — to this member's org OR directly to them. (limit(1)
  // since a course can be assigned both ways and we only need existence.)
  const { data: assignment } = await supabase
    .from("course_assignments")
    .select("id")
    .eq("course_id", courseId)
    .or(`org_id.eq.${user.orgId},profile_id.eq.${user.id}`)
    .limit(1);
  if (!assignment || assignment.length === 0) notFound();

  const [{ data: course }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).single<Course>(),
    supabase
      .from("course_lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("position", { ascending: true })
      .returns<CourseLesson[]>(),
    supabase
      .from("lesson_progress")
      .select("lesson_id, last_position, completed_at")
      .eq("profile_id", user.id)
      .returns<Pick<LessonProgress, "lesson_id" | "last_position" | "completed_at">[]>(),
  ]);

  if (!course) notFound();

  // Downloadable documents attached to this course (private bucket → sign URLs).
  const { data: rawResources } = await supabase
    .from("course_resources")
    .select(
      "id, title, file_name, storage_path, mime_type, size_bytes, thumbnail_path",
    )
    .eq("course_id", courseId)
    .order("position", { ascending: true })
    .returns<
      Pick<
        CourseResource,
        | "id"
        | "title"
        | "file_name"
        | "storage_path"
        | "mime_type"
        | "size_bytes"
        | "thumbnail_path"
      >[]
    >();

  const resources = await Promise.all(
    (rawResources ?? []).map(async (r) => {
      const { data: signed } = await supabase.storage
        .from("course-files")
        .createSignedUrl(r.storage_path, 60 * 60);
      let thumbnailUrl: string | null = null;
      if (r.thumbnail_path) {
        const { data: signedThumb } = await supabase.storage
          .from("course-files")
          .createSignedUrl(r.thumbnail_path, 60 * 60);
        thumbnailUrl = signedThumb?.signedUrl ?? null;
      }
      return {
        id: r.id,
        title: r.title,
        file_name: r.file_name,
        size_bytes: r.size_bytes,
        url: signed?.signedUrl ?? null,
        thumbnailUrl,
      };
    }),
  );

  const lessonList = lessons ?? [];
  const progressByLesson = new Map(
    (progress ?? []).map((p) => [p.lesson_id, p]),
  );

  const active =
    lessonList.find((l) => l.id === lessonParam) ?? lessonList[0] ?? null;
  const startAt = active
    ? Math.floor(progressByLesson.get(active.id)?.last_position ?? 0)
    : 0;

  return (
    <div>
      <PageHeading
        no="01"
        title={course.title}
        description={course.description ?? undefined}
        action={
          <Link href="/academy" className="text-sm text-muted hover:text-fg">
            ← All courses
          </Link>
        }
      />

      {!active ? (
        <EmptyState
          title="This course has no lessons yet."
          body="Check back soon — Elenos is still putting it together."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <CoursePlayer
              key={active.id}
              lessonId={active.id}
              provider={active.provider}
              videoId={active.video_id}
              startAt={startAt}
            />
            <h2 className="mt-4 text-lg font-semibold text-fg">{active.title}</h2>
          </div>

          <Panel className="h-fit divide-y divide-border">
            {lessonList.map((l, i) => {
              const isActive = l.id === active.id;
              const done = Boolean(progressByLesson.get(l.id)?.completed_at);
              return (
                <Link
                  key={l.id}
                  href={`/academy/${courseId}?lesson=${l.id}`}
                  className={cx(
                    "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                    isActive ? "bg-surface-2" : "hover:bg-surface-2/50",
                  )}
                >
                  <span className="w-5 shrink-0 text-xs text-faint">{i + 1}</span>
                  <span
                    className={cx(
                      "min-w-0 flex-1 truncate",
                      isActive ? "text-fg" : "text-muted",
                    )}
                  >
                    {l.title}
                  </span>
                  {done ? (
                    <span className="shrink-0 text-xs text-resolved">✓</span>
                  ) : null}
                </Link>
              );
            })}
          </Panel>
        </div>
      )}

      <CourseResources resources={resources} />
    </div>
  );
}

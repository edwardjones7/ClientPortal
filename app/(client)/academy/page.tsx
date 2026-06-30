import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/brand/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseCard } from "@/components/courses/CourseCard";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courseThumbnail } from "@/lib/courses";
import type { Course, CourseLesson, LessonProgress } from "@/lib/types";

export const metadata: Metadata = { title: "Academy" };

export default async function AcademyPage() {
  const user = await requireMember();
  const supabase = await createClient();

  // Courses assigned to this member — either to their org or directly to them.
  // (Also works for an admin previewing an org; RLS scopes the rest.)
  const { data: assignments } = await supabase
    .from("course_assignments")
    .select("course:courses(*)")
    .or(`org_id.eq.${user.orgId},profile_id.eq.${user.id}`)
    .returns<{ course: Course | null }[]>();

  // A course can be assigned both org-wide and per-person — dedupe by id.
  const courses = Array.from(
    new Map(
      (assignments ?? [])
        .map((a) => a.course)
        .filter((c): c is Course => Boolean(c))
        .map((c) => [c.id, c]),
    ).values(),
  );

  const courseIds = courses.map((c) => c.id);

  const [{ data: lessons }, { data: progress }] = await Promise.all([
    courseIds.length
      ? supabase
          .from("course_lessons")
          .select("id, course_id, provider, video_id, position")
          .in("course_id", courseIds)
          .order("position", { ascending: true })
          .returns<
            Pick<CourseLesson, "id" | "course_id" | "provider" | "video_id" | "position">[]
          >()
      : Promise.resolve({ data: [] as Pick<CourseLesson, "id" | "course_id" | "provider" | "video_id" | "position">[] }),
    supabase
      .from("lesson_progress")
      .select("lesson_id, completed_at")
      .eq("profile_id", user.id)
      .returns<Pick<LessonProgress, "lesson_id" | "completed_at">[]>(),
  ]);

  const lessonsByCourse = new Map<string, typeof lessons>();
  for (const l of lessons ?? []) {
    const arr = lessonsByCourse.get(l.course_id) ?? [];
    arr.push(l);
    lessonsByCourse.set(l.course_id, arr);
  }
  const completed = new Set(
    (progress ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id),
  );

  return (
    <div>
      <RealtimeRefresh
        table="course_assignments"
        filter={`org_id=eq.${user.orgId}`}
        channel={`academy-${user.orgId}`}
      />
      <PageHeading
        no="01"
        title="Academy"
        description="Training and walkthroughs from the Elenos team. Pick up where you left off."
      />

      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet."
          body="When Elenos shares a course with you, it'll show up here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => {
            const courseLessons = lessonsByCourse.get(course.id) ?? [];
            const total = courseLessons.length;
            const done = courseLessons.filter((l) => completed.has(l.id)).length;
            return (
              <Link key={course.id} href={`/academy/${course.id}`} className="h-full">
                <CourseCard
                  title={course.title}
                  description={course.description}
                  thumbnail={courseThumbnail(course, courseLessons[0])}
                  footer={
                    <span className="meta text-faint">
                      {total === 0
                        ? "No lessons yet"
                        : done === 0
                          ? `${total} lesson${total === 1 ? "" : "s"}`
                          : `${done} of ${total} complete`}
                    </span>
                  }
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

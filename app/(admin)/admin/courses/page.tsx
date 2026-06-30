import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { CourseCard } from "@/components/courses/CourseCard";
import { CreateCourseForm } from "@/components/admin/CreateCourseForm";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courseThumbnail } from "@/lib/courses";
import type { Course, CourseLesson } from "@/lib/types";

export const metadata: Metadata = { title: "Academy" };

export default async function AdminCoursesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: courses }, { data: lessons }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<Course[]>(),
      supabase
        .from("course_lessons")
        .select("id, course_id, provider, video_id, position")
        .order("position", { ascending: true })
        .returns<
          Pick<CourseLesson, "id" | "course_id" | "provider" | "video_id" | "position">[]
        >(),
      supabase.from("course_assignments").select("course_id"),
    ]);

  const lessonsByCourse = new Map<string, typeof lessons>();
  for (const l of lessons ?? []) {
    const arr = lessonsByCourse.get(l.course_id) ?? [];
    arr.push(l);
    lessonsByCourse.set(l.course_id, arr);
  }
  const assignCount = new Map<string, number>();
  for (const a of assignments ?? []) {
    assignCount.set(a.course_id, (assignCount.get(a.course_id) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeading
        no="01"
        title="Academy"
        description="The training you publish to clients. Build a course from YouTube or Vimeo links, then assign it."
      />

      {(courses ?? []).length === 0 ? (
        <Panel className="px-5 py-8 text-center text-sm text-muted">
          No courses yet. Create your first below.
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((course) => {
            const courseLessons = lessonsByCourse.get(course.id) ?? [];
            const lessonCount = courseLessons.length;
            const clients = assignCount.get(course.id) ?? 0;
            return (
              <Link key={course.id} href={`/admin/courses/${course.id}`} className="h-full">
                <CourseCard
                  title={course.title}
                  description={course.description}
                  thumbnail={courseThumbnail(course, courseLessons[0])}
                  footer={
                    <span className="meta text-faint">
                      {lessonCount} lesson{lessonCount === 1 ? "" : "s"} · {clients}{" "}
                      assignment{clients === 1 ? "" : "s"}
                    </span>
                  }
                />
              </Link>
            );
          })}
        </div>
      )}

      <section className="mt-10 max-w-xl">
        <p className="section-no mb-3">02 / New course</p>
        <Panel className="p-5">
          <CreateCourseForm />
        </Panel>
      </section>
    </div>
  );
}

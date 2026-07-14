import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { CourseCard } from "@/components/courses/CourseCard";
import { CreateCourseForm } from "@/components/admin/CreateCourseForm";
import { requireAdmin, getInternalOrgId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveCourseThumbnails } from "@/lib/course-thumbnails";
import { SIM_PASS_PCT } from "@/lib/call-sim";
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

  const thumbnails = await resolveCourseThumbnails(
    supabase,
    courses ?? [],
    (id) => lessonsByCourse.get(id)?.[0],
  );

  // Built-in Call Simulator tile: how many reps are certified so far.
  // (sim_attempts may not exist until 0008 is applied — nulls degrade fine.)
  const internalOrgId = await getInternalOrgId();
  let simStats: { reps: number; certified: number } | null = null;
  if (internalOrgId) {
    const [{ count: repCount }, { data: passes }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", internalOrgId)
        .eq("role", "employee"),
      supabase.from("sim_attempts").select("profile_id").eq("passed", true),
    ]);
    simStats = {
      reps: repCount ?? 0,
      certified: new Set(
        ((passes ?? []) as { profile_id: string }[]).map((p) => p.profile_id),
      ).size,
    };
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
                  thumbnail={thumbnails.get(course.id) ?? null}
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

      {simStats ? (
        <section className="mt-10">
          <p className="section-no mb-3">02 / Built-in training</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/admin/team" className="h-full">
              <Panel
                as="article"
                className="flex h-full flex-col overflow-hidden transition-colors hover:border-border-strong"
              >
                <div className="relative flex h-40 flex-col items-center justify-center gap-2 border-b border-border bg-gradient-to-br from-surface-2 to-elevated">
                  <span className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
                    Live call
                  </span>
                  <span className="text-2xl font-semibold text-fg">
                    The phone is ringing.
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-semibold text-fg">
                    Call Simulator
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                    Employee-only: 50 timed callers with real objections.
                    {" "}{SIM_PASS_PCT}%+ on a full run earns certification.
                  </p>
                  <div className="mt-3 pt-1">
                    <span className="meta text-faint">
                      {simStats.certified} of {simStats.reps} rep
                      {simStats.reps === 1 ? "" : "s"} certified · results on
                      Team
                    </span>
                  </div>
                </div>
              </Panel>
            </Link>
          </div>
          <p className="meta mt-3">
            Shows on every employee&rsquo;s Academy automatically — no
            assignment needed. Preview it via Team → View as employee.
          </p>
        </section>
      ) : null}

      <section className="mt-10 max-w-xl">
        <p className="section-no mb-3">{simStats ? "03" : "02"} / New course</p>
        <Panel className="p-5">
          <CreateCourseForm />
        </Panel>
      </section>
    </div>
  );
}

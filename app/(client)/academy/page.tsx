import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/brand/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseCard } from "@/components/courses/CourseCard";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { Panel } from "@/components/ui/Panel";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveCourseThumbnails } from "@/lib/course-thumbnails";
import { SIM_PASS_PCT } from "@/lib/call-sim";
import type { Course, CourseLesson, LessonProgress, SimAttempt } from "@/lib/types";

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

  const thumbnails = await resolveCourseThumbnails(
    supabase,
    courses,
    (id) => lessonsByCourse.get(id)?.[0],
  );

  // Employees also get the Live Call Simulator as a tile in their academy.
  let sim: { certified: boolean; bestPct: number | null; count: number } | null =
    null;
  if (user.isEmployee) {
    const { data: attempts } = await supabase
      .from("sim_attempts")
      .select("pct, passed")
      .eq("profile_id", user.id)
      .returns<Pick<SimAttempt, "pct" | "passed">[]>();
    sim = {
      certified: (attempts ?? []).some((a) => a.passed),
      bestPct: attempts?.length ? Math.max(...attempts.map((a) => a.pct)) : null,
      count: attempts?.length ?? 0,
    };
  }

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

      {courses.length === 0 && !sim ? (
        <EmptyState
          title="No courses yet."
          body="When Elenos shares a course with you, it'll show up here."
        />
      ) : (
        <div className="space-y-10">
          <section>
            <p className="section-no mb-3">01 / Lessons</p>
            {courses.length === 0 ? (
              <EmptyState
                title="No lessons yet."
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
                        thumbnail={thumbnails.get(course.id) ?? null}
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
          </section>

          {sim ? (
            <section>
              <p className="section-no mb-3">02 / Tests &amp; certifications</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/academy/simulator" className="h-full">
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
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-fg">
                          Call Simulator
                        </h3>
                        <span className="meta rounded border border-border px-1.5 py-0.5 text-accent">
                          Test
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                        50 timed callers with real objections. Score {SIM_PASS_PCT}%+
                        to earn your Live Call Certification.
                      </p>
                      <div className="mt-3 pt-1">
                        {sim.certified ? (
                          <span className="meta text-resolved">
                            ✓ Certified · best {sim.bestPct}%
                          </span>
                        ) : sim.count > 0 ? (
                          <span className="meta text-waiting">
                            Best {sim.bestPct}% · {sim.count} attempt
                            {sim.count === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="meta text-faint">
                            50 callers · 45 seconds each
                          </span>
                        )}
                      </div>
                    </div>
                  </Panel>
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

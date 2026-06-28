import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { EditCourseForm } from "@/components/admin/EditCourseForm";
import { AddLessonForm } from "@/components/admin/AddLessonForm";
import { deleteCourse, deleteLesson, setCourseAssignment } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABEL, progressPercent } from "@/lib/courses";
import { formatRelative } from "@/lib/utils";
import type { Course, CourseLesson, LessonProgress, Organization, Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Course" };

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireAdmin();
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single<Course>();
  if (!course) notFound();

  const [{ data: lessons }, { data: orgs }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("position", { ascending: true })
        .returns<CourseLesson[]>(),
      supabase
        .from("organizations")
        .select("id, name")
        .order("name", { ascending: true })
        .returns<Pick<Organization, "id" | "name">[]>(),
      supabase
        .from("course_assignments")
        .select("org_id")
        .eq("course_id", courseId),
    ]);

  const lessonList = lessons ?? [];
  const lessonIds = lessonList.map((l) => l.id);
  const assignedOrgIds = new Set((assignments ?? []).map((a) => a.org_id));

  // Members + progress for the assigned orgs (drives the watch panel).
  const [{ data: members }, { data: progress }] = await Promise.all([
    assignedOrgIds.size
      ? supabase
          .from("profiles")
          .select("id, full_name, email, org_id")
          .eq("role", "client")
          .in("org_id", [...assignedOrgIds])
          .returns<Pick<Profile, "id" | "full_name" | "email" | "org_id">[]>()
      : Promise.resolve({ data: [] as Pick<Profile, "id" | "full_name" | "email" | "org_id">[] }),
    lessonIds.length
      ? supabase
          .from("lesson_progress")
          .select("profile_id, lesson_id, seconds_watched, duration_seconds, completed_at, updated_at")
          .in("lesson_id", lessonIds)
          .returns<
            Pick<
              LessonProgress,
              "profile_id" | "lesson_id" | "seconds_watched" | "duration_seconds" | "completed_at" | "updated_at"
            >[]
          >()
      : Promise.resolve({
          data: [] as Pick<
            LessonProgress,
            "profile_id" | "lesson_id" | "seconds_watched" | "duration_seconds" | "completed_at" | "updated_at"
          >[],
        }),
  ]);

  const progressMap = new Map(
    (progress ?? []).map((p) => [`${p.profile_id}:${p.lesson_id}`, p]),
  );
  const membersByOrg = new Map<string, typeof members>();
  for (const m of members ?? []) {
    if (!m.org_id) continue;
    const arr = membersByOrg.get(m.org_id) ?? [];
    arr.push(m);
    membersByOrg.set(m.org_id, arr);
  }

  return (
    <div className="max-w-3xl">
      <RealtimeRefresh
        table="lesson_progress"
        channel={`course-progress-${courseId}`}
      />
      <PageHeading
        no="01"
        title={course.title}
        description={course.description ?? undefined}
        action={
          <div className="flex items-center gap-3">
            <Link href="/admin/courses" className="text-sm text-muted hover:text-fg">
              ← All courses
            </Link>
            <form action={deleteCourse}>
              <input type="hidden" name="course_id" value={courseId} />
              <Button type="submit" variant="danger" size="sm">
                Delete
              </Button>
            </form>
          </div>
        }
      />

      {/* Details */}
      <section className="mb-10">
        <p className="section-no mb-3">02 / Details</p>
        <Panel className="p-5">
          <EditCourseForm
            courseId={courseId}
            title={course.title}
            description={course.description}
          />
        </Panel>
      </section>

      {/* Lessons */}
      <section className="mb-10">
        <p className="section-no mb-3">03 / Lessons</p>
        {lessonList.length === 0 ? (
          <Panel className="mb-4 px-5 py-6 text-center text-sm text-muted">
            No lessons yet. Add the first one below.
          </Panel>
        ) : (
          <Panel className="mb-4 divide-y divide-border">
            {lessonList.map((l, i) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 shrink-0 text-xs text-faint">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{l.title}</p>
                  <p className="meta text-faint">{PROVIDER_LABEL[l.provider]}</p>
                </div>
                <form action={deleteLesson}>
                  <input type="hidden" name="lesson_id" value={l.id} />
                  <input type="hidden" name="course_id" value={courseId} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              </div>
            ))}
          </Panel>
        )}
        <Panel className="p-5">
          <AddLessonForm courseId={courseId} />
        </Panel>
      </section>

      {/* Assignment */}
      <section className="mb-10">
        <p className="section-no mb-3">04 / Assign to clients</p>
        {(orgs ?? []).length === 0 ? (
          <Panel className="px-5 py-6 text-center text-sm text-muted">
            No clients yet.
          </Panel>
        ) : (
          <Panel className="divide-y divide-border">
            {(orgs ?? []).map((org) => {
              const isAssigned = assignedOrgIds.has(org.id);
              return (
                <div key={org.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-sm text-fg">{org.name}</span>
                  <form action={setCourseAssignment}>
                    <input type="hidden" name="course_id" value={courseId} />
                    <input type="hidden" name="org_id" value={org.id} />
                    <input type="hidden" name="assigned" value={(!isAssigned).toString()} />
                    <Button
                      type="submit"
                      variant={isAssigned ? "ghost" : "secondary"}
                      size="sm"
                    >
                      {isAssigned ? "Assigned ✓ · Remove" : "Assign"}
                    </Button>
                  </form>
                </div>
              );
            })}
          </Panel>
        )}
      </section>

      {/* Watch activity */}
      <section>
        <p className="section-no mb-3">05 / Watch activity</p>
        {assignedOrgIds.size === 0 || lessonList.length === 0 ? (
          <Panel className="px-5 py-6 text-center text-sm text-muted">
            {lessonList.length === 0
              ? "Add lessons to start tracking watch time."
              : "Assign this course to a client to see their progress."}
          </Panel>
        ) : (
          <div className="space-y-4">
            {[...assignedOrgIds].map((orgId) => {
              const org = (orgs ?? []).find((o) => o.id === orgId);
              const orgMembers = membersByOrg.get(orgId) ?? [];
              return (
                <Panel key={orgId} className="p-5">
                  <p className="mb-3 text-sm font-medium text-fg">
                    {org?.name ?? "Client"}
                  </p>
                  {orgMembers.length === 0 ? (
                    <p className="text-sm text-muted">No members on this client yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {orgMembers.map((m) => (
                        <div key={m.id}>
                          <p className="text-sm text-fg">{m.full_name ?? m.email}</p>
                          <div className="mt-1.5 space-y-1">
                            {lessonList.map((l) => {
                              const p = progressMap.get(`${m.id}:${l.id}`);
                              const pct = p ? progressPercent(p) : 0;
                              return (
                                <div
                                  key={l.id}
                                  className="flex items-center gap-3 text-xs"
                                >
                                  <span className="min-w-0 flex-1 truncate text-muted">
                                    {l.title}
                                  </span>
                                  <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-surface-2">
                                    <span
                                      className="block h-full rounded-full bg-accent"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </span>
                                  <span className="w-20 shrink-0 text-right text-faint">
                                    {p?.completed_at
                                      ? "Done"
                                      : p
                                        ? `${pct}%`
                                        : "—"}
                                  </span>
                                  <span className="w-12 shrink-0 text-right text-faint">
                                    {p ? formatRelative(p.updated_at) : ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { EditCourseForm } from "@/components/admin/EditCourseForm";
import { AddLessonForm } from "@/components/admin/AddLessonForm";
import { CourseDocuments } from "@/components/admin/CourseDocuments";
import { deleteCourse, deleteLesson, setCourseAssignment } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABEL, progressPercent } from "@/lib/courses";
import { formatRelative } from "@/lib/utils";
import type {
  Course,
  CourseLesson,
  CourseResource,
  LessonProgress,
  Organization,
  Profile,
} from "@/lib/types";

export const metadata: Metadata = { title: "Course" };

type Person = Pick<Profile, "id" | "full_name" | "email" | "org_id" | "role">;

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

  const [
    { data: lessons },
    { data: orgs },
    { data: people },
    { data: assignments },
    { data: resources },
  ] = await Promise.all([
    supabase
      .from("course_lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("position", { ascending: true })
      .returns<CourseLesson[]>(),
    supabase
      .from("organizations")
      .select("id, name, is_internal")
      .order("name", { ascending: true })
      .returns<Pick<Organization, "id" | "name" | "is_internal">[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, email, org_id, role")
      .in("role", ["client", "employee"])
      .order("full_name", { ascending: true })
      .returns<Person[]>(),
    supabase
      .from("course_assignments")
      .select("org_id, profile_id")
      .eq("course_id", courseId)
      .returns<Pick<CourseAssignmentRow, "org_id" | "profile_id">[]>(),
    supabase
      .from("course_resources")
      .select("id, file_name, title, size_bytes")
      .eq("course_id", courseId)
      .order("position", { ascending: true })
      .returns<
        Pick<CourseResource, "id" | "file_name" | "title" | "size_bytes">[]
      >(),
  ]);

  const lessonList = lessons ?? [];
  const lessonIds = lessonList.map((l) => l.id);

  const assignedOrgIds = new Set(
    (assignments ?? []).map((a) => a.org_id).filter((x): x is string => Boolean(x)),
  );
  const assignedProfileIds = new Set(
    (assignments ?? [])
      .map((a) => a.profile_id)
      .filter((x): x is string => Boolean(x)),
  );

  const orgsById = new Map((orgs ?? []).map((o) => [o.id, o]));
  const peopleById = new Map((people ?? []).map((p) => [p.id, p]));
  const peopleByOrg = new Map<string, Person[]>();
  for (const p of people ?? []) {
    if (!p.org_id) continue;
    const arr = peopleByOrg.get(p.org_id) ?? [];
    arr.push(p);
    peopleByOrg.set(p.org_id, arr);
  }

  const clientOrgs = (orgs ?? []).filter((o) => !o.is_internal);
  const internalOrg = (orgs ?? []).find((o) => o.is_internal) ?? null;
  const employees = (people ?? []).filter((p) => p.role === "employee");

  // Progress for every lesson in this course (admin RLS sees all rows).
  const { data: progress } = lessonIds.length
    ? await supabase
        .from("lesson_progress")
        .select(
          "profile_id, lesson_id, seconds_watched, duration_seconds, completed_at, updated_at",
        )
        .in("lesson_id", lessonIds)
        .returns<
          Pick<
            LessonProgress,
            | "profile_id"
            | "lesson_id"
            | "seconds_watched"
            | "duration_seconds"
            | "completed_at"
            | "updated_at"
          >[]
        >()
    : { data: [] };

  const progressMap = new Map(
    (progress ?? []).map((p) => [`${p.profile_id}:${p.lesson_id}`, p]),
  );

  // Everyone who can see this course: members of assigned orgs + per-person.
  const viewers = new Map<string, { person: Person; via: string }>();
  for (const orgId of assignedOrgIds) {
    const orgName = orgsById.get(orgId)?.name ?? "Org";
    for (const m of peopleByOrg.get(orgId) ?? []) {
      viewers.set(m.id, { person: m, via: orgName });
    }
  }
  for (const pid of assignedProfileIds) {
    const m = peopleById.get(pid);
    if (m) {
      const orgName = m.org_id ? orgsById.get(m.org_id)?.name : undefined;
      viewers.set(m.id, { person: m, via: orgName ?? "Direct" });
    }
  }
  const viewerList = [...viewers.values()];

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

      {/* Files (documents, slideshows, anything) */}
      <section className="mb-10">
        <p className="section-no mb-3">04 / Files</p>
        <Panel className="p-5">
          <CourseDocuments courseId={courseId} resources={resources ?? []} />
        </Panel>
      </section>

      {/* Assign to orgs */}
      <section className="mb-10">
        <p className="section-no mb-3">05 / Assign to a whole org</p>
        {(orgs ?? []).length === 0 ? (
          <Panel className="px-5 py-6 text-center text-sm text-muted">
            No orgs yet.
          </Panel>
        ) : (
          <Panel className="divide-y divide-border">
            {internalOrg ? (
              <AssignRow
                courseId={courseId}
                label={`${internalOrg.name} (all staff)`}
                orgId={internalOrg.id}
                assigned={assignedOrgIds.has(internalOrg.id)}
              />
            ) : null}
            {clientOrgs.map((org) => (
              <AssignRow
                key={org.id}
                courseId={courseId}
                label={org.name}
                orgId={org.id}
                assigned={assignedOrgIds.has(org.id)}
              />
            ))}
          </Panel>
        )}
      </section>

      {/* Assign to individuals */}
      <section className="mb-10">
        <p className="section-no mb-3">06 / Assign to specific people</p>
        <div className="space-y-4">
          {employees.length > 0 ? (
            <PeopleGroup
              title="Elenos Team"
              courseId={courseId}
              people={employees}
              assignedProfileIds={assignedProfileIds}
              assignedOrgIds={assignedOrgIds}
              memberOrgId={internalOrg?.id}
            />
          ) : null}
          {clientOrgs.map((org) => {
            const members = (peopleByOrg.get(org.id) ?? []).filter(
              (p) => p.role === "client",
            );
            if (members.length === 0) return null;
            return (
              <PeopleGroup
                key={org.id}
                title={org.name}
                courseId={courseId}
                people={members}
                assignedProfileIds={assignedProfileIds}
                assignedOrgIds={assignedOrgIds}
                memberOrgId={org.id}
              />
            );
          })}
          {employees.length === 0 && clientOrgs.length === 0 ? (
            <Panel className="px-5 py-6 text-center text-sm text-muted">
              No people to assign yet.
            </Panel>
          ) : null}
        </div>
      </section>

      {/* Watch activity */}
      <section>
        <p className="section-no mb-3">07 / Watch activity</p>
        {viewerList.length === 0 || lessonList.length === 0 ? (
          <Panel className="px-5 py-6 text-center text-sm text-muted">
            {lessonList.length === 0
              ? "Add lessons to start tracking watch time."
              : "Assign this course to someone to see their progress."}
          </Panel>
        ) : (
          <div className="space-y-4">
            {viewerList.map(({ person, via }) => (
              <Panel key={person.id} className="p-5">
                <p className="text-sm font-medium text-fg">
                  {person.full_name ?? person.email}
                  <span className="ml-2 text-xs text-faint">{via}</span>
                </p>
                <div className="mt-2 space-y-1">
                  {lessonList.map((l) => {
                    const p = progressMap.get(`${person.id}:${l.id}`);
                    const pct = p ? progressPercent(p) : 0;
                    return (
                      <div key={l.id} className="flex items-center gap-3 text-xs">
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
                          {p?.completed_at ? "Done" : p ? `${pct}%` : "—"}
                        </span>
                        <span className="w-12 shrink-0 text-right text-faint">
                          {p ? formatRelative(p.updated_at) : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Local row type for the assignments query (org XOR profile). */
interface CourseAssignmentRow {
  org_id: string | null;
  profile_id: string | null;
}

/** A single org assignment toggle row. */
function AssignRow({
  courseId,
  label,
  orgId,
  assigned,
}: {
  courseId: string;
  label: string;
  orgId: string;
  assigned: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-sm text-fg">{label}</span>
      <form action={setCourseAssignment}>
        <input type="hidden" name="course_id" value={courseId} />
        <input type="hidden" name="org_id" value={orgId} />
        <input type="hidden" name="assigned" value={(!assigned).toString()} />
        <Button type="submit" variant={assigned ? "ghost" : "secondary"} size="sm">
          {assigned ? "Assigned ✓ · Remove" : "Assign"}
        </Button>
      </form>
    </div>
  );
}

/** A group of people (an org or the staff) with per-person assignment toggles. */
function PeopleGroup({
  title,
  courseId,
  people,
  assignedProfileIds,
  assignedOrgIds,
  memberOrgId,
}: {
  title: string;
  courseId: string;
  people: Person[];
  assignedProfileIds: Set<string>;
  assignedOrgIds: Set<string>;
  memberOrgId?: string;
}) {
  // If the whole org is already assigned, per-person toggles are redundant.
  const orgCovered = memberOrgId ? assignedOrgIds.has(memberOrgId) : false;
  return (
    <Panel className="p-5">
      <p className="mb-3 text-sm font-medium text-fg">{title}</p>
      <div className="divide-y divide-border">
        {people.map((m) => {
          const assigned = assignedProfileIds.has(m.id);
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {m.full_name ?? m.email}
              </span>
              {orgCovered ? (
                <span className="shrink-0 text-xs text-faint">
                  Covered by org
                </span>
              ) : (
                <form action={setCourseAssignment}>
                  <input type="hidden" name="course_id" value={courseId} />
                  <input type="hidden" name="profile_id" value={m.id} />
                  <input
                    type="hidden"
                    name="assigned"
                    value={(!assigned).toString()}
                  />
                  <Button
                    type="submit"
                    variant={assigned ? "ghost" : "secondary"}
                    size="sm"
                  >
                    {assigned ? "Assigned ✓ · Remove" : "Assign"}
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

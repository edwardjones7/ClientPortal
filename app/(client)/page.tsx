import Link from "next/link";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { CourseCard } from "@/components/courses/CourseCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireMember, type SessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { courseThumbnail } from "@/lib/courses";
import type { Course, CourseLesson, LessonProgress, Ticket } from "@/lib/types";

const ACTIVE = ["open", "in_progress", "waiting_on_client"];

export default async function DashboardPage() {
  const user = await requireMember();
  if (user.isEmployee) {
    return <EmployeeDashboard user={user} />;
  }
  return <ClientDashboard user={user} orgId={user.orgId} />;
}

/* ---- Employee (internal staff) dashboard: training-focused ---- */

async function EmployeeDashboard({ user }: { user: SessionUser & { orgId: string } }) {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("course_assignments")
    .select("course:courses(*)")
    .or(`org_id.eq.${user.orgId},profile_id.eq.${user.id}`)
    .returns<{ course: Course | null }[]>();

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
      : Promise.resolve({
          data: [] as Pick<
            CourseLesson,
            "id" | "course_id" | "provider" | "video_id" | "position"
          >[],
        }),
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
  const totalLessons = (lessons ?? []).length;
  const doneLessons = (lessons ?? []).filter((l) => completed.has(l.id)).length;
  const firstName = (user.profile.full_name ?? "").split(" ")[0];

  return (
    <div>
      <PageHeading
        no="01"
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description="Your training from the Elenos team. Pick up where you left off."
        action={<ButtonLink href="/academy">Go to Academy →</ButtonLink>}
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="meta">Courses assigned</p>
          <p className="mt-2 text-3xl font-semibold text-fg">{courses.length}</p>
        </Panel>
        <Panel className="p-5">
          <p className="meta">Lessons completed</p>
          <p className="mt-2 text-3xl font-semibold text-fg">
            {doneLessons}
            <span className="text-base text-muted"> / {totalLessons}</span>
          </p>
        </Panel>
        <Link href="/chat" className="block">
          <Panel className="h-full p-5 transition-colors hover:bg-surface-2/50">
            <p className="meta">Questions?</p>
            <p className="mt-2 text-sm text-muted">
              Message the Elenos team in chat.
            </p>
          </Panel>
        </Link>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="section-no">02 / Your training</p>
          <Link href="/academy" className="text-xs text-muted hover:text-fg">
            All courses →
          </Link>
        </div>
        {courses.length === 0 ? (
          <EmptyState
            title="No courses yet."
            body="When Elenos assigns you training, it'll show up here."
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
      </section>
    </div>
  );
}

/* ---- Client dashboard (tickets + chat) ---- */

async function ClientDashboard({
  user,
  orgId,
}: {
  user: SessionUser & { orgId: string };
  orgId: string;
}) {
  const supabase = await createClient();

  const [{ data: org }, { data: tickets }, { data: lastChat }] =
    await Promise.all([
      supabase.from("organizations").select("name").eq("id", orgId).single(),
      supabase
        .from("tickets")
        .select("id, title, status, priority, category, updated_at")
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false })
        .returns<Ticket[]>(),
      supabase
        .from("chat_messages")
        .select("body, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const active = (tickets ?? []).filter((t) => ACTIVE.includes(t.status));
  const firstName = (user.profile.full_name ?? "").split(" ")[0];

  return (
    <div>
      <PageHeading
        no="01"
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description={`The portal for ${org?.name ?? "your team"}. Submit work, track updates, talk to us.`}
        action={<ButtonLink href="/tickets/new">New request →</ButtonLink>}
      />

      {/* Stat row */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="meta">Open requests</p>
          <p className="mt-2 text-3xl font-semibold text-fg">{active.length}</p>
        </Panel>
        <Panel className="p-5">
          <p className="meta">Total requests</p>
          <p className="mt-2 text-3xl font-semibold text-fg">
            {(tickets ?? []).length}
          </p>
        </Panel>
        <Link href="/chat" className="block">
          <Panel className="h-full p-5 transition-colors hover:bg-surface-2/50">
            <p className="meta">Latest from chat</p>
            <p className="mt-2 line-clamp-2 text-sm text-muted">
              {lastChat?.body ?? "No messages yet — say hello."}
            </p>
            {lastChat ? (
              <p className="meta mt-2">{formatRelative(lastChat.created_at)}</p>
            ) : null}
          </Panel>
        </Link>
      </div>

      {/* Active tickets */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="section-no">02 / Active work</p>
          <Link href="/tickets" className="text-xs text-muted hover:text-fg">
            All tickets →
          </Link>
        </div>
        {active.length === 0 ? (
          <Panel className="px-5 py-10 text-center">
            <p className="text-sm text-fg">Nothing open. Quiet is good.</p>
            <p className="mt-1 text-sm text-muted">
              When you need a change, send it over.
            </p>
            <div className="mt-5">
              <ButtonLink href="/tickets/new">Submit a request →</ButtonLink>
            </div>
          </Panel>
        ) : (
          <Panel className="divide-y divide-border">
            {active.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2/50"
              >
                <span className="min-w-0 truncate text-sm text-fg">
                  {t.title}
                </span>
                <StatusChip status={t.status} />
              </Link>
            ))}
          </Panel>
        )}
      </section>
    </div>
  );
}

-- 0004_courses.sql — Courses / Academy
-- Admin publishes training courses (one or more video lessons hosted on
-- YouTube/Vimeo), assigns them to specific client orgs, and tracks each
-- client member's watch progress. Lives entirely in the `portal` schema,
-- idempotent, touches nothing in `public`.
--
-- Apply AFTER 0001/0002/0003. Reuses portal.current_org_id() / portal.is_admin()
-- / portal.touch_updated_at() from 0001.

-- ── Tables ──────────────────────────────────────────────────────────────────

-- A course = a titled collection of one or more video lessons.
create table if not exists portal.courses (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  -- Path in the public `course-thumbnails` bucket; null falls back to the
  -- first lesson's provider thumbnail in the app layer.
  thumbnail_path text,
  created_by     uuid references portal.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- An ordered video lesson within a course. A single-video course has one row.
create table if not exists portal.course_lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references portal.courses (id) on delete cascade,
  title       text not null,
  provider    text not null check (provider in ('youtube', 'vimeo')),
  video_id    text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists course_lessons_course_idx
  on portal.course_lessons (course_id, position);

-- Which orgs a course is published to. Unique so assignment is idempotent.
create table if not exists portal.course_assignments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references portal.courses (id) on delete cascade,
  org_id      uuid not null references portal.organizations (id) on delete cascade,
  assigned_by uuid references portal.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (course_id, org_id)
);
create index if not exists course_assignments_org_idx
  on portal.course_assignments (org_id);
create index if not exists course_assignments_course_idx
  on portal.course_assignments (course_id);

-- Per-member watch progress for a lesson. org_id is denormalized so the
-- admin watch panel and RLS can scope without joining back through profiles.
create table if not exists portal.lesson_progress (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references portal.profiles (id) on delete cascade,
  lesson_id        uuid not null references portal.course_lessons (id) on delete cascade,
  org_id           uuid not null references portal.organizations (id) on delete cascade,
  seconds_watched  numeric not null default 0,  -- furthest position reached
  last_position    numeric not null default 0,  -- resume point
  duration_seconds numeric,                     -- learned from the player
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (profile_id, lesson_id)
);
create index if not exists lesson_progress_org_lesson_idx
  on portal.lesson_progress (org_id, lesson_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
drop trigger if exists courses_touch_updated_at on portal.courses;
create trigger courses_touch_updated_at
  before update on portal.courses
  for each row execute function portal.touch_updated_at();

drop trigger if exists lesson_progress_touch_updated_at on portal.lesson_progress;
create trigger lesson_progress_touch_updated_at
  before update on portal.lesson_progress
  for each row execute function portal.touch_updated_at();

-- ── Row-Level Security ──────────────────────────────────────────────────────
alter table portal.courses            enable row level security;
alter table portal.course_lessons     enable row level security;
alter table portal.course_assignments enable row level security;
alter table portal.lesson_progress    enable row level security;

-- courses: admins manage; clients read only courses assigned to their org.
drop policy if exists courses_select on portal.courses;
create policy courses_select on portal.courses
  for select using (
    portal.is_admin()
    or exists (
      select 1 from portal.course_assignments a
      where a.course_id = courses.id
        and a.org_id = portal.current_org_id()
    )
  );

drop policy if exists courses_admin_write on portal.courses;
create policy courses_admin_write on portal.courses
  for all using (portal.is_admin()) with check (portal.is_admin());

-- course_lessons: visible when the parent course is visible to the client.
drop policy if exists course_lessons_select on portal.course_lessons;
create policy course_lessons_select on portal.course_lessons
  for select using (
    portal.is_admin()
    or exists (
      select 1 from portal.course_assignments a
      where a.course_id = course_lessons.course_id
        and a.org_id = portal.current_org_id()
    )
  );

drop policy if exists course_lessons_admin_write on portal.course_lessons;
create policy course_lessons_admin_write on portal.course_lessons
  for all using (portal.is_admin()) with check (portal.is_admin());

-- course_assignments: admins manage; clients may see their own org's rows.
drop policy if exists course_assignments_select on portal.course_assignments;
create policy course_assignments_select on portal.course_assignments
  for select using (org_id = portal.current_org_id() or portal.is_admin());

drop policy if exists course_assignments_admin_write on portal.course_assignments;
create policy course_assignments_admin_write on portal.course_assignments
  for all using (portal.is_admin()) with check (portal.is_admin());

-- lesson_progress: a member reads/writes only their own rows (scoped to their
-- org); admins read everything to power the watch panel.
drop policy if exists lesson_progress_select on portal.lesson_progress;
create policy lesson_progress_select on portal.lesson_progress
  for select using (profile_id = auth.uid() or portal.is_admin());

drop policy if exists lesson_progress_insert on portal.lesson_progress;
create policy lesson_progress_insert on portal.lesson_progress
  for insert with check (
    profile_id = auth.uid() and org_id = portal.current_org_id()
  );

drop policy if exists lesson_progress_update on portal.lesson_progress;
create policy lesson_progress_update on portal.lesson_progress
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and org_id = portal.current_org_id());

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Re-run the blanket grants so a fresh apply ordering still covers these tables.
-- RLS (above) governs which rows each role sees; these are table-level perms.
grant usage on schema portal to anon, authenticated, service_role;
grant all on all tables in schema portal to anon, authenticated, service_role;
grant all on all sequences in schema portal to anon, authenticated, service_role;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Live watch panel (admin) + live "new course assigned" (client). RLS applies.
do $$ begin
  alter publication supabase_realtime add table portal.lesson_progress;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table portal.course_assignments;
exception when duplicate_object then null; end $$;

-- ── Storage: public bucket for course thumbnails ────────────────────────────
-- Object path convention: {course_id}/{filename}. Thumbnails are low-risk, so
-- the bucket is public-read (no signed URLs); only admins may write.
insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do nothing;

drop policy if exists course_thumbnails_write on storage.objects;
create policy course_thumbnails_write on storage.objects
  for insert with check (
    bucket_id = 'course-thumbnails' and portal.is_admin()
  );

drop policy if exists course_thumbnails_update on storage.objects;
create policy course_thumbnails_update on storage.objects
  for update using (bucket_id = 'course-thumbnails' and portal.is_admin())
  with check (bucket_id = 'course-thumbnails' and portal.is_admin());

drop policy if exists course_thumbnails_delete on storage.objects;
create policy course_thumbnails_delete on storage.objects
  for delete using (bucket_id = 'course-thumbnails' and portal.is_admin());

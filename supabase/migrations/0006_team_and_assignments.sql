-- 0006_team_and_assignments.sql — Internal team (employees) + per-person course assignment
-- Adds a third user role ('employee'), a single internal "Elenos Team" org that
-- staff belong to, and extends course assignment so a course can target either a
-- whole client org OR an individual person (client or employee). Lives entirely
-- in the `portal` schema, idempotent, touches nothing in `public`.
--
-- Apply AFTER 0001..0005. Reuses portal.current_org_id() / portal.is_admin().
--
-- ⚠️ ENUM NOTE: `alter type ... add value` adds the label in this transaction,
-- but the new value cannot be USED until commit. Nothing in this file uses
-- 'employee' (it's only used at runtime by the invite flow), so a single apply
-- is safe.

-- ── New role ─────────────────────────────────────────────────────────────────
alter type portal.user_role add value if not exists 'employee';

-- ── Internal org for employees ───────────────────────────────────────────────
-- Staff are members of one internal org so they reuse all org-scoped plumbing
-- (lesson_progress.org_id NOT NULL, chat, RLS). `is_internal` flags it so it can
-- be excluded from the client list and resolved by the app.
alter table portal.organizations
  add column if not exists is_internal boolean not null default false;

insert into portal.organizations (name, slug, is_internal)
values ('Elenos Team', 'elenos-team', true)
on conflict (slug) do update set is_internal = true;

-- ── Per-person course assignment ─────────────────────────────────────────────
-- An assignment now targets EITHER an org (everyone in it) OR a single profile.
alter table portal.course_assignments
  alter column org_id drop not null;

alter table portal.course_assignments
  add column if not exists profile_id uuid
    references portal.profiles (id) on delete cascade;

-- Exactly one of (org_id, profile_id) must be set.
alter table portal.course_assignments
  drop constraint if exists course_assignments_target_chk;
alter table portal.course_assignments
  add constraint course_assignments_target_chk
  check (num_nonnulls(org_id, profile_id) = 1);

-- Replace the old (course_id, org_id) unique with two partial uniques so each
-- target type stays idempotent without colliding on NULLs.
alter table portal.course_assignments
  drop constraint if exists course_assignments_course_id_org_id_key;
create unique index if not exists course_assignments_org_uniq
  on portal.course_assignments (course_id, org_id) where profile_id is null;
create unique index if not exists course_assignments_profile_uniq
  on portal.course_assignments (course_id, profile_id) where org_id is null;
create index if not exists course_assignments_profile_idx
  on portal.course_assignments (profile_id);

-- ── RLS: extend course visibility to per-person assignment ───────────────────
-- A user sees a course/its lessons if it's assigned to their org OR to them.
drop policy if exists courses_select on portal.courses;
create policy courses_select on portal.courses
  for select using (
    portal.is_admin()
    or exists (
      select 1 from portal.course_assignments a
      where a.course_id = courses.id
        and (a.org_id = portal.current_org_id() or a.profile_id = auth.uid())
    )
  );

drop policy if exists course_lessons_select on portal.course_lessons;
create policy course_lessons_select on portal.course_lessons
  for select using (
    portal.is_admin()
    or exists (
      select 1 from portal.course_assignments a
      where a.course_id = course_lessons.course_id
        and (a.org_id = portal.current_org_id() or a.profile_id = auth.uid())
    )
  );

-- A user may see assignment rows for their org OR addressed to them.
drop policy if exists course_assignments_select on portal.course_assignments;
create policy course_assignments_select on portal.course_assignments
  for select using (
    org_id = portal.current_org_id()
    or profile_id = auth.uid()
    or portal.is_admin()
  );

-- ── Grants (re-run blanket grants so a fresh apply ordering stays covered) ────
grant usage on schema portal to anon, authenticated, service_role;
grant all on all tables in schema portal to anon, authenticated, service_role;
grant all on all sequences in schema portal to anon, authenticated, service_role;

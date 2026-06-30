-- 0007_course_resources.sql — Uploadable course documents
-- Adds downloadable file resources (PDFs, docs, images) attached to a course,
-- stored in a private `course-files` bucket. Video stays hosted-link-only.
-- Visibility mirrors the course itself (admin, or assigned via org/person).
-- Lives entirely in the `portal` schema, idempotent.
--
-- Apply AFTER 0006.

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists portal.course_resources (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references portal.courses (id) on delete cascade,
  title        text,
  -- Object path in the private `course-files` bucket: {course_id}/{filename}
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  position     int  not null default 0,
  created_by   uuid references portal.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists course_resources_course_idx
  on portal.course_resources (course_id, position);

-- ── Row-Level Security ──────────────────────────────────────────────────────
alter table portal.course_resources enable row level security;

-- Visible when the parent course is visible to the caller (org or per-person).
drop policy if exists course_resources_select on portal.course_resources;
create policy course_resources_select on portal.course_resources
  for select using (
    portal.is_admin()
    or exists (
      select 1 from portal.course_assignments a
      where a.course_id = course_resources.course_id
        and (a.org_id = portal.current_org_id() or a.profile_id = auth.uid())
    )
  );

drop policy if exists course_resources_admin_write on portal.course_resources;
create policy course_resources_admin_write on portal.course_resources
  for all using (portal.is_admin()) with check (portal.is_admin());

-- ── Grants ──────────────────────────────────────────────────────────────────
grant usage on schema portal to anon, authenticated, service_role;
grant all on all tables in schema portal to anon, authenticated, service_role;
grant all on all sequences in schema portal to anon, authenticated, service_role;

-- ── Storage: private bucket for course files ─────────────────────────────────
-- Object path convention: {course_id}/{filename}. Private (signed URLs only).
-- Read: admins, or anyone the course is assigned to (org or per-person).
-- Write/update/delete: admins only.
insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do nothing;

drop policy if exists course_files_read on storage.objects;
create policy course_files_read on storage.objects
  for select using (
    bucket_id = 'course-files'
    and (
      portal.is_admin()
      or exists (
        select 1 from portal.course_assignments a
        where a.course_id = (nullif(split_part(name, '/', 1), ''))::uuid
          and (a.org_id = portal.current_org_id() or a.profile_id = auth.uid())
      )
    )
  );

drop policy if exists course_files_write on storage.objects;
create policy course_files_write on storage.objects
  for insert with check (bucket_id = 'course-files' and portal.is_admin());

drop policy if exists course_files_update on storage.objects;
create policy course_files_update on storage.objects
  for update using (bucket_id = 'course-files' and portal.is_admin())
  with check (bucket_id = 'course-files' and portal.is_admin());

drop policy if exists course_files_delete on storage.objects;
create policy course_files_delete on storage.objects
  for delete using (bucket_id = 'course-files' and portal.is_admin());

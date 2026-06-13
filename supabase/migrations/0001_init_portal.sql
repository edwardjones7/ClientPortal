-- ============================================================================
-- Elenos Client Portal — initial schema
-- ----------------------------------------------------------------------------
-- Lives in a DEDICATED `portal` schema inside the Elenos website's Supabase
-- project. Fully isolated from the website's `public` tables (inbox, form
-- submissions, its own `tickets` table) — no collisions, nothing touched.
-- Drop the whole portal later with: drop schema portal cascade;
--
-- Security model (this MUST be right — many client orgs share this schema):
--   * Clients see only rows in their own organization (org_id = their org).
--   * Admins (profiles.role = 'admin') see everything.
--   * Scoping is enforced by SECURITY DEFINER helpers used in every policy,
--     which avoids recursive RLS evaluation on the profiles table.
-- ============================================================================

create schema if not exists portal;

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type portal.user_role as enum ('client', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type portal.ticket_status as enum
    ('open', 'in_progress', 'waiting_on_client', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type portal.ticket_priority as enum ('low', 'normal', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type portal.ticket_category as enum
    ('website_update', 'bug', 'new_feature', 'question', 'other');
exception when duplicate_object then null; end $$;

-- ── Tables ──────────────────────────────────────────────────────────────────

-- One row per client business.
create table if not exists portal.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  -- Optional manual cross-reference to a lead/subscriber elsewhere in this
  -- project. Plain UUID, no FK — purely for your own bookkeeping.
  lead_id     uuid,
  created_at  timestamptz not null default now()
);

-- One row per user. id == auth.users.id. Admins have org_id = null.
create table if not exists portal.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  org_id      uuid references portal.organizations (id) on delete set null,
  full_name   text,
  email       text not null,
  role        portal.user_role not null default 'client',
  created_at  timestamptz not null default now()
);
create index if not exists profiles_org_id_idx on portal.profiles (org_id);

-- Work requests.
create table if not exists portal.tickets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references portal.organizations (id) on delete cascade,
  created_by  uuid references portal.profiles (id) on delete set null,
  title       text not null,
  description text not null default '',
  status      portal.ticket_status   not null default 'open',
  priority    portal.ticket_priority not null default 'normal',
  category    portal.ticket_category not null default 'website_update',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tickets_org_id_idx on portal.tickets (org_id);
create index if not exists tickets_status_idx on portal.tickets (status);

-- Threaded comments on a ticket.
create table if not exists portal.ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references portal.tickets (id) on delete cascade,
  author_id   uuid references portal.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists ticket_comments_ticket_id_idx
  on portal.ticket_comments (ticket_id, created_at);

-- File attachments (objects live in the 'ticket-attachments' storage bucket).
create table if not exists portal.ticket_attachments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references portal.tickets (id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,
  uploaded_by   uuid references portal.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists ticket_attachments_ticket_id_idx
  on portal.ticket_attachments (ticket_id);

-- Casual real-time chat — one channel per org (Elenos <-> client).
create table if not exists portal.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references portal.organizations (id) on delete cascade,
  author_id   uuid references portal.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_org_id_idx
  on portal.chat_messages (org_id, created_at);

-- ── Security-definer helpers (used by every policy) ─────────────────────────
-- These read profiles WITHOUT triggering RLS, so policies on profiles that
-- call them do not recurse. search_path is pinned to portal.

create or replace function portal.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = portal
as $$
  select org_id from portal.profiles where id = auth.uid();
$$;

create or replace function portal.is_admin()
returns boolean
language sql
stable
security definer
set search_path = portal
as $$
  select exists (
    select 1 from portal.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── updated_at + activity triggers ──────────────────────────────────────────
create or replace function portal.touch_updated_at()
returns trigger language plpgsql
set search_path = portal as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tickets_touch_updated_at on portal.tickets;
create trigger tickets_touch_updated_at
  before update on portal.tickets
  for each row execute function portal.touch_updated_at();

-- Bump a ticket's updated_at whenever a comment lands, so the queue re-sorts.
create or replace function portal.bump_ticket_on_comment()
returns trigger language plpgsql
security definer set search_path = portal as $$
begin
  update portal.tickets set updated_at = now() where id = new.ticket_id;
  return new;
end $$;

drop trigger if exists ticket_comments_bump on portal.ticket_comments;
create trigger ticket_comments_bump
  after insert on portal.ticket_comments
  for each row execute function portal.bump_ticket_on_comment();

-- Guard: non-admins may not change their own role or org_id (privilege
-- escalation defense — clients hold the anon key and could call update directly).
create or replace function portal.guard_profile_update()
returns trigger language plpgsql
security definer set search_path = portal as $$
begin
  if not portal.is_admin() then
    if new.role is distinct from old.role
       or new.org_id is distinct from old.org_id then
      raise exception 'not allowed to change role or org_id';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_update on portal.profiles;
create trigger profiles_guard_update
  before update on portal.profiles
  for each row execute function portal.guard_profile_update();

-- ── Row-Level Security ──────────────────────────────────────────────────────
alter table portal.organizations     enable row level security;
alter table portal.profiles          enable row level security;
alter table portal.tickets           enable row level security;
alter table portal.ticket_comments   enable row level security;
alter table portal.ticket_attachments enable row level security;
alter table portal.chat_messages     enable row level security;

-- organizations: members read their own; admins read all; only admins write.
drop policy if exists organizations_select on portal.organizations;
create policy organizations_select on portal.organizations
  for select using (id = portal.current_org_id() or portal.is_admin());

drop policy if exists organizations_admin_write on portal.organizations;
create policy organizations_admin_write on portal.organizations
  for all using (portal.is_admin()) with check (portal.is_admin());

-- profiles: see self, org teammates, or all (admin). Self-update only.
drop policy if exists profiles_select on portal.profiles;
create policy profiles_select on portal.profiles
  for select using (
    id = auth.uid()
    or org_id = portal.current_org_id()
    or portal.is_admin()
  );

drop policy if exists profiles_update_self on portal.profiles;
create policy profiles_update_self on portal.profiles
  for update using (id = auth.uid() or portal.is_admin())
  with check (id = auth.uid() or portal.is_admin());

drop policy if exists profiles_admin_write on portal.profiles;
create policy profiles_admin_write on portal.profiles
  for all using (portal.is_admin()) with check (portal.is_admin());

-- tickets: org-scoped read/insert/update; admins unrestricted.
drop policy if exists tickets_select on portal.tickets;
create policy tickets_select on portal.tickets
  for select using (org_id = portal.current_org_id() or portal.is_admin());

drop policy if exists tickets_insert on portal.tickets;
create policy tickets_insert on portal.tickets
  for insert with check (
    (org_id = portal.current_org_id() and created_by = auth.uid())
    or portal.is_admin()
  );

drop policy if exists tickets_update on portal.tickets;
create policy tickets_update on portal.tickets
  for update using (org_id = portal.current_org_id() or portal.is_admin())
  with check (org_id = portal.current_org_id() or portal.is_admin());

-- ticket_comments: tied to the parent ticket's org.
drop policy if exists ticket_comments_select on portal.ticket_comments;
create policy ticket_comments_select on portal.ticket_comments
  for select using (
    exists (
      select 1 from portal.tickets t
      where t.id = ticket_id
        and (t.org_id = portal.current_org_id() or portal.is_admin())
    )
  );

drop policy if exists ticket_comments_insert on portal.ticket_comments;
create policy ticket_comments_insert on portal.ticket_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from portal.tickets t
      where t.id = ticket_id
        and (t.org_id = portal.current_org_id() or portal.is_admin())
    )
  );

-- ticket_attachments: tied to the parent ticket's org.
drop policy if exists ticket_attachments_select on portal.ticket_attachments;
create policy ticket_attachments_select on portal.ticket_attachments
  for select using (
    exists (
      select 1 from portal.tickets t
      where t.id = ticket_id
        and (t.org_id = portal.current_org_id() or portal.is_admin())
    )
  );

drop policy if exists ticket_attachments_insert on portal.ticket_attachments;
create policy ticket_attachments_insert on portal.ticket_attachments
  for insert with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from portal.tickets t
      where t.id = ticket_id
        and (t.org_id = portal.current_org_id() or portal.is_admin())
    )
  );

-- chat_messages: org-scoped; author must be the sender.
drop policy if exists chat_messages_select on portal.chat_messages;
create policy chat_messages_select on portal.chat_messages
  for select using (org_id = portal.current_org_id() or portal.is_admin());

drop policy if exists chat_messages_insert on portal.chat_messages;
create policy chat_messages_insert on portal.chat_messages
  for insert with check (
    author_id = auth.uid()
    and (org_id = portal.current_org_id() or portal.is_admin())
  );

-- ── Grants ──────────────────────────────────────────────────────────────────
-- PostgREST roles need table/usage grants on a non-public schema. RLS (above)
-- still governs which ROWS each role can see — these are table-level perms only.
grant usage on schema portal to anon, authenticated, service_role;
grant all on all tables in schema portal to anon, authenticated, service_role;
grant all on all routines in schema portal to anon, authenticated, service_role;
grant all on all sequences in schema portal to anon, authenticated, service_role;
alter default privileges in schema portal
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema portal
  grant all on routines to anon, authenticated, service_role;
alter default privileges in schema portal
  grant all on sequences to anon, authenticated, service_role;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Stream inserts/updates for live chat and ticket views. RLS still applies to
-- realtime, so clients only receive their own org's rows.
do $$ begin
  alter publication supabase_realtime add table portal.chat_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table portal.tickets;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table portal.ticket_comments;
exception when duplicate_object then null; end $$;

-- ── Storage: private bucket for ticket attachments ──────────────────────────
-- Object path convention: {org_id}/{ticket_id}/{filename}
insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

drop policy if exists ticket_attachments_read on storage.objects;
create policy ticket_attachments_read on storage.objects
  for select using (
    bucket_id = 'ticket-attachments'
    and (
      portal.is_admin()
      or (nullif(split_part(name, '/', 1), ''))::uuid = portal.current_org_id()
    )
  );

drop policy if exists ticket_attachments_write on storage.objects;
create policy ticket_attachments_write on storage.objects
  for insert with check (
    bucket_id = 'ticket-attachments'
    and (
      portal.is_admin()
      or (nullif(split_part(name, '/', 1), ''))::uuid = portal.current_org_id()
    )
  );

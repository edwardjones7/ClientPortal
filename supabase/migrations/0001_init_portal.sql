-- ============================================================================
-- Elenos Client Portal — initial schema
-- ----------------------------------------------------------------------------
-- ADDITIVE: every object is namespaced for the portal and coexists with the
-- admin dashboard's existing tables in the SAME Supabase project.
--
-- Security model (shared DB — this MUST be right):
--   * Clients see only rows in their own organization (org_id = their org).
--   * Admins (profiles.role = 'admin') see everything.
--   * Scoping is enforced by SECURITY DEFINER helpers used in every policy,
--     which avoids recursive RLS evaluation on the profiles table.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type public.portal_role as enum ('client', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_status as enum
    ('open', 'in_progress', 'waiting_on_client', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_priority as enum ('low', 'normal', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_category as enum
    ('website_update', 'bug', 'new_feature', 'question', 'other');
exception when duplicate_object then null; end $$;

-- ── Tables ──────────────────────────────────────────────────────────────────

-- One row per client business.
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  -- Optional link to the admin dashboard's lead/subscriber record so a lead
  -- becomes a client with no re-entry. FK intentionally omitted: the target
  -- table lives in the dashboard's schema and may be named differently.
  lead_id     uuid,
  created_at  timestamptz not null default now()
);

-- One row per user. id == auth.users.id. Admins have org_id = null.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  org_id      uuid references public.organizations (id) on delete set null,
  full_name   text,
  email       text not null,
  role        public.portal_role not null default 'client',
  created_at  timestamptz not null default now()
);
create index if not exists profiles_org_id_idx on public.profiles (org_id);

-- Work requests.
create table if not exists public.tickets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  created_by  uuid references public.profiles (id) on delete set null,
  title       text not null,
  description text not null default '',
  status      public.ticket_status   not null default 'open',
  priority    public.ticket_priority not null default 'normal',
  category    public.ticket_category not null default 'website_update',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tickets_org_id_idx on public.tickets (org_id);
create index if not exists tickets_status_idx on public.tickets (status);

-- Threaded comments on a ticket.
create table if not exists public.ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists ticket_comments_ticket_id_idx
  on public.ticket_comments (ticket_id, created_at);

-- File attachments (objects live in the 'ticket-attachments' storage bucket).
create table if not exists public.ticket_attachments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets (id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,
  uploaded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists ticket_attachments_ticket_id_idx
  on public.ticket_attachments (ticket_id);

-- Casual real-time chat — one channel per org (Elenos <-> client).
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_org_id_idx
  on public.chat_messages (org_id, created_at);

-- ── Security-definer helpers (used by every policy) ─────────────────────────
-- These read profiles WITHOUT triggering RLS, so policies on profiles that
-- call them do not recurse.

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── updated_at + activity triggers ──────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tickets_touch_updated_at on public.tickets;
create trigger tickets_touch_updated_at
  before update on public.tickets
  for each row execute function public.touch_updated_at();

-- Bump a ticket's updated_at whenever a comment lands, so the queue re-sorts.
create or replace function public.bump_ticket_on_comment()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  update public.tickets set updated_at = now() where id = new.ticket_id;
  return new;
end $$;

drop trigger if exists ticket_comments_bump on public.ticket_comments;
create trigger ticket_comments_bump
  after insert on public.ticket_comments
  for each row execute function public.bump_ticket_on_comment();

-- Guard: non-admins may not change their own role or org_id (privilege
-- escalation defense — clients hold the anon key and could call update directly).
create or replace function public.guard_profile_update()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.org_id is distinct from old.org_id then
      raise exception 'not allowed to change role or org_id';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ── Row-Level Security ──────────────────────────────────────────────────────
alter table public.organizations     enable row level security;
alter table public.profiles          enable row level security;
alter table public.tickets           enable row level security;
alter table public.ticket_comments   enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.chat_messages     enable row level security;

-- organizations: members read their own; admins read all; only admins write.
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select using (id = public.current_org_id() or public.is_admin());

drop policy if exists organizations_admin_write on public.organizations;
create policy organizations_admin_write on public.organizations
  for all using (public.is_admin()) with check (public.is_admin());

-- profiles: see self, org teammates, or all (admin). Self-update only.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or org_id = public.current_org_id()
    or public.is_admin()
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- tickets: org-scoped read/insert/update; admins unrestricted.
drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets
  for select using (org_id = public.current_org_id() or public.is_admin());

drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert on public.tickets
  for insert with check (
    (org_id = public.current_org_id() and created_by = auth.uid())
    or public.is_admin()
  );

drop policy if exists tickets_update on public.tickets;
create policy tickets_update on public.tickets
  for update using (org_id = public.current_org_id() or public.is_admin())
  with check (org_id = public.current_org_id() or public.is_admin());

-- ticket_comments: tied to the parent ticket's org.
drop policy if exists ticket_comments_select on public.ticket_comments;
create policy ticket_comments_select on public.ticket_comments
  for select using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and (t.org_id = public.current_org_id() or public.is_admin())
    )
  );

drop policy if exists ticket_comments_insert on public.ticket_comments;
create policy ticket_comments_insert on public.ticket_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and (t.org_id = public.current_org_id() or public.is_admin())
    )
  );

-- ticket_attachments: tied to the parent ticket's org.
drop policy if exists ticket_attachments_select on public.ticket_attachments;
create policy ticket_attachments_select on public.ticket_attachments
  for select using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and (t.org_id = public.current_org_id() or public.is_admin())
    )
  );

drop policy if exists ticket_attachments_insert on public.ticket_attachments;
create policy ticket_attachments_insert on public.ticket_attachments
  for insert with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and (t.org_id = public.current_org_id() or public.is_admin())
    )
  );

-- chat_messages: org-scoped; author must be the sender.
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select using (org_id = public.current_org_id() or public.is_admin());

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert with check (
    author_id = auth.uid()
    and (org_id = public.current_org_id() or public.is_admin())
  );

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Stream inserts/updates for live chat and ticket views. RLS still applies to
-- realtime, so clients only receive their own org's rows.
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.tickets;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.ticket_comments;
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
      public.is_admin()
      or (nullif(split_part(name, '/', 1), ''))::uuid = public.current_org_id()
    )
  );

drop policy if exists ticket_attachments_write on storage.objects;
create policy ticket_attachments_write on storage.objects
  for insert with check (
    bucket_id = 'ticket-attachments'
    and (
      public.is_admin()
      or (nullif(split_part(name, '/', 1), ''))::uuid = public.current_org_id()
    )
  );

-- 0009_rep_prospects.sql — rep-owned outreach rows (the "blank outline")
-- Every sales rep's outreach sheet gets a set of blank rows they fill in
-- themselves (prospects they find), alongside the rows Elenos assigns via
-- the lead engine. Columns mirror the lead-engine sheet (lib/lead-engine.ts
-- SheetRow). Lives entirely in the `portal` schema, idempotent, touches
-- nothing in `public`. Apply AFTER 0001..0008.

create table if not exists portal.rep_prospects (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references portal.profiles (id) on delete cascade,
  sort_order     int  not null default 0,
  status         text not null default 'New',
  business_name  text,
  owner_contact  text,
  phone          text,
  email          text,
  website_url    text,
  city           text,
  state          text,
  vertical       text,
  pain_signal    text,
  signal_source  text,
  priority       text,
  prospect_notes text,
  touch_count    int,
  first_touch    date,
  last_touch     date,
  channel        text,
  outcome        text,
  objection      text,
  stage          text,
  next_step      text,
  next_step_date date,
  activity_notes text,
  created_at     timestamptz not null default now()
);

-- Unique per rep+position so the first-visit seeding is race-safe
-- (concurrent seeds collide here instead of double-inserting).
create unique index if not exists rep_prospects_profile_sort_idx
  on portal.rep_prospects (profile_id, sort_order);

-- ── Row-Level Security ──────────────────────────────────────────────────────
-- The rep owns their rows outright (all columns, unlike lead-engine rows).
-- Admins read everything so "View as" previews work; they can't edit —
-- the sheet is the rep's to work.
alter table portal.rep_prospects enable row level security;

drop policy if exists rep_prospects_select on portal.rep_prospects;
create policy rep_prospects_select on portal.rep_prospects
  for select using (profile_id = auth.uid() or portal.is_admin());

drop policy if exists rep_prospects_insert on portal.rep_prospects;
create policy rep_prospects_insert on portal.rep_prospects
  for insert with check (profile_id = auth.uid());

drop policy if exists rep_prospects_update on portal.rep_prospects;
create policy rep_prospects_update on portal.rep_prospects
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists rep_prospects_delete on portal.rep_prospects;
create policy rep_prospects_delete on portal.rep_prospects
  for delete using (profile_id = auth.uid());

-- ── Grants ──────────────────────────────────────────────────────────────────
grant usage on schema portal to anon, authenticated, service_role;
grant all on all tables in schema portal to anon, authenticated, service_role;
grant all on all sequences in schema portal to anon, authenticated, service_role;

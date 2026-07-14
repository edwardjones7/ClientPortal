-- 0008_call_simulator.sql — Live Call Simulator attempts (sales-rep training)
-- Records each full run of the 50-question call simulator so admins can see
-- who is certified (>= SIM_PASS_PCT in lib/call-sim.ts). Lives entirely in the
-- `portal` schema, idempotent,
-- touches nothing in `public`. Apply AFTER 0001..0007.

create table if not exists portal.sim_attempts (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references portal.profiles (id) on delete cascade,
  org_id      uuid not null references portal.organizations (id) on delete cascade,
  score       int  not null,
  total       int  not null,
  pct         int  not null,           -- rounded percent, 0..100
  passed      boolean not null,        -- pct >= pass threshold on a full run
  duration_ms int  not null default 0, -- total time on the phones
  timed_out   int  not null default 0, -- questions lost to the 45s clock
  breakdown   jsonb,                   -- per-category { right, total }
  created_at  timestamptz not null default now()
);

create index if not exists sim_attempts_profile_idx
  on portal.sim_attempts (profile_id, created_at desc);
create index if not exists sim_attempts_org_idx
  on portal.sim_attempts (org_id);

-- ── Row-Level Security ──────────────────────────────────────────────────────
-- A member writes/reads only their own attempts; admins read everything so the
-- Team page can show pass/fail. No update/delete — attempts are immutable.
alter table portal.sim_attempts enable row level security;

drop policy if exists sim_attempts_select on portal.sim_attempts;
create policy sim_attempts_select on portal.sim_attempts
  for select using (profile_id = auth.uid() or portal.is_admin());

drop policy if exists sim_attempts_insert on portal.sim_attempts;
create policy sim_attempts_insert on portal.sim_attempts
  for insert with check (
    profile_id = auth.uid() and org_id = portal.current_org_id()
  );

-- ── Grants ──────────────────────────────────────────────────────────────────
grant usage on schema portal to anon, authenticated, service_role;
grant all on all tables in schema portal to anon, authenticated, service_role;
grant all on all sequences in schema portal to anon, authenticated, service_role;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Live "just passed" updates on the admin Team page. RLS applies.
do $$ begin
  alter publication supabase_realtime add table portal.sim_attempts;
exception when duplicate_object then null; end $$;

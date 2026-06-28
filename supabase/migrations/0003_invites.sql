-- ============================================================================
-- Elenos Client Portal — custom invite tokens
-- ----------------------------------------------------------------------------
-- Replaces Supabase's single-use OTP links for invites. A Supabase OTP is
-- burned on the FIRST visit (verifyOtp consumes it) — and email scanners,
-- chat link-previews, or a stray reload routinely fire that visit before the
-- human does, leaving the client with a dead link.
--
-- Instead we mint our own random token, store only its SHA-256 hash here, and
-- hand the raw token to the admin to send. The /set-password page just READS
-- this row (unlimited times, for `expires_at` hours), and the token is only
-- marked consumed once the client actually sets a password.
--
-- Service-role only: RLS is on with NO policies, so the anon/auth keys can
-- never read it. Every access goes through the admin (service-role) client.
-- ============================================================================

create table if not exists portal.invites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  org_id      uuid not null references portal.organizations (id) on delete cascade,
  email       text not null,
  -- SHA-256 of the raw token. The raw token lives only in the link we hand out.
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists invites_token_hash_idx on portal.invites (token_hash);
create index if not exists invites_user_id_idx on portal.invites (user_id);

-- RLS on, no policies → only the service-role (admin) client can touch this.
alter table portal.invites enable row level security;

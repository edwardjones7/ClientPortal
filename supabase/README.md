# Supabase — Elenos Client Portal

This portal shares one Supabase project with the Elenos admin dashboard.
Everything here is **additive** — it never touches the dashboard's tables.

## Apply the schema

**Option A — SQL editor (fastest):** paste `migrations/0001_init_portal.sql`
into the Supabase SQL editor and run it.

**Option B — Supabase CLI:**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The migration is idempotent (`if not exists` / `drop policy if exists`), so it
is safe to re-run.

## Bootstrap the first admin (you, Ed)

Signup is invite-only, so the very first admin is created by hand once:

1. Supabase dashboard → **Authentication → Users → Add user** → create your
   account with an email + password (confirm the email).
2. Run this in the SQL editor, substituting your email:

```sql
insert into public.profiles (id, email, role, full_name)
select id, email, 'admin', 'Edward Jones'
from auth.users
where email = 'you@elenos.ai'
on conflict (id) do update set role = 'admin';
```

After that, every other account is created from the portal's `/admin` area.

## What got created

| Object | Purpose |
|---|---|
| `organizations` | one row per client business |
| `profiles` | one row per user (`role` = client \| admin) |
| `tickets`, `ticket_comments`, `ticket_attachments` | work requests + threads + files |
| `chat_messages` | per-org real-time chat |
| `current_org_id()`, `is_admin()` | SECURITY DEFINER helpers used by every RLS policy |
| `ticket-attachments` storage bucket | private; path `{org_id}/{ticket_id}/{file}` |

RLS is enabled on every table. Clients only ever see their own org's rows;
admins see everything. Realtime is enabled for chat + tickets + comments and
respects RLS.

## Verify isolation (the gating security check)

Create two orgs A and B, each with one client. Confirm — using the anon key,
not just the UI — that client A cannot read org B's tickets, comments,
attachments, or chat. See the repo `README.md` verification section.

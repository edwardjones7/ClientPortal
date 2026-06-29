# Supabase — Elenos Client Portal

This portal reuses the **Elenos website's Supabase project**, but lives entirely
in its own dedicated **`portal` schema**. It never touches the website's
`public` tables (inbox, form submissions, the website's own `tickets` table) —
hard isolation inside one database. Remove the whole portal anytime with
`drop schema portal cascade;`.

## 1. Apply the schema

**Option A — SQL editor (fastest):** paste each migration in order —
`migrations/0001_init_portal.sql`, then `0002_notifications.sql`,
`0003_invites.sql`, `0004_courses.sql`, then `0005_client_notifications.sql` —
into the website project's Supabase SQL editor and run them. They create the
`portal` schema and everything in it; nothing in `public` is modified. (`0003`
adds the `portal.invites` table backing copy-link invites; `0004` adds the
courses/academy tables and the public `course-thumbnails` bucket; `0005` adds an
UPDATE trigger that emails the client when their ticket's status changes.)

> **Note:** `0002` and `0005` both contain a `<NOTIFY_WEBHOOK_SECRET>`
> placeholder — replace it with your real `NOTIFY_WEBHOOK_SECRET` value (the same
> one set in Vercel) before running, and don't commit the real secret.

**Option B — Supabase CLI:**

```bash
supabase link --project-ref <website-project-ref>
supabase db push
```

The migration is idempotent (`if not exists` / `drop policy if exists`), so it
is safe to re-run.

## 2. Expose the `portal` schema to the API (required, one-time)

The Supabase client only reaches tables in API-exposed schemas. In the
dashboard → **Project Settings → API → Exposed schemas**, add **`portal`** to
the list (alongside `public`) and save. Without this, the app gets
"schema must be one of the following" errors.

## 3. Bootstrap the first admin (you, Ed)

Signup is invite-only, so the very first admin is created by hand once:

1. Supabase dashboard → **Authentication → Users → Add user** → create your
   account with an email + password (confirm the email).
2. Run this in the SQL editor, substituting your email:

```sql
insert into portal.profiles (id, email, role, full_name)
select id, email, 'admin', 'Edward Jones'
from auth.users
where email = 'you@elenos.ai'
on conflict (id) do update set role = 'admin';
```

After that, every other account is created from the portal's `/admin` area.

## What got created (all in schema `portal`)

| Object | Purpose |
|---|---|
| `portal.organizations` | one row per client business |
| `portal.profiles` | one row per user (`role` = client \| admin) |
| `portal.tickets`, `ticket_comments`, `ticket_attachments` | work requests + threads + files |
| `portal.chat_messages` | per-org real-time chat |
| `portal.courses`, `course_lessons`, `course_assignments`, `lesson_progress` | training courses, assignment-to-org, per-member watch progress |
| `portal.current_org_id()`, `portal.is_admin()` | SECURITY DEFINER helpers used by every RLS policy |
| `ticket-attachments` storage bucket | private; path `{org_id}/{ticket_id}/{file}` |
| `course-thumbnails` storage bucket | public-read, admin-write; path `{course_id}/{file}` |

RLS is enabled on every table. Clients only ever see their own org's rows;
admins see everything. Realtime is enabled for chat + tickets + comments and
respects RLS. The `auth.users` pool is shared with the website project — fine
as long as the website has no conflicting login users.

## Verify isolation (the gating security check)

Create two orgs A and B, each with one client. Confirm — using the anon key,
not just the UI — that client A cannot read org B's `portal.tickets`,
`portal.ticket_comments`, attachments, or `portal.chat_messages`. See the repo
`README.md` verification section.

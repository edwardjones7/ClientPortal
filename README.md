# Elenos · Client Portal

The portal where Elenos clients live. Clients log in, submit tickets for
website and software updates, track them through to done, and chat with Elenos
in real time. Elenos manages every client from a built-in admin area.

This is the third Elenos surface, alongside the marketing **website** and the
**admin dashboard**. It reuses the **website's Supabase project** but lives
entirely in its own dedicated **`portal` schema** — hard-isolated from the
website's `public` tables (inbox, form submissions), so nothing collides and the
website's data is never touched.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) on **Vercel**
- **Supabase** — Postgres, Auth, Realtime, Storage (website project, `portal` schema)
- **Tailwind v4** — Elenos dark, high-contrast design language
- `@supabase/ssr` for cookie-based auth across server/client/proxy

## v1 feature set

| Area | What it does |
|---|---|
| Auth | Invite-only email + password. No public sign-up. |
| Orgs | A client = an organization with multiple seats. Owners invite teammates. |
| Tickets | Submit work (category, priority, attachments), threaded comments, status workflow. Live. |
| Chat | Real-time per-org channel for the casual back-and-forth. |
| Admin | Role-gated `/admin`: all clients, a global ticket queue, every chat channel. |

Designed-for, phased to later: systems catalog + upsell, knowledge base,
Stripe billing, email/Discord notifications.

## Setup

### 1. Install + env

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase keys
```

Required env (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project API settings
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; used for invites
- `NEXT_PUBLIC_SITE_URL` — e.g. `http://localhost:3000`

### 2. Database

Against the **website's** Supabase project: apply
`supabase/migrations/0001_init_portal.sql` (it creates an isolated `portal`
schema — nothing in `public` is touched), **add `portal` to the API's exposed
schemas**, then bootstrap your admin account. Full steps + the security model:
[`supabase/README.md`](supabase/README.md).

### 3. Supabase Auth configuration (one-time)

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: your `NEXT_PUBLIC_SITE_URL`
- **Redirect URLs**: add `${SITE_URL}/auth/confirm` (and the localhost variant)

Then **Authentication → Email Templates → Invite user**, point the link at the
app so the SSR callback can establish the session:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password
```

For real client deliverability, configure a custom **SMTP** sender (Auth →
Settings). The default Supabase mailer is rate-limited and fine only for testing.

### 4. Run

```bash
npm run dev     # http://localhost:3000
```

## How it flows

1. You (admin) go to `/admin/invites`, create a client org, and invite their
   first user.
2. The client gets an email, clicks it, lands on `/set-password`, sets a
   password, and enters the portal.
3. They submit tickets and chat. You work the queue and reply from `/admin`.
4. Owners invite their own teammates from `/settings`.

## Verification

### The local loop (end-to-end)

With two browser sessions (you as admin, a test client):

1. Admin: create an org + invite a test email at `/admin/invites`.
2. Client: accept the invite, set a password, land on the dashboard.
3. Client: open a ticket at `/tickets/new` with an attachment.
4. Admin: see it in `/admin/tickets`, change status, post a reply.
5. Client: watch the status + reply appear live; reply back.
6. Both: exchange messages in chat and watch them stream in real time.

### RLS isolation (the gating security check)

Every client org lives in the one `portal` schema, so prove a client can never
see another org's data — at the API layer, not just the UI:

1. Create two orgs A and B, each with one client and one ticket.
2. As client A (anon key + A's session), query org B's rows directly:

```sql
-- Expect ZERO rows for every one of these, run as client A:
select * from portal.tickets        where org_id = '<ORG_B_ID>';
select * from portal.ticket_comments;   -- only A's comments come back
select * from portal.chat_messages  where org_id = '<ORG_B_ID>';
```

3. Confirm a client cannot escalate: `update portal.profiles set role='admin'
   where id = auth.uid();` must fail (guarded by a trigger).
4. Confirm attachment isolation: client A cannot create a signed URL for an
   object under `B's org_id/...`.

### Build

```bash
npm run build   # clean type-check + compile
npm run lint
```

## Project layout

```
app/
  (auth)/        login, set-password, auth actions
  (client)/      dashboard (/), tickets, chat, settings
  (admin)/admin/ clients, tickets, chat, invites
  auth/confirm/  invite/recovery callback (route handler)
  actions/       shared server actions (tickets)
components/      ui/ brand/ shell/ tickets/ chat/ admin/ settings/ auth/
lib/             supabase/ auth, invites, tickets, chat, types, utils
proxy.ts         session refresh + route guards (Next 16 proxy convention)
supabase/        migrations + setup docs
```

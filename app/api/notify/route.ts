import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDiscord, sendEmail, snippet, portalUrl } from "@/lib/notify";
import { TICKET_STATUS, type TicketStatus } from "@/lib/types";

/**
 * Receives Supabase database webhooks and fans out notifications.
 *
 * Staff (Discord): client activity is forwarded to Discord — new tickets, chat,
 * and ticket replies authored by a client. Admin-authored rows are skipped so
 * Ed isn't pinged about his own messages.
 *
 * Clients (email): when an admin replies on a ticket or changes its status, the
 * client who opened the ticket gets an email. Admins also get an email when a
 * client opens a new ticket. Email is best-effort (no-ops if Resend isn't set).
 *
 * Authenticated by a shared secret header that the DB trigger sends.
 */
export async function POST(req: Request) {
  if (req.headers.get("x-webhook-secret") !== process.env.NOTIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const table: string | undefined = payload?.table;
  const event: string | undefined = payload?.event;
  const record = payload?.record;
  if (!table || !record) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  const isAdmin = async (id: string | null) => {
    if (!id) return false;
    const { data } = await admin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();
    return data?.role === "admin";
  };
  const orgName = async (orgId: string | null) => {
    if (!orgId) return "a client";
    const { data } = await admin
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    return data?.name ?? "a client";
  };
  const profileEmail = async (id: string | null) => {
    if (!id) return null;
    const { data } = await admin
      .from("profiles")
      .select("email")
      .eq("id", id)
      .single();
    return data?.email ?? null;
  };
  const adminEmails = async () => {
    const { data } = await admin
      .from("profiles")
      .select("email")
      .eq("role", "admin");
    return (data ?? []).map((p) => p.email).filter(Boolean) as string[];
  };

  // ── Status change (admin-only action) → email the client who opened it ─────
  if (event === "status_change" && table === "tickets") {
    const to = await profileEmail(record.created_by);
    if (to) {
      const label =
        TICKET_STATUS[record.status as TicketStatus]?.label ?? record.status;
      await sendEmail({
        to,
        subject: `Update on your ticket — “${record.title}”`,
        text:
          `Your ticket “${record.title}” is now: ${label}.\n\n` +
          `View it here: ${portalUrl()}/tickets/${record.id}`,
      });
    }
    return NextResponse.json({ ok: true });
  }

  // ── Inserts ────────────────────────────────────────────────────────────────
  let message: string | null = null;

  if (table === "tickets") {
    if (!(await isAdmin(record.created_by))) {
      const name = await orgName(record.org_id);
      message = `🎫 **New ticket** from ${name} — “${record.title}”`;
      // Also email staff so Ed hears about it outside Discord.
      await sendEmail({
        to: await adminEmails(),
        subject: `New ticket from ${name}: “${record.title}”`,
        text:
          `${name} opened a new ticket: “${record.title}”.\n\n` +
          `Open it here: ${portalUrl()}/admin/tickets/${record.id}`,
      });
    }
  } else if (table === "chat_messages") {
    if (!(await isAdmin(record.author_id))) {
      message = `💬 **New chat** from ${await orgName(record.org_id)}: ${snippet(record.body)}`;
    }
  } else if (table === "ticket_comments") {
    const { data: ticket } = await admin
      .from("tickets")
      .select("title, org_id, created_by")
      .eq("id", record.ticket_id)
      .single();

    if (await isAdmin(record.author_id)) {
      // Admin replied → email the client who opened the ticket.
      const to = await profileEmail(ticket?.created_by ?? null);
      if (to) {
        await sendEmail({
          to,
          subject: `Elenos replied to your ticket — “${ticket?.title ?? "your ticket"}”`,
          text:
            `Elenos replied on “${ticket?.title ?? "your ticket"}”:\n\n` +
            `${snippet(record.body)}\n\n` +
            `Reply here: ${portalUrl()}/tickets/${record.ticket_id}`,
        });
      }
    } else {
      // Client replied → ping staff on Discord (existing behavior).
      const name = await orgName(ticket?.org_id ?? null);
      message = `↩️ **Reply** from ${name} on “${ticket?.title ?? "a ticket"}”: ${snippet(record.body)}`;
    }
  }

  if (message) await sendDiscord(message);
  return NextResponse.json({ ok: true });
}

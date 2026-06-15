import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDiscord, snippet } from "@/lib/notify";

/**
 * Receives Supabase database webhooks on INSERT into portal.tickets,
 * portal.chat_messages, and portal.ticket_comments, and pings Discord.
 *
 * Only client activity is forwarded — rows authored by an admin (Ed replying)
 * are skipped, so he isn't notified about his own messages. Authenticated by a
 * shared secret header that the DB trigger sends.
 */
export async function POST(req: Request) {
  if (req.headers.get("x-webhook-secret") !== process.env.NOTIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const table: string | undefined = payload?.table;
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

  let message: string | null = null;

  if (table === "tickets") {
    if (!(await isAdmin(record.created_by))) {
      message = `🎫 **New ticket** from ${await orgName(record.org_id)} — “${record.title}”`;
    }
  } else if (table === "chat_messages") {
    if (!(await isAdmin(record.author_id))) {
      message = `💬 **New chat** from ${await orgName(record.org_id)}: ${snippet(record.body)}`;
    }
  } else if (table === "ticket_comments") {
    if (!(await isAdmin(record.author_id))) {
      const { data: ticket } = await admin
        .from("tickets")
        .select("title, org_id")
        .eq("id", record.ticket_id)
        .single();
      const name = await orgName(ticket?.org_id ?? null);
      message = `↩️ **Reply** from ${name} on “${ticket?.title ?? "a ticket"}”: ${snippet(record.body)}`;
    }
  }

  if (message) await sendDiscord(message);
  return NextResponse.json({ ok: true });
}

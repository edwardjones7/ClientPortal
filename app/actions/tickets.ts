"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/lib/types";

const CATEGORIES: TicketCategory[] = [
  "website_update",
  "bug",
  "new_feature",
  "question",
  "other",
];
const PRIORITIES: TicketPriority[] = ["low", "normal", "high"];
const STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_on_client",
  "resolved",
  "closed",
];

export interface TicketFormState {
  error?: string;
}

export interface CreateTicketResult {
  error?: string;
  /** On success, the new ticket id + the caller's org id, so the browser can
   * upload attachments directly to storage at {orgId}/{ticketId}/{name}. */
  ticketId?: string;
  orgId?: string;
}

/**
 * Client creates a ticket (text only). Attachments are NOT sent here — the
 * browser uploads files straight to Supabase Storage after this returns, so we
 * never push image bytes through a Server Action (whose request body is capped
 * ~1MB by Next.js / ~4.5MB by Vercel — phone photos blow past both).
 */
export async function createTicket(
  formData: FormData,
): Promise<CreateTicketResult> {
  const user = await getSessionUser();
  if (!user || !user.profile.org_id) return { error: "Sign in to submit work." };
  if (user.profile.role !== "client") {
    return { error: "Only client accounts can submit tickets." };
  }
  const orgId = user.profile.org_id;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "website_update");
  const priority = String(formData.get("priority") ?? "normal");

  if (!title) return { error: "Give your request a short title." };

  const safeCategory = (CATEGORIES as string[]).includes(category)
    ? (category as TicketCategory)
    : "website_update";
  const safePriority = (PRIORITIES as string[]).includes(priority)
    ? (priority as TicketPriority)
    : "normal";

  const supabase = await createClient();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      org_id: orgId,
      created_by: user.id,
      title,
      description,
      category: safeCategory,
      priority: safePriority,
    })
    .select("id")
    .single();

  if (error || !ticket) return { error: "Couldn't create the ticket. Try again." };

  revalidatePath("/tickets");
  revalidatePath("/admin/tickets");
  return { ticketId: ticket.id, orgId };
}

/** Add a comment to a ticket thread (client or admin). */
export async function addComment(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to comment." };

  const ticketId = String(formData.get("ticket_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!ticketId) return { error: "Missing ticket." };
  if (!body) return { error: "Write a message first." };

  const supabase = await createClient();
  const { error } = await supabase.from("ticket_comments").insert({
    ticket_id: ticketId,
    author_id: user.id,
    body,
  });
  if (error) return { error: "Couldn't post your message." };

  const base = user.profile.role === "admin" ? "/admin/tickets" : "/tickets";
  revalidatePath(`${base}/${ticketId}`);
  return {};
}

/** Admin updates a ticket's status. */
export async function updateTicketStatus(ticketId: string, status: string) {
  await requireAdmin();
  if (!(STATUSES as string[]).includes(status)) return;

  const supabase = await createClient();
  await supabase
    .from("tickets")
    .update({ status: status as TicketStatus })
    .eq("id", ticketId);

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/tickets/${ticketId}`);
}

/** Admin updates a ticket's priority. */
export async function updateTicketPriority(ticketId: string, priority: string) {
  await requireAdmin();
  if (!(PRIORITIES as string[]).includes(priority)) return;

  const supabase = await createClient();
  await supabase
    .from("tickets")
    .update({ priority: priority as TicketPriority })
    .eq("id", ticketId);

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
}

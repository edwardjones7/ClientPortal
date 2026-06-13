"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/** Client creates a ticket, optionally with file attachments. */
export async function createTicket(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const user = await getSessionUser();
  if (!user || !user.profile.org_id) return { error: "Sign in to submit work." };
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

  // Upload any attachments under {org_id}/{ticket_id}/{filename}.
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const path = `${orgId}/${ticket.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("ticket-attachments")
      .upload(path, file, { upsert: false });
    if (!upErr) {
      await supabase.from("ticket_attachments").insert({
        ticket_id: ticket.id,
        storage_path: path,
        file_name: file.name,
        uploaded_by: user.id,
      });
    }
  }

  revalidatePath("/tickets");
  revalidatePath("/admin/tickets");
  redirect(`/tickets/${ticket.id}`);
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
